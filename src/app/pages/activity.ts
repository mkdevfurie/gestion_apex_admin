import { JsonPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { auditActionLabels, auditCategories, type AuditCategory, type AuditEntry, type Paged } from '../../shared/admin';
import { roleLabels, type UserRow } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, qs } from '../core/format';
import { PageHeader, Pager, field } from '../layout/ui';

const PAGE_SIZE = 30;

@Component({
  selector: 'app-activity',
  imports: [PageHeader, Pager, DateTimePipe, JsonPipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Journal d’activité" subtitle="Qui a fait quoi, et quand. Le journal ne peut être ni modifié ni effacé." />

      <section class="overflow-hidden rounded-lg border bg-card">
        <div class="flex flex-wrap items-end gap-3 border-b px-4 py-3">
          <div class="grid gap-1">
            <label for="f-user" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Employé</label>
            <select id="f-user" [class]="field + ' min-w-48'" (change)="user.set(val($event)); page.set(1)">
              <option value="" [selected]="!user()">Tous</option>
              @for (u of users.value() ?? []; track u.id) {
                <option [value]="u.id" [selected]="u.id === user()">{{ u.name }} — {{ roleLabels[u.role] }}</option>
              }
            </select>
          </div>
          <div class="grid gap-1">
            <label for="f-cat" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Type</label>
            <select id="f-cat" [class]="field" (change)="category.set(val($event)); page.set(1)">
              <option value="">Tout</option>
              @for (c of categories; track c[0]) {
                <option [value]="c[0]" [selected]="c[0] === category()">{{ c[1] }}</option>
              }
            </select>
          </div>
          <div class="grid gap-1">
            <label for="f-from" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Du</label>
            <input id="f-from" type="date" [class]="field" [value]="from()" (change)="from.set(val($event)); page.set(1)" />
          </div>
          <div class="grid gap-1">
            <label for="f-to" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Au</label>
            <input id="f-to" type="date" [class]="field" [value]="to()" (change)="to.set(val($event)); page.set(1)" />
          </div>
        </div>

        <ol class="divide-y">
          @if (log.isLoading() && !log.value()) {
            <li class="p-4"><div class="h-32 animate-pulse rounded bg-muted"></div></li>
          }
          @for (e of log.value()?.items ?? []; track e.id) {
            <li class="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-2.5 text-sm">
              <span class="w-36 shrink-0 font-mono text-xs text-muted-foreground">{{ e.at | dt }}</span>
              <span class="w-44 shrink-0">
                <span class="rounded-full border px-2 py-0.5 text-xs font-medium" [class]="tone(e.action)">{{ label(e.action) }}</span>
              </span>
              <span class="min-w-40 flex-1">
                <span class="font-medium">{{ e.user?.name ?? 'Système' }}</span>
                @if (e.user) { <span class="text-xs text-muted-foreground"> · {{ roleLabels[e.user.role] }}</span> }
                @if (summary(e); as s) { <div class="text-xs text-muted-foreground">{{ s }}</div> }
              </span>
              @if (e.data && !summary(e)) {
                <details class="w-full text-xs text-muted-foreground sm:w-auto">
                  <summary class="cursor-pointer select-none">Détails</summary>
                  <pre class="mt-1 max-w-xl overflow-x-auto rounded bg-muted p-2">{{ e.data | json }}</pre>
                </details>
              }
            </li>
          } @empty {
            <li class="px-4 py-10 text-center text-sm text-muted-foreground">Aucune entrée pour ces filtres.</li>
          }
        </ol>
        <app-pager [(page)]="page" [total]="log.value()?.total ?? 0" [pageSize]="pageSize" noun="entrées" />
      </section>
    </div>
  `,
})
export class Activity {
  private readonly base = inject(API_BASE_URL);
  /** ?userId=… depuis la page Équipe. */
  readonly userId = input<string>();

  protected readonly user = linkedSignal(() => this.userId() ?? '');
  protected readonly category = signal<AuditCategory | ''>('');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;

  protected readonly users = httpResource<UserRow[]>(() => `${this.base}/users`);
  protected readonly log = httpResource<Paged<AuditEntry>>(
    () =>
      `${this.base}/reports/audit${qs({
        userId: this.user(),
        category: this.category(),
        from: this.from(),
        to: this.to(),
        page: this.page(),
        pageSize: PAGE_SIZE,
      })}`,
  );

  protected readonly categories = Object.entries(auditCategories);
  protected readonly roleLabels = roleLabels;
  protected readonly field = field;

  constructor() {
    // Un changement d'employé depuis l'URL repart de la première page.
    effect(() => {
      this.userId();
      this.page.set(1);
    });
  }

  protected val(e: Event) {
    return (e.target as HTMLInputElement).value as never;
  }

  protected label(action: string) {
    return auditActionLabels[action] ?? action;
  }

  protected tone(action: string) {
    if (action === 'auth.login_failed') return 'border-[#FECACA] bg-danger-soft text-danger-soft-foreground';
    if (action.startsWith('sale.')) return 'border-[#A7F3D0] bg-success-soft text-success-soft-foreground';
    if (action.startsWith('cash.') || action.startsWith('stock.')) return 'border-[#FDE68A] bg-warning-soft text-warning-soft-foreground';
    return 'bg-background';
  }

  /** Résumé lisible des actions les plus courantes. */
  protected summary(e: AuditEntry): string | null {
    const d = (e.data ?? {}) as Record<string, unknown>;
    const fmt = (n: unknown) => new Intl.NumberFormat('fr-FR').format(Number(n)) + ' FCFA';
    switch (e.action) {
      case 'sale.issue':
        return `${d['number']} · ${fmt(d['total'])}`;
      case 'cash.open':
        return `Fond de caisse ${fmt(d['openingFloat'])}`;
      case 'cash.close': {
        const diff = Number(d['difference'] ?? 0);
        return `Attendu ${fmt(d['expectedCash'])} · compté ${fmt(d['countedCash'])} · écart ${diff > 0 ? '+' : ''}${fmt(diff)}`;
      }
      case 'stock.inventory':
        return `Écart d’inventaire : ${d['difference']}`;
      case 'auth.login':
      case 'auth.login_failed':
        return d['ip'] ? `Adresse IP ${d['ip']}` : null;
      default:
        return null;
    }
  }
}

