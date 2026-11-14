import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { can, roleLabels, type AuthUser, type Permission } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth';
import { HealthService } from '../core/health.service';
import { SessionStore } from '../core/session';
import { Icon, type IconName } from './icon';

type NavItem = { path: string; label: string; icon: IconName; permission?: Permission };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pilotage',
    items: [
      { path: '/', label: 'Vue d’ensemble', icon: 'dashboard' },
      { path: '/equipe', label: 'Équipe', icon: 'users' },
      { path: '/activite', label: 'Journal d’activité', icon: 'activity' },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { path: '/ventes', label: 'Ventes', icon: 'receipt' },
      { path: '/caisses', label: 'Caisses', icon: 'wallet' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { path: '/utilisateurs', label: 'Utilisateurs & rôles', icon: 'key' },
      { path: '/depots', label: 'Dépôts', icon: 'warehouse' },
      { path: '/parametres', label: 'Société & paramètres', icon: 'settings' },
    ],
  },
];

/**
 * Console d'administration : barre latérale sombre, pour qu'on sache
 * toujours qu'on n'est pas sur l'application des employés.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="flex min-h-svh flex-col md:flex-row">
      <aside class="flex shrink-0 flex-col bg-[#0b1220] text-slate-300 md:sticky md:top-0 md:h-svh md:w-64">
        <div class="flex items-center gap-3 px-4 py-4">
          <div class="grid size-9 place-items-center rounded-md bg-white text-[#0b1220]">
            <app-icon name="shield" class="size-5" />
          </div>
          <div class="min-w-0 flex-1 leading-tight">
            <div class="font-semibold text-white">Apex Ledger</div>
            <div class="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Console d’administration</div>
          </div>
          <button type="button" (click)="logout()" aria-label="Se déconnecter"
            class="grid size-9 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none md:hidden">
            <app-icon name="logout" class="size-4" />
          </button>
        </div>

        <nav aria-label="Navigation principale" class="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:gap-0 md:overflow-y-auto">
          @for (group of nav; track group.title) {
            <div class="contents md:block md:pb-3">
              <div class="hidden px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase md:block">{{ group.title }}</div>
              @for (item of group.items; track item.path) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive="!bg-white/10 !text-white"
                  [routerLinkActiveOptions]="{ exact: item.path === '/' }"
                  ariaCurrentWhenActive="page"
                  class="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  <app-icon [name]="item.icon" class="size-4" />
                  {{ item.label }}
                </a>
              }
            </div>
          }
        </nav>

        <div class="mt-auto hidden space-y-2 p-3 md:block">
          <div class="rounded-md border border-white/10 px-3 py-2 text-xs" role="status">
            <div class="font-semibold tracking-wider text-slate-500 uppercase">Serveur</div>
            <div class="mt-1 flex items-center gap-2 text-slate-300">
              <span class="size-2 rounded-full" [class]="health.view().tone"></span>
              {{ health.view().label }}
            </div>
          </div>
          @if (user(); as u) {
            <div class="flex items-center gap-3 rounded-md border border-white/10 px-3 py-2">
              <div class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-[#0b1220]" aria-hidden="true">
                {{ initials() }}
              </div>
              <div class="min-w-0 flex-1 leading-tight">
                <div class="truncate text-sm font-medium text-white">{{ u.name }}</div>
                <a routerLink="/mot-de-passe" class="truncate text-xs text-slate-400 underline-offset-2 hover:underline">{{ roleLabel() }} · mot de passe</a>
              </div>
              <button type="button" (click)="logout()" aria-label="Se déconnecter" title="Se déconnecter"
                class="grid size-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white focus-visible:ring-[3px] focus-visible:ring-white/40 focus-visible:outline-none">
                <app-icon name="logout" class="size-4" />
              </button>
            </div>
          }
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-4 py-6 md:px-8">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly health = inject(HealthService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(SessionStore);

  protected readonly user = this.store.user;
  protected readonly nav = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.permission || can(this.store.user()?.role, i.permission)),
  }));
  protected readonly roleLabel = computed(() => {
    const u = this.user();
    return u ? roleLabels[u.role] : '';
  });
  protected readonly initials = computed(() =>
    (this.user()?.name ?? '')
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  constructor() {
    // Le serveur fait foi : rôle modifié ou compte désactivé depuis la connexion.
    const router = inject(Router);
    inject(HttpClient)
      .get<AuthUser>(`${inject(API_BASE_URL)}/auth/me`)
      .subscribe({
        next: (u) => {
          this.store.updateUser(u);
          // Mot de passe réinitialisé entre-temps par un administrateur.
          if (u.mustChangePassword) void router.navigateByUrl('/mot-de-passe');
        },
        error: () => undefined,
      });
  }

  protected logout() {
    void this.auth.logout();
  }
}
