import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import type { ReceivablesReport, SupplierRow } from '../../shared/commerce';
import type { Paged } from '../../shared/admin';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, XofPipe, qs } from '../core/format';
import { PageHeader, Pager } from '../layout/ui';

const PAGE_SIZE = 25;

/** Créances clients (balance âgée) et dettes fournisseurs. */
@Component({
  selector: 'app-finances',
  imports: [PageHeader, Pager, XofPipe, DateTimePipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Créances & dettes" subtitle="Ce que les clients doivent à la boutique, et ce que la boutique doit à ses fournisseurs." />

      <section class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border bg-card p-4">
          <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Créances clients</div>
          <div class="mt-1 font-mono text-2xl font-semibold">{{ receivables.value()?.total ?? 0 | xof }}</div>
        </div>
        <div class="rounded-lg border bg-card p-4" [class.bg-danger-soft]="(receivables.value()?.overdue ?? 0) > 0">
          <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Dont échu</div>
          <div class="mt-1 font-mono text-2xl font-semibold">{{ receivables.value()?.overdue ?? 0 | xof }}</div>
        </div>
        <div class="rounded-lg border bg-card p-4">
          <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Dettes fournisseurs (page)</div>
          <div class="mt-1 font-mono text-2xl font-semibold">{{ supplierDebt() | xof }}</div>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border bg-card">
        <h2 class="border-b px-4 py-3 font-semibold">Balance âgée des clients</h2>
        @if (receivables.value(); as r) {
          <div class="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
            @for (b of r.buckets; track b.label) {
              <div class="bg-card px-4 py-3">
                <div class="text-xs text-muted-foreground">Retard {{ b.label }}</div>
                <div class="font-mono font-semibold" [class.text-danger-soft-foreground]="b.amount > 0">{{ b.amount | xof }}</div>
              </div>
            }
          </div>
        }
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Clients débiteurs</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Client</th>
                <th scope="col" class="h-8 px-4">Téléphone</th>
                <th scope="col" class="h-8 px-4">Plus ancienne échéance</th>
                <th scope="col" class="h-8 px-4 text-right">Échu</th>
                <th scope="col" class="h-8 px-4 text-right">Reste dû</th>
                <th scope="col" class="h-8 px-4 text-right">Plafond</th>
              </tr>
            </thead>
            <tbody>
              @if (receivables.isLoading() && !receivables.value()) {
                <tr><td colspan="6" class="p-4"><div class="h-24 animate-pulse rounded bg-muted"></div></td></tr>
              }
              @for (c of receivables.value()?.customers ?? []; track c.id) {
                <tr class="border-t border-[#F1F5F9]">
                  <td class="px-4 py-2.5"><div class="font-medium">{{ c.name }}</div><div class="font-mono text-xs text-muted-foreground">{{ c.code }}</div></td>
                  <td class="px-4 py-2.5 text-xs">{{ c.phone ?? '—' }}</td>
                  <td class="px-4 py-2.5 font-mono text-xs">{{ c.oldestDueDate ? (c.oldestDueDate | dt) : '—' }}</td>
                  <td class="px-4 py-2.5 text-right font-mono" [class.text-danger-soft-foreground]="c.overdue > 0">{{ c.overdue ? (c.overdue | xof) : '' }}</td>
                  <td class="px-4 py-2.5 text-right font-mono font-semibold">{{ c.balance | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono text-xs">{{ c.creditLimit ? (c.creditLimit | xof) : 'Comptant' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="px-4 py-10 text-center text-muted-foreground">Aucune créance en cours.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border bg-card">
        <h2 class="border-b px-4 py-3 font-semibold">Dettes fournisseurs</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Fournisseurs</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Fournisseur</th>
                <th scope="col" class="h-8 px-4">Contact</th>
                <th scope="col" class="h-8 px-4 text-right">Dette</th>
              </tr>
            </thead>
            <tbody>
              @for (s of suppliers.value()?.items ?? []; track s.id) {
                <tr class="border-t border-[#F1F5F9]">
                  <td class="px-4 py-2.5"><div class="font-medium">{{ s.name }}</div><div class="font-mono text-xs text-muted-foreground">{{ s.code }}</div></td>
                  <td class="px-4 py-2.5 text-xs">{{ s.phone ?? s.email ?? '—' }}</td>
                  <td class="px-4 py-2.5 text-right font-mono font-semibold">{{ s.balance | xof }}</td>
                </tr>
              } @empty {
                <tr><td colspan="3" class="px-4 py-10 text-center text-muted-foreground">Aucun fournisseur.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [(page)]="page" [total]="suppliers.value()?.total ?? 0" [pageSize]="pageSize" noun="fournisseurs" />
      </section>
    </div>
  `,
})
export class Finances {
  private readonly base = inject(API_BASE_URL);
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly receivables = httpResource<ReceivablesReport>(() => `${this.base}/customers/receivables`);
  protected readonly suppliers = httpResource<Paged<SupplierRow>>(
    () => `${this.base}/suppliers${qs({ page: this.page(), pageSize: PAGE_SIZE })}`,
  );
  protected readonly supplierDebt = computed(() => (this.suppliers.value()?.items ?? []).reduce((a, s) => a + s.balance, 0));
}
