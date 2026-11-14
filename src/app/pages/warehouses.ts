import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { warehouseCreateSchema } from '../../shared/admin';
import type { Warehouse } from '../../shared/catalog';
import { can } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { apiMessage } from '../core/auth';
import { SessionStore } from '../core/session';
import { PageHeader, btnOutline, btnPrimary, field } from '../layout/ui';

@Component({
  selector: 'app-warehouses',
  imports: [PageHeader],
  template: `
    <div class="space-y-5">
      <app-page-header title="Dépôts" subtitle="Lieux de stockage et de vente. Un dépôt n’est jamais supprimé : il est désactivé." />

      @if (error()) {
        <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{{ error() }}</p>
      }

      <div class="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section class="overflow-hidden rounded-lg border bg-card">
          <table class="w-full text-sm">
            <caption class="sr-only">Dépôts</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Code</th>
                <th scope="col" class="h-8 px-4">Nom</th>
                <th scope="col" class="h-8 px-4">Adresse</th>
                <th scope="col" class="h-8 px-4">État</th>
                @if (canEdit()) { <th scope="col" class="h-8 px-4"><span class="sr-only">Actions</span></th> }
              </tr>
            </thead>
            <tbody>
              @for (w of warehouses.value() ?? []; track w.id) {
                <tr class="border-t border-[#F1F5F9]" [class.opacity-60]="!w.active">
                  <td class="px-4 py-2.5 font-mono">{{ w.code }}</td>
                  <td class="px-4 py-2.5 font-medium">{{ w.name }}</td>
                  <td class="px-4 py-2.5 text-muted-foreground">{{ w.address ?? '—' }}</td>
                  <td class="px-4 py-2.5">
                    @if (w.active) {
                      <span class="rounded-full border border-[#A7F3D0] bg-success-soft px-2 py-0.5 text-xs text-success-soft-foreground">Actif</span>
                    } @else {
                      <span class="rounded-full border px-2 py-0.5 text-xs">Désactivé</span>
                    }
                  </td>
                  @if (canEdit()) {
                    <td class="px-4 py-2.5 text-right whitespace-nowrap">
                      <button type="button" [class]="btnOutline + ' h-8 px-3'" (click)="rename(w)" [disabled]="busy() === w.id">Renommer</button>
                      <button type="button" [class]="btnOutline + ' ml-2 h-8 px-3'" (click)="toggle(w)" [disabled]="busy() === w.id">{{ w.active ? 'Désactiver' : 'Réactiver' }}</button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </section>

        @if (canEdit()) {
          <form (submit)="create($event)" novalidate class="grid content-start gap-4 rounded-lg border bg-card p-5">
            <h2 class="font-semibold">Nouveau dépôt</h2>
            <div class="grid gap-1.5">
              <label for="w-code" class="text-sm font-medium">Code</label>
              <input id="w-code" [class]="field + ' font-mono uppercase'" placeholder="BTQ-02" [value]="form().code" (input)="set('code', $event)" [attr.aria-invalid]="errs()['code'] ? true : null" />
              @if (errs()['code']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
            </div>
            <div class="grid gap-1.5">
              <label for="w-name" class="text-sm font-medium">Nom</label>
              <input id="w-name" [class]="field" placeholder="Boutique Keur Massar" [value]="form().name" (input)="set('name', $event)" [attr.aria-invalid]="errs()['name'] ? true : null" />
              @if (errs()['name']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
            </div>
            <div class="grid gap-1.5">
              <label for="w-address" class="text-sm font-medium">Adresse (optionnel)</label>
              <input id="w-address" [class]="field" [value]="form().address" (input)="set('address', $event)" />
            </div>
            <button type="submit" [class]="btnPrimary" [disabled]="creating()">Créer le dépôt</button>
          </form>
        }
      </div>
    </div>
  `,
})
export class Warehouses {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);

  protected readonly canEdit = computed(() => can(this.store.user()?.role, 'manageSettings'));
  protected readonly warehouses = httpResource<Warehouse[]>(() => `${this.base}/warehouses?all=true`);
  protected readonly form = signal({ code: '', name: '', address: '' });
  protected readonly errs = signal<Record<string, string>>({});
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly field = field;
  protected readonly btnPrimary = btnPrimary;
  protected readonly btnOutline = btnOutline;

  protected set(key: 'code' | 'name' | 'address', e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected async create(e: Event) {
    e.preventDefault();
    const parsed = warehouseCreateSchema.safeParse(this.form());
    if (!parsed.success) {
      const m: Record<string, string> = {};
      for (const i of parsed.error.issues) m[String(i.path[0])] ??= i.message;
      this.errs.set(m);
      return;
    }
    this.errs.set({});
    this.creating.set(true);
    try {
      await firstValueFrom(this.http.post(`${this.base}/warehouses`, parsed.data));
      this.form.set({ code: '', name: '', address: '' });
      this.error.set(null);
      this.warehouses.reload();
    } catch (err) {
      this.error.set(apiMessage(err));
    } finally {
      this.creating.set(false);
    }
  }

  protected async rename(w: Warehouse) {
    const name = prompt(`Nouveau nom pour ${w.code}`, w.name)?.trim();
    if (!name || name === w.name) return;
    await this.patch(w, { name });
  }

  protected async toggle(w: Warehouse) {
    const q = w.active
      ? `Désactiver ${w.code} — ${w.name} ? Il ne pourra plus servir de dépôt de vente.`
      : `Réactiver ${w.code} — ${w.name} ?`;
    if (!confirm(q)) return;
    await this.patch(w, { active: !w.active });
  }

  private async patch(w: Warehouse, body: object) {
    this.busy.set(w.id);
    try {
      await firstValueFrom(this.http.patch(`${this.base}/warehouses/${w.id}`, body));
      this.error.set(null);
      this.warehouses.reload();
    } catch (err) {
      this.error.set(apiMessage(err));
    } finally {
      this.busy.set(null);
    }
  }
}
