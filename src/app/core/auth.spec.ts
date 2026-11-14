import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { LoginResponse } from '../../shared/roles';
import { adminGuard, authInterceptor } from './auth';
import { SessionStore } from './session';

const login = (role: LoginResponse['user']['role']): LoginResponse => ({
  token: 'jeton',
  expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
  user: { id: 'u1', email: 'a@test.sn', name: 'Awa Diop', role, mustChangePassword: false },
});

describe('authentification admin', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'connexion', children: [] }]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  const guard = (url: string) =>
    TestBed.runInInjectionContext(() =>
      adminGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const serialize = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('renvoie vers la connexion sans session, en gardant la page demandée', () => {
    expect(serialize(guard('/audit'))).toBe('/connexion?redirect=%2Faudit');
  });

  it('refuse un caissier ou un magasinier', () => {
    TestBed.inject(SessionStore).set(login('CASHIER'));
    expect(serialize(guard('/'))).toBe('/connexion?denied=1');
    TestBed.inject(SessionStore).set(login('STOCK_KEEPER'));
    expect(serialize(guard('/'))).toBe('/connexion?denied=1');
  });

  it('envoie vers le changement de mot de passe si le mot de passe est provisoire', () => {
    const res = login('ADMIN');
    TestBed.inject(SessionStore).set({ ...res, user: { ...res.user, mustChangePassword: true } });
    expect(serialize(guard('/utilisateurs'))).toBe('/mot-de-passe');
  });

  it('laisse passer administrateur et gérant', () => {
    TestBed.inject(SessionStore).set(login('ADMIN'));
    expect(guard('/')).toBe(true);
    TestBed.inject(SessionStore).set(login('MANAGER'));
    expect(guard('/')).toBe(true);
  });

  it("ajoute le jeton aux appels de l'API et ferme la session sur un 401", async () => {
    const store = TestBed.inject(SessionStore);
    store.set(login('ADMIN'));
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    const call = firstValueFrom(http.get('/api/products')).catch(() => 'erreur');
    const req = ctrl.expectOne('/api/products');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jeton');
    req.flush({ message: 'Session expirée' }, { status: 401, statusText: 'Unauthorized' });

    expect(await call).toBe('erreur');
    expect(store.user()).toBeNull();
    expect(localStorage.getItem('apex.admin.session')).toBeNull();
  });

  it("n'envoie pas le jeton à un autre domaine", () => {
    TestBed.inject(SessionStore).set(login('ADMIN'));
    TestBed.inject(HttpClient).get('https://exemple.com/x').subscribe({ error: () => undefined });
    const req = TestBed.inject(HttpTestingController).expectOne('https://exemple.com/x');
    expect(req.request.headers.has('Authorization')).toBe(false);
  });
});
