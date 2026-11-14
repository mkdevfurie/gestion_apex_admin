import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { EmployeeStats } from '../../shared/admin';
import { roleLabels } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, SignedXofPipe, XofPipe, periodRange, qs, type PeriodKey } from '../core/format';
import { PageHeader, PeriodPicker } from '../layout/ui';

@Component({
  selector: 'app-team',
  imports: [PageHeader, PeriodPicker, RouterLink, XofPipe, SignedXofPipe, DateTimePipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Activité de l’équipe" subtitle="Ventes, remises, écarts de caisse et mouvements de stock par employé.">
        <app-period [(value)]="period" />
      </app-page-header>

      <section class="overflow-hidden rounded-lg border bg-card">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Activité par employé</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Employé</th>
                <th scope="col" class="h-8 px-4 text-right">Tickets</th>
                <th scope="col" class="h-8 px-4 text-right">CA TTC</th>
                <th scope="col" class="h-8 px-4 text-right">Panier moyen</th>
                <th scope="col" class="h-8 px-4 text-right">Remises</th>
                <th scope="col" class="h-8 px-4 text-right">Caisses</th>
                <th scope="col" class="h-8 px-4 text-right">Écart caisse</th>
                <th scope="col" class="h-8 px-4 text-right">Mvts stock</th>
                <th scope="col" class="h-8 px-4">Dernière activité</th>
                <th scope="col" class="h-8 px-4"><span class="sr-only">Liens</span></th>
              </tr>
            </thead>
            <tbody>
              @if (employees.isLoading() && !employees.value()) {
                <tr><td colspan="10" class="p-4"><div class="h-24 animate-pulse rounded bg-muted"></div></td></tr>
              }
              @for (e of rows(); track e.userId) {
                <tr class="border-t border-[#F1F5F9]" [class.opacity-60]="!e.active">
                  <td class="px-4 py-2.5">
                    <div class="font-medium">{{ e.name }} @if (!e.active) { <span class="text-xs font-normal">(désactivé)</span> }</div>
                    <div class="text-xs text-muted-foreground">{{ roleLabels[e.role] }}</div>
                  </td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ e.ticketCount }}</td>
                  <td class="px-4 py-2.5 text-right font-mono font-semibold">{{ e.salesTotal | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ e.averageBasket | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ e.discountGiven | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ e.sessions }}</td>
                  <td class="px-4 py-2.5 text-right font-mono" [class.text-danger-soft-foreground]="e.cashDifference < 0"
                    [class.text-success-soft-foreground]="e.cashDifference > 0">{{ e.cashDifference | signedXof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ e.stockMovements }}</td>
                  <td class="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted-foreground">{{ e.lastActivityAt | dt }}</td>
                  <td class="px-4 py-2.5 whitespace-nowrap">
                    <a [routerLink]="['/activite']" [queryParams]="{ userId: e.userId }" class="text-xs underline-offset-2 hover:underline">Journal</a>
                    @if (e.ticketCount) {
                      · <a [routerLink]="['/ventes']" [queryParams]="{ userId: e.userId }" class="text-xs underline-offset-2 hover:underline">Ventes</a>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
      <p class="text-xs text-muted-foreground">
        Remises = écart entre le prix catalogue et le prix facturé. Écart caisse = espèces comptées − attendues, sur les caisses ouvertes dans la période.
      </p>
    </div>
  `,
})
export class Team {
  private readonly base = inject(API_BASE_URL);
  protected readonly period = signal<PeriodKey>('7d');
  protected readonly employees = httpResource<EmployeeStats[]>(() => `${this.base}/reports/employees${qs(periodRange(this.period()))}`);
  protected readonly rows = computed(() => this.employees.value() ?? []);
  protected readonly roleLabels = roleLabels;
}
