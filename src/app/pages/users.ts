import { DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { userCreateSchema } from '../../shared/auth';
import { can, roleLabels, roles, type Role, type UserRow } from '../../shared/roles';
import { apiMessage } from '../core/auth';
import { SessionStore } from '../core/session';
import { UsersApi } from '../core/users.service';

const roleHints: Record<Role, string> = {
  ADMIN: 'Tout, y compris les comptes',
  MANAGER: 'Catalogue, stock, rapports ; voit les comptes',
  CASHIER: 'Caisse et encaissements',
  STOCK_KEEPER: 'Réceptions, pertes, inventaires',
};

type Reveal = { title: string; name: string; email: string; password: string };

const input =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';
const btn =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

@Component({
  selector: 'app-users',
  imports: [DatePipe],
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Administration</div>
          <h1 class="text-2xl font-semibold tracking-tight">Utilisateurs & rôles</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            {{ activeCount() }} compte{{ activeCount() > 1 ? 's' : '' }} actif{{ activeCount() > 1 ? 's' : '' }}.
            Un compte n’est jamais supprimé : ses opérations restent signées.
          </p>
        </div>
        @if (canManage()) {
          <button type="button" (click)="openCreate()" [class]="btn + ' bg-primary text-primary-foreground hover:bg-primary/90'">
            + Nouvel accès
          </button>
        }
      </div>

      @if (!canManage()) {
        <p role="status" class="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
          Consultation seule : seul un administrateur peut créer ou modifier des comptes.
        </p>
      }
      @if (error()) {
        <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{{ error() }}</p>
      }

      <section class="overflow-hidden rounded-lg border bg-card">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Comptes utilisateurs</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Nom</th>
                <th scope="col" class="h-8 px-4">Rôle</th>
                <th scope="col" class="h-8 px-4">État</th>
                <th scope="col" class="h-8 px-4">Dernière connexion</th>
                @if (canManage()) {
                  <th scope="col" class="h-8 px-4 text-right">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @if (loading()) {
                <tr><td colspan="5" class="px-4 py-8 text-center text-muted-foreground">Chargement…</td></tr>
              }
              @for (u of users(); track u.id) {
                <tr class="border-t border-[#F1F5F9]" [class.opacity-60]="!u.active">
                  <td class="px-4 py-2.5">
                    <div class="font-medium">
                      {{ u.name }}
                      @if (u.id === me()?.id) {
                        <span class="ml-1 text-xs font-normal text-muted-foreground">(vous)</span>
                      }
                    </div>
                    <div class="font-mono text-xs text-muted-foreground">{{ u.email }}</div>
                  </td>
                  <td class="px-4 py-2.5">
                    @if (canManage() && u.id !== me()?.id && u.active) {
                      <label class="sr-only" [attr.for]="'role-' + u.id">Rôle de {{ u.name }}</label>
                      <select [id]="'role-' + u.id" (change)="changeRole(u, $any($event.target))"
                        [disabled]="busy() === u.id" [class]="input + ' h-8 w-auto min-w-36'">
                        @for (r of roles; track r) {
                          <option [value]="r" [selected]="r === u.role">{{ roleLabels[r] }}</option>
                        }
                      </select>
                    } @else {
                      {{ roleLabels[u.role] }}
                    }
                  </td>
                  <td class="px-4 py-2.5">
                    @if (!u.active) {
                      <span class="rounded-full border px-2 py-0.5 text-xs whitespace-nowrap">Désactivé</span>
                    } @else if (u.mustChangePassword) {
                      <span class="rounded-full border border-[#FDE68A] bg-warning-soft px-2 py-0.5 text-xs whitespace-nowrap text-warning-soft-foreground">Provisoire</span>
                    } @else {
                      <span class="rounded-full border border-[#A7F3D0] bg-success-soft px-2 py-0.5 text-xs text-success-soft-foreground">Actif</span>
                    }
                  </td>
                  <td class="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {{ u.lastLoginAt ? (u.lastLoginAt | date: 'dd/MM/yyyy HH:mm') : 'Jamais' }}
                  </td>
                  @if (canManage()) {
                    <td class="px-4 py-2.5">
                      @if (u.id !== me()?.id) {
                        <div class="flex justify-end gap-2">
                          @if (u.active) {
                            <button type="button" (click)="reset(u)" [disabled]="busy() === u.id"
                              [class]="btn + ' h-8 border bg-background px-3 hover:bg-accent'">Réinitialiser</button>
                            <button type="button" (click)="setActive(u, false)" [disabled]="busy() === u.id"
                              [class]="btn + ' h-8 border border-[#FCA5A5] bg-danger-soft px-3 text-destructive hover:bg-danger-soft/70'">Désactiver</button>
                          } @else {
                            <button type="button" (click)="setActive(u, true)" [disabled]="busy() === u.id"
                              [class]="btn + ' h-8 border bg-background px-3 hover:bg-accent'">Réactiver</button>
                          }
                        </div>
                      }
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="rounded-lg border bg-card p-4">
        <h2 class="mb-3 text-sm font-semibold">Rôles</h2>
        <dl class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
          @for (r of roles; track r) {
            <div>
              <dt class="font-medium">{{ roleLabels[r] }}</dt>
              <dd class="text-muted-foreground">{{ roleHints[r] }}</dd>
            </div>
          }
        </dl>
      </section>
    </div>

    <!-- Création d'un accès -->
    <dialog #createDialog (close)="createErrors.set({})" aria-labelledby="create-title"
      class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border bg-card p-0 text-card-foreground shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1),0_4px_6px_-4px_rgba(15,23,42,0.05)] backdrop:bg-primary/40">
      <form (submit)="create($event)" novalidate class="grid gap-4 p-5">
        <div>
          <h2 id="create-title" class="text-lg font-semibold">Nouvel accès</h2>
          <p class="text-sm text-muted-foreground">Un mot de passe provisoire sera généré. La personne devra le changer à sa première connexion.</p>
        </div>
        <div class="grid gap-1.5">
          <label for="new-name" class="text-sm font-medium">Nom complet</label>
          <input id="new-name" [class]="input" autocomplete="off" [value]="form().name" (input)="patch('name', $event)"
            [attr.aria-invalid]="createErrors()['name'] ? true : null" />
          @if (createErrors()['name']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
        </div>
        <div class="grid gap-1.5">
          <label for="new-email" class="text-sm font-medium">Adresse e-mail (identifiant de connexion)</label>
          <input id="new-email" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" [class]="input"
            [value]="form().email" (input)="patch('email', $event)" [attr.aria-invalid]="createErrors()['email'] ? true : null" />
          @if (createErrors()['email']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
        </div>
        <div class="grid gap-1.5">
          <label for="new-role" class="text-sm font-medium">Rôle</label>
          <select id="new-role" [class]="input" (change)="patch('role', $event)">
            @for (r of roles; track r) {
              <option [value]="r" [selected]="r === form().role">{{ roleLabels[r] }} — {{ roleHints[r] }}</option>
            }
          </select>
        </div>
        @if (createErrors()['_']; as e) {
          <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{{ e }}</p>
        }
        <div class="flex justify-end gap-2">
          <button type="button" (click)="createDialog.close()" [class]="btn + ' border bg-background hover:bg-accent'">Annuler</button>
          <button type="submit" [disabled]="creating()" [class]="btn + ' bg-primary text-primary-foreground hover:bg-primary/90'">
            {{ creating() ? 'Création…' : 'Créer l’accès' }}
          </button>
        </div>
      </form>
    </dialog>

    <!-- Mot de passe provisoire : affiché une seule fois -->
    <dialog #revealDialog (close)="revealed.set(null)" aria-labelledby="reveal-title"
      class="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-lg border bg-card p-0 text-card-foreground shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1),0_4px_6px_-4px_rgba(15,23,42,0.05)] backdrop:bg-primary/40">
      @if (revealed(); as r) {
        <div class="grid gap-4 p-5">
          <div>
            <h2 id="reveal-title" class="text-lg font-semibold">{{ r.title }}</h2>
            <p class="text-sm text-muted-foreground">
              Transmettez ces informations à <strong class="text-foreground">{{ r.name }}</strong>.
              Le mot de passe ne sera <strong class="text-foreground">plus jamais affiché</strong> ; il devra être changé à la première connexion.
            </p>
          </div>
          <div class="grid gap-2 rounded-md border bg-background p-3">
            <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Identifiant</div>
            <div class="font-mono text-sm">{{ r.email }}</div>
            <div class="mt-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Mot de passe provisoire</div>
            <div class="flex items-center justify-between gap-3">
              <code class="font-mono text-lg font-semibold tracking-wide">{{ r.password }}</code>
              <button type="button" (click)="copy(r.password)" [class]="btn + ' h-8 border bg-card px-3 hover:bg-accent'">
                {{ copied() ? 'Copié ✓' : 'Copier' }}
              </button>
            </div>
          </div>
          <div class="flex justify-end">
            <button type="button" (click)="revealDialog.close()" [class]="btn + ' bg-primary text-primary-foreground hover:bg-primary/90'">C’est noté</button>
          </div>
        </div>
      }
    </dialog>
  `,
})
export class Users {
  private readonly api = inject(UsersApi);
  private readonly store = inject(SessionStore);

  protected readonly roles = roles;
  protected readonly roleLabels = roleLabels;
  protected readonly roleHints = roleHints;
  protected readonly input = input;
  protected readonly btn = btn;

  protected readonly me = this.store.user;
  protected readonly canManage = computed(() => can(this.me()?.role, 'manageUsers'));

  protected readonly users = signal<UserRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly activeCount = computed(() => this.users().filter((u) => u.active).length);

  protected readonly form = signal({ name: '', email: '', role: 'CASHIER' as Role });
  protected readonly createErrors = signal<Record<string, string>>({});
  protected readonly creating = signal(false);
  protected readonly revealed = signal<Reveal | null>(null);
  protected readonly copied = signal(false);

  private readonly createDialog = viewChild.required<ElementRef<HTMLDialogElement>>('createDialog');
  private readonly revealDialog = viewChild.required<ElementRef<HTMLDialogElement>>('revealDialog');

  constructor() {
    void this.load();
  }

  private async load() {
    try {
      this.users.set(await this.api.list());
      this.error.set(null);
    } catch (e) {
      this.error.set(apiMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  protected patch(key: 'name' | 'email' | 'role', e: Event) {
    const value = (e.target as HTMLInputElement | HTMLSelectElement).value;
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected openCreate() {
    this.form.set({ name: '', email: '', role: 'CASHIER' });
    this.createDialog().nativeElement.showModal();
  }

  protected async create(e: Event) {
    e.preventDefault();
    const parsed = userCreateSchema.safeParse(this.form());
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      this.createErrors.set(errs);
      return;
    }
    this.creating.set(true);
    try {
      const res = await this.api.create(parsed.data);
      this.createDialog().nativeElement.close();
      this.users.update((list) => [...list, res.user].sort(byActiveThenName));
      this.reveal('Accès créé', res.user, res.temporaryPassword);
    } catch (err) {
      this.createErrors.set({ _: apiMessage(err) });
    } finally {
      this.creating.set(false);
    }
  }

  protected async changeRole(u: UserRow, select: HTMLSelectElement) {
    const role = select.value as Role;
    if (role === u.role) return;
    if (!confirm(`Passer ${u.name} de « ${roleLabels[u.role]} » à « ${roleLabels[role]} » ?`)) {
      select.value = u.role;
      return;
    }
    const ok = await this.mutate(u, () => this.api.update(u.id, { role }));
    if (!ok) select.value = u.role;
  }

  protected async setActive(u: UserRow, active: boolean) {
    const question = active
      ? `Réactiver le compte de ${u.name} ?`
      : `Désactiver le compte de ${u.name} ? La personne sera déconnectée immédiatement et ne pourra plus se connecter.`;
    if (!confirm(question)) return;
    await this.mutate(u, () => this.api.update(u.id, { active }));
  }

  protected async reset(u: UserRow) {
    if (!confirm(`Générer un nouveau mot de passe provisoire pour ${u.name} ? Ses sessions ouvertes seront fermées.`)) return;
    this.busy.set(u.id);
    try {
      const res = await this.api.resetPassword(u.id);
      this.replace(res.user);
      this.reveal('Mot de passe réinitialisé', res.user, res.temporaryPassword);
    } catch (err) {
      this.error.set(apiMessage(err));
    } finally {
      this.busy.set(null);
    }
  }

  protected async copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      /* presse-papiers indisponible : le mot de passe reste affiché */
    }
  }

  private async mutate(u: UserRow, call: () => Promise<UserRow>): Promise<boolean> {
    this.busy.set(u.id);
    this.error.set(null);
    try {
      this.replace(await call());
      return true;
    } catch (err) {
      this.error.set(apiMessage(err));
      return false;
    } finally {
      this.busy.set(null);
    }
  }

  private replace(user: UserRow) {
    this.users.update((list) => list.map((x) => (x.id === user.id ? user : x)).sort(byActiveThenName));
  }

  private reveal(title: string, user: UserRow, password: string) {
    this.copied.set(false);
    this.revealed.set({ title, name: user.name, email: user.email, password });
    this.revealDialog().nativeElement.showModal();
  }
}

function byActiveThenName(a: UserRow, b: UserRow) {
  return Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'fr');
}
