import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { catchError, firstValueFrom, throwError } from 'rxjs';
import type { LoginInput } from '../../shared/auth';
import type { LoginResponse } from '../../shared/roles';
import { API_BASE_URL } from './api';
import { SessionStore } from './session';

/** Ajoute le jeton aux appels de l'API ; un 401 ferme la session. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  const base = inject(API_BASE_URL);
  const token = store.token();
  if (!token || !req.url.startsWith(base)) return next(req);

  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && store.token() === token) {
        store.clear();
        void router.navigate(['/connexion'], { queryParams: { expired: 1, redirect: router.url } });
      }
      return throwError(() => err);
    }),
  );
};

/** Protège tout le back-office : connecté ET administrateur ou gérant. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (!store.user()) {
    return router.createUrlTree(['/connexion'], { queryParams: { redirect: state.url } });
  }
  if (!store.canAccessAdmin()) {
    return router.createUrlTree(['/connexion'], { queryParams: { denied: 1 } });
  }
  if (store.user()?.mustChangePassword) return router.createUrlTree(['/mot-de-passe']);
  return true;
};

/** Page de changement de mot de passe : connecté avec accès admin, provisoire ou non. */
export const passwordPageGuard: CanActivateFn = () => {
  const store = inject(SessionStore);
  const router = inject(Router);
  if (!store.user()) return router.createUrlTree(['/connexion']);
  if (!store.canAccessAdmin()) return router.createUrlTree(['/connexion'], { queryParams: { denied: 1 } });
  return true;
};

/** Message d'erreur lisible depuis une réponse NestJS. */
export function apiMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Serveur injoignable. Vérifiez la connexion.';
    if (err.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.';
    const m = (err.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(m)) return m.join(' · ');
    if (m) return m;
  }
  return 'Une erreur est survenue.';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  async login(input: LoginInput): Promise<LoginResponse> {
    const res = await firstValueFrom(this.http.post<LoginResponse>(`${this.base}/auth/login`, input));
    this.store.set(res);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.base}/auth/logout`, {}));
    } catch {
      /* déjà expirée ou serveur injoignable : on ferme localement */
    }
    this.store.clear();
    await this.router.navigate(['/connexion']);
  }
}
