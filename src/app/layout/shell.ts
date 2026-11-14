import { HttpClient } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { roleLabels, type AuthUser } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { AuthService } from '../core/auth';
import { HealthService } from '../core/health.service';
import { SessionStore } from '../core/session';
import { Icon, type IconName } from './icon';

const NAV: { path: string; label: string; icon: IconName }[] = [
  { path: '/', label: "Vue d'ensemble", icon: 'dashboard' },
  { path: '/utilisateurs', label: 'Utilisateurs & rôles', icon: 'users' },
  { path: '/depots', label: 'Dépôts', icon: 'warehouse' },
  { path: '/audit', label: "Journal d'audit", icon: 'audit' },
  { path: '/societe', label: 'Société & paramètres', icon: 'company' },
];

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icon],
  template: `
    <div class="flex min-h-svh flex-col md:flex-row">
      <aside
        class="flex shrink-0 flex-col border-b border-sidebar-border bg-sidebar md:sticky md:top-0 md:h-svh md:w-64 md:border-r md:border-b-0"
      >
        <div class="flex items-center gap-3 px-4 py-4">
          <div class="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <app-icon name="shield" class="size-5" />
          </div>
          <div class="min-w-0 flex-1 leading-tight">
            <div class="font-semibold">Apex Ledger</div>
            <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Administration
            </div>
          </div>
          <button type="button" (click)="logout()" aria-label="Se déconnecter"
            class="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none md:hidden">
            <app-icon name="logout" class="size-4" />
          </button>
        </div>

        <nav aria-label="Navigation principale" class="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
          @for (item of nav; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-primary !text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: item.path === '/' }"
              ariaCurrentWhenActive="page"
              class="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            >
              <app-icon [name]="item.icon" class="size-4" />
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="mt-auto hidden space-y-2 p-3 md:block">
          <div class="rounded-md border bg-background px-3 py-2 text-xs" role="status">
            <div class="font-semibold tracking-wider text-muted-foreground uppercase">Serveur</div>
            <div class="mt-1 flex items-center gap-2">
              <span class="size-2 rounded-full" [class]="health.view().tone"></span>
              {{ health.view().label }}
            </div>
          </div>
          @if (user(); as u) {
            <div class="flex items-center gap-3 rounded-md border bg-background px-3 py-2">
              <div class="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" aria-hidden="true">
                {{ initials() }}
              </div>
              <div class="min-w-0 flex-1 leading-tight">
                <div class="truncate text-sm font-medium">{{ u.name }}</div>
                <a routerLink="/mot-de-passe" class="truncate text-xs text-muted-foreground underline-offset-2 hover:underline">
                  {{ roleLabel() }} · mot de passe
                </a>
              </div>
              <button type="button" (click)="logout()" aria-label="Se déconnecter" title="Se déconnecter"
                class="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                <app-icon name="logout" class="size-4" />
              </button>
            </div>
          }
        </div>
      </aside>

      <main class="min-w-0 flex-1 px-4 py-6 md:px-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class Shell {
  protected readonly nav = NAV;
  protected readonly health = inject(HealthService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(SessionStore);

  protected readonly user = this.store.user;
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
