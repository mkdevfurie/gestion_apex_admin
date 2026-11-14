import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { changePasswordSchema } from '../../shared/auth';
import type { AuthUser } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { AuthService, apiMessage } from '../core/auth';
import { SessionStore } from '../core/session';
import { Icon } from '../layout/icon';

const input =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

@Component({
  selector: 'app-change-password',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <main class="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <div class="w-full max-w-sm space-y-6">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <app-icon name="shield" class="size-5" />
          </div>
          <div class="leading-tight">
            <div class="text-lg font-semibold">Apex Ledger</div>
            <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Administration</div>
          </div>
        </div>

        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ pending() ? 'Choisissez votre mot de passe' : 'Changer mon mot de passe' }}
          </h1>
          <p class="text-sm text-muted-foreground">
            @if (pending()) {
              Bonjour {{ user()?.name }}, votre mot de passe actuel est provisoire. Remplacez-le pour continuer.
            } @else {
              Vos autres appareils seront déconnectés.
            }
          </p>
        </div>

        @if (error()) {
          <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{{ error() }}</p>
        }

        <form (submit)="submit($event)" novalidate class="space-y-4">
          <div class="grid gap-1.5">
            <label for="current" class="text-sm font-medium">{{ pending() ? 'Mot de passe provisoire' : 'Mot de passe actuel' }}</label>
            <input id="current" type="password" autocomplete="current-password" autofocus [class]="input"
              [value]="current()" (input)="current.set(value($event))"
              [attr.aria-invalid]="errors()['currentPassword'] ? true : null" />
            @if (errors()['currentPassword']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
          </div>
          <div class="grid gap-1.5">
            <label for="next" class="text-sm font-medium">Nouveau mot de passe</label>
            <input id="next" type="password" autocomplete="new-password" [class]="input"
              [value]="next()" (input)="next.set(value($event))" aria-describedby="next-hint"
              [attr.aria-invalid]="errors()['newPassword'] ? true : null" />
            @if (errors()['newPassword']; as e) {
              <p role="alert" class="text-xs text-destructive">{{ e }}</p>
            } @else {
              <p id="next-hint" class="text-xs text-muted-foreground">Au moins 10 caractères, avec des lettres et des chiffres.</p>
            }
          </div>
          <div class="grid gap-1.5">
            <label for="confirm" class="text-sm font-medium">Confirmer le nouveau mot de passe</label>
            <input id="confirm" type="password" autocomplete="new-password" [class]="input"
              [value]="confirmation()" (input)="confirmation.set(value($event))"
              [attr.aria-invalid]="errors()['confirm'] ? true : null" />
            @if (errors()['confirm']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
          </div>
          <button type="submit" [disabled]="saving()"
            class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50">
            {{ saving() ? 'Enregistrement…' : 'Enregistrer le mot de passe' }}
          </button>
        </form>

        <div class="flex justify-between text-sm">
          @if (!pending()) {
            <button type="button" (click)="back()" class="text-muted-foreground underline-offset-4 hover:underline">Retour</button>
          } @else {
            <span></span>
          }
          <button type="button" (click)="logout()" class="text-muted-foreground underline-offset-4 hover:underline">Se déconnecter</button>
        </div>
      </div>
    </main>
  `,
})
export class ChangePassword {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.store.user;
  protected readonly pending = computed(() => this.user()?.mustChangePassword ?? false);

  protected readonly current = signal('');
  protected readonly next = signal('');
  protected readonly confirmation = signal('');
  protected readonly errors = signal<Record<string, string>>({});
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly input = input;

  protected value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }

  protected async submit(e: Event) {
    e.preventDefault();
    const parsed = changePasswordSchema.safeParse({ currentPassword: this.current(), newPassword: this.next() });
    const errs: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
    if (this.next() !== this.confirmation()) errs['confirm'] = 'Les deux mots de passe ne correspondent pas';
    this.errors.set(errs);
    if (!parsed.success || Object.keys(errs).length) return;

    this.saving.set(true);
    this.error.set(null);
    try {
      const user = await firstValueFrom(this.http.post<AuthUser>(`${this.base}/auth/password`, parsed.data));
      this.store.updateUser(user);
      await this.router.navigateByUrl('/', { replaceUrl: true });
    } catch (err) {
      this.error.set(apiMessage(err));
      this.current.set('');
    } finally {
      this.saving.set(false);
    }
  }

  protected back() {
    void this.router.navigateByUrl('/');
  }

  protected logout() {
    void this.auth.logout();
  }
}
