import { Injectable, computed, signal } from '@angular/core';
import { can, isAuthUser, type AuthUser, type LoginResponse } from '../../shared/roles';

const KEY = 'apex.admin.session';

type Session = { token: string; expiresAt: string; user: AuthUser };

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (typeof s.token !== 'string' || !isAuthUser(s.user)) return null;
    if (new Date(s.expiresAt).getTime() <= Date.now()) return null;
    return s;
  } catch {
    return null;
  }
}

/**
 * Session de l'admin (jeton opaque, révocable côté API, 12 h d'inactivité max).
 * Distincte de celle du front caisse : on se connecte à chaque application.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly state = signal<Session | null>(read());

  readonly user = computed(() => this.state()?.user ?? null);
  readonly token = computed(() => this.state()?.token ?? null);
  readonly canAccessAdmin = computed(() => can(this.user()?.role, 'accessAdmin'));

  constructor() {
    // Déconnexion dans un autre onglet → déconnexion ici aussi.
    window.addEventListener('storage', (e) => {
      if (e.key === KEY) this.state.set(read());
    });
  }

  set(res: LoginResponse) {
    this.write({ token: res.token, expiresAt: res.expiresAt, user: res.user });
  }

  updateUser(user: AuthUser) {
    const s = this.state();
    if (s && JSON.stringify(s.user) !== JSON.stringify(user)) this.write({ ...s, user });
  }

  clear() {
    this.state.set(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignoré */
    }
  }

  private write(s: Session) {
    this.state.set(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* navigation privée : la session reste en mémoire */
    }
  }
}
