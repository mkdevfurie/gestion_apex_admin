import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CashSessionRow, DailySales, EmployeeStats, Overview as OverviewData, Paged, TopProduct } from '../../shared/admin';
import { roleLabels } from '../../shared/roles';
import { paymentMethodLabels } from '../../shared/schemas';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, QtyPipe, SignedXofPipe, XofPipe, periodRange, qs, type PeriodKey } from '../core/format';
import { Icon } from '../layout/icon';
import { Kpi, PageHeader, PeriodPicker } from '../layout/ui';

@Component({
  selector: 'app-overview',
  imports: [Kpi, PageHeader, PeriodPicker, RouterLink, Icon, XofPipe, SignedXofPipe, QtyPipe, DateTimePipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Vue d’ensemble" [subtitle]="subtitle()">
        <app-period [(value)]="period" />
      </app-page-header>

      @if (overview.error()) {
        <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
          Impossible de charger les indicateurs.
        </p>
      }

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <app-kpi label="Chiffre d’affaires TTC" [loading]="!o()" [value]="o()?.salesTotal | xof" [sub]="(o()?.ticketCount ?? 0) + ' ticket(s) · panier ' + (o()?.averageBasket | xof)" />
        <app-kpi label="Marge brute (au PMP)" [loading]="!o()" [value]="o()?.grossMargin | xof"
          [sub]="(o()?.marginRate | qty) + ' % des ventes HT'" [tone]="(o()?.grossMargin ?? 0) < 0 ? 'danger' : null" />
        <app-kpi label="Écarts de caisse" [loading]="!o()" [value]="o()?.cashDifferenceTotal | signedXof"
          [sub]="o()?.cashAlerts ? o()!.cashAlerts + ' session(s) hors tolérance' : 'Aucun écart hors tolérance'"
          [tone]="o()?.cashAlerts ? 'danger' : 'success'" />
        <app-kpi label="Valeur du stock (PMP)" [loading]="!o()" [value]="o()?.stockValuation | xof"
          [sub]="(o()?.outOfStockCount ?? 0) + ' rupture(s) · ' + (o()?.lowStockCount ?? 0) + ' stock bas'" />
      </div>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section class="rounded-lg border bg-card p-4">
          <h2 class="mb-3 font-semibold">Chiffre d’affaires — 14 derniers jours</h2>
          @if (daily.value(); as d) {
            <figure>
              <figcaption class="sr-only">Chiffre d’affaires par jour</figcaption>
              <div class="flex h-40 items-end gap-1.5" aria-hidden="true">
                @for (p of d; track p.day) {
                  <div class="flex h-full min-w-0 flex-1 flex-col justify-end" [title]="p.day + ' : ' + (p.total | xof) + ' · ' + p.tickets + ' ticket(s)'">
                    <div class="rounded-t-sm bg-primary/85 hover:bg-primary" [style.height.%]="barHeight(p.total)"></div>
                    @if (!p.total) { <div class="h-px bg-border"></div> }
                  </div>
                }
              </div>
              <div class="mt-1 flex gap-1.5 font-mono text-[10px] text-muted-foreground" aria-hidden="true">
                @for (p of d; track p.day) {
                  <div class="min-w-0 flex-1 truncate text-center">{{ p.day.slice(8) }}/{{ p.day.slice(5, 7) }}</div>
                }
              </div>
              <table class="sr-only">
                <caption>Chiffre d’affaires par jour</caption>
                <tbody>
                  @for (p of d; track p.day) {
                    <tr><th scope="row">{{ p.day }}</th><td>{{ p.total | xof }}</td><td>{{ p.tickets }} tickets</td></tr>
                  }
                </tbody>
              </table>
            </figure>
          } @else {
            <div class="h-44 animate-pulse rounded bg-muted"></div>
          }
        </section>

        <section class="rounded-lg border bg-card p-4">
          <h2 class="mb-3 font-semibold">Encaissements</h2>
          @if (o(); as ov) {
            @if (ov.byMethod.length === 0) {
              <p class="text-sm text-muted-foreground">Aucun encaissement sur la période.</p>
            }
            <ul class="space-y-2">
              @for (m of ov.byMethod; track m.method) {
                <li>
                  <div class="flex justify-between text-sm">
                    <span>{{ methodLabels[m.method] }}</span>
                    <span class="font-mono">{{ m.amount | xof }}</span>
                  </div>
                  <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div class="h-full bg-primary" [style.width.%]="(m.amount / ov.salesTotal) * 100"></div>
                  </div>
                </li>
              }
            </ul>
            <div class="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div class="rounded-md border bg-background p-2">
                <div class="text-xs text-muted-foreground">Caisses ouvertes</div>
                <div class="font-mono font-semibold">{{ ov.openSessions }}</div>
              </div>
              <div class="rounded-md border bg-background p-2">
                <div class="text-xs text-muted-foreground">Employés actifs</div>
                <div class="font-mono font-semibold">{{ ov.activeUsers }}</div>
              </div>
            </div>
          }
        </section>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <section class="overflow-hidden rounded-lg border bg-card">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2 class="font-semibold">Équipe</h2>
            <a routerLink="/equipe" class="text-sm text-muted-foreground underline-offset-4 hover:underline">Détail</a>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <caption class="sr-only">Ventes par employé</caption>
              <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <tr>
                  <th scope="col" class="h-8 px-4">Employé</th>
                  <th scope="col" class="h-8 px-4 text-right">Tickets</th>
                  <th scope="col" class="h-8 px-4 text-right">CA</th>
                  <th scope="col" class="h-8 px-4 text-right">Écart caisse</th>
                </tr>
              </thead>
              <tbody>
                @for (e of activeEmployees(); track e.userId) {
                  <tr class="border-t border-[#F1F5F9]">
                    <td class="px-4 py-2"><div class="font-medium">{{ e.name }}</div><div class="text-xs text-muted-foreground">{{ roleLabels[e.role] }}</div></td>
                    <td class="px-4 py-2 text-right font-mono">{{ e.ticketCount }}</td>
                    <td class="px-4 py-2 text-right font-mono">{{ e.salesTotal | xof }}</td>
                    <td class="px-4 py-2 text-right font-mono" [class.text-danger-soft-foreground]="e.cashDifference < 0">{{ e.cashDifference | signedXof }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="px-4 py-6 text-center text-muted-foreground">Aucune activité sur la période.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="overflow-hidden rounded-lg border bg-card">
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2 class="font-semibold">Écarts de caisse à contrôler</h2>
            <a routerLink="/caisses" class="text-sm text-muted-foreground underline-offset-4 hover:underline">Toutes les caisses</a>
          </div>
          <ul class="divide-y">
            @for (s of cashAlerts.value()?.items ?? []; track s.id) {
              <li class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div>
                  <div class="flex items-center gap-2 font-medium"><app-icon name="alert" class="size-4 text-destructive" /> {{ s.openedBy.name }}</div>
                  <div class="text-xs text-muted-foreground">{{ s.warehouse }} · clôturée le {{ s.closedAt | dt }}</div>
                </div>
                <span class="font-mono font-semibold text-danger-soft-foreground">{{ s.difference | signedXof }}</span>
              </li>
            } @empty {
              <li class="px-4 py-6 text-center text-sm text-muted-foreground">Aucun écart hors tolérance.</li>
            }
          </ul>
          <div class="border-t px-4 py-3">
            <h3 class="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Meilleures ventes</h3>
            <ol class="space-y-1 text-sm">
              @for (t of top.value() ?? []; track t.productId; let i = $index) {
                <li class="flex justify-between gap-3"><span class="truncate"><span class="font-mono text-muted-foreground">{{ i + 1 }}.</span> {{ t.name }} <span class="text-muted-foreground">× {{ t.quantity | qty }}</span></span><span class="font-mono">{{ t.revenue | xof }}</span></li>
              } @empty {
                <li class="text-muted-foreground">Aucune vente sur la période.</li>
              }
            </ol>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class Overview {
  private readonly base = inject(API_BASE_URL);
  protected readonly period = signal<PeriodKey>('today');
  private readonly range = computed(() => periodRange(this.period()));

  protected readonly overview = httpResource<OverviewData>(() => `${this.base}/reports/overview${qs(this.range())}`);
  protected readonly daily = httpResource<DailySales>(() => `${this.base}/reports/daily?days=14`);
  protected readonly employees = httpResource<EmployeeStats[]>(() => `${this.base}/reports/employees${qs(this.range())}`);
  protected readonly top = httpResource<TopProduct[]>(() => `${this.base}/reports/top-products${qs(this.range())}`);
  protected readonly cashAlerts = httpResource<Paged<CashSessionRow>>(
    () => `${this.base}/reports/cash-sessions${qs({ ...this.range(), alertsOnly: true, pageSize: 5 })}`,
  );

  protected readonly o = computed(() => this.overview.value());
  protected readonly activeEmployees = computed(() =>
    (this.employees.value() ?? []).filter((e) => e.ticketCount || e.sessions || e.stockMovements),
  );
  protected readonly subtitle = computed(() => {
    const r = this.range();
    return r.from === r.to ? `Journée du ${fr(r.from)}` : `Du ${fr(r.from)} au ${fr(r.to)}`;
  });
  protected readonly roleLabels = roleLabels;
  protected readonly methodLabels = paymentMethodLabels;

  protected barHeight(v: number) {
    const max = Math.max(1, ...(this.daily.value() ?? []).map((d) => d.total));
    return v ? Math.max(3, (v / max) * 100) : 0;
  }
}

const fr = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
