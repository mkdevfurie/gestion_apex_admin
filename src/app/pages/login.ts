import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { loginInputSchema } from '../../shared/auth';
import { roleLabels } from '../../shared/roles';
import { AuthService, apiMessage } from '../core/auth';
import { SessionStore } from '../core/session';
import { Icon } from '../layout/icon';

@Component({
  selector: 'app-login',
  imports: [Icon],
  host: { class: 'block' },
  template: `
    <div class="grid min-h-svh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside class="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div class="flex items-center gap-3">
          <div class="grid size-10 place-items-center rounded-md bg-primary-foreground text-primary">
            <app-icon name="shield" class="size-5" />
          </div>
          <div class="leading-tight">
            <div class="text-lg font-semibold">Apex Ledger</div>
            <div class="text-[11px] font-semibold tracking-wider uppercase opacity-60">Administration</div>
          </div>
        </div>
        <div class="max-w-md space-y-4">
          <h2 class="text-3xl leading-tight font-semibold tracking-tight">Le poste de contrôle de la boutique.</h2>
          <p class="text-sm text-primary-foreground/75">
            Utilisateurs et rôles, dépôts, journal d’audit et paramètres de la société.
            Réservé aux administrateurs et aux gérants.
          </p>
        </div>
        <p class="font-mono text-xs text-primary-foreground/40">Session fermée après 12 h d’inactivité</p>
        <div
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]"
        ></div>
      </aside>

      <main class="flex items-center justify-center px-4 py-10 sm:px-8">
        <div class="w-full max-w-sm space-y-8">
          <div class="flex items-center gap-3 lg:hidden">
            <div class="grid size-10 place-items-center rounded-md bg-primary text-primary-foreground">
              <app-icon name="shield" class="size-5" />
            </div>
            <div class="leading-tight">
              <div class="text-lg font-semibold">Apex Ledger</div>
              <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Administration</div>
            </div>
          </div>

          <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-tight">Connexion administrateur</h1>
            <p class="text-sm text-muted-foreground">Identifiez-vous pour accéder au back-office.</p>
          </div>

          @if (error()) {
            <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
              {{ error() }}
            </p>
          } @else if (denied()) {
            <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
              Accès réservé aux administrateurs et aux gérants.
            </p>
          } @else if (expired()) {
            <p role="status" class="rounded-md border border-[#FDE68A] bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
              Votre session a expiré. Reconnectez-vous pour continuer.
            </p>
          }

          <form (submit)="submit($event)" novalidate class="space-y-4">
            <div class="grid gap-1.5">
              <label for="email" class="text-sm font-medium">Adresse e-mail</label>
              <input
                id="email"
                type="email"
                autocomplete="username"
                inputmode="email"
                autocapitalize="none"
                spellcheck="false"
                autofocus
                [value]="email()"
                (input)="email.set(value($event))"
                [attr.aria-invalid]="fieldErrors()['email'] ? true : null"
                [attr.aria-describedby]="fieldErrors()['email'] ? 'email-error' : null"
                class="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
              />
              @if (fieldErrors()['email']; as e) {
                <p id="email-error" role="alert" class="text-xs text-destructive">{{ e }}</p>
              }
            </div>

            <div class="grid gap-1.5">
              <label for="password" class="text-sm font-medium">Mot de passe</label>
              <div class="relative">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  autocomplete="current-password"
                  [value]="password()"
                  (input)="password.set(value($event))"
                  [attr.aria-invalid]="fieldErrors()['password'] ? true : null"
                  [attr.aria-describedby]="fieldErrors()['password'] ? 'password-error' : null"
                  class="h-11 w-full rounded-md border border-input bg-background px-3 pr-20 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
                />
                <button
                  type="button"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-pressed]="showPassword()"
                  class="absolute inset-y-0 right-0 px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {{ showPassword() ? 'Masquer' : 'Afficher' }}
                </button>
              </div>
              @if (fieldErrors()['password']; as e) {
                <p id="password-error" role="alert" class="text-xs text-destructive">{{ e }}</p>
              }
            </div>

            <button
              type="submit"
              [disabled]="pending()"
              class="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
            >
              {{ pending() ? 'Connexion…' : 'Se connecter' }}
            </button>
          </form>

          <p class="text-center text-xs text-muted-foreground">
            Mot de passe oublié ? Un administrateur peut le réinitialiser.
          </p>
        </div>
      </main>
    </div>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  // Paramètres d'URL (withComponentInputBinding).
  readonly redirect = input<string>();
  readonly expired = input<string>();
  readonly denied = input<string>();

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly fieldErrors = signal<Record<string, string>>({});

  protected value(e: Event) {
    return (e.target as HTMLInputElement).value;
  }

  protected async submit(e: Event) {
    e.preventDefault();
    const parsed = loginInputSchema.safeParse({ email: this.email(), password: this.password() });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      this.fieldErrors.set(errs);
      return;
    }
    this.fieldErrors.set({});
    this.error.set(null);
    this.pending.set(true);
    try {
      const res = await this.auth.login(parsed.data);
      if (!this.store.canAccessAdmin()) {
        // Compte valide mais sans droit d'administration : on referme la session.
        await this.auth.logout();
        this.error.set(`Accès réservé aux administrateurs et aux gérants (votre rôle : ${roleLabels[res.user.role]}).`);
        return;
      }
      const target = this.redirect();
      const safe = target?.startsWith('/') && !target.startsWith('//') && !target.startsWith('/connexion') ? target : '/';
      await this.router.navigateByUrl(safe, { replaceUrl: true });
    } catch (err) {
      this.error.set(apiMessage(err));
      this.password.set('');
    } finally {
      this.pending.set(false);
    }
  }
}
