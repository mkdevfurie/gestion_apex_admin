import { httpResource } from '@angular/common/http';
import { Component, ElementRef, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import type { Paged, SaleRow } from '../../shared/admin';
import type { UserRow } from '../../shared/roles';
import type { SaleReceipt } from '../../shared/sales';
import { paymentMethodLabels } from '../../shared/schemas';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, QtyPipe, XofPipe, qs } from '../core/format';
import { PageHeader, Pager, btnOutline, field } from '../layout/ui';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-sales',
  imports: [PageHeader, Pager, XofPipe, QtyPipe, DateTimePipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Ventes" subtitle="Tous les tickets émis, par caissier et par jour." />

      <section class="overflow-hidden rounded-lg border bg-card">
        <div class="flex flex-wrap items-end gap-3 border-b px-4 py-3">
          <div class="grid gap-1">
            <label for="s-user" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Caissier</label>
            <select id="s-user" [class]="field + ' min-w-44'" (change)="user.set(val($event)); page.set(1)">
              <option value="" [selected]="!user()">Tous</option>
              @for (u of users.value() ?? []; track u.id) {
                <option [value]="u.id" [selected]="u.id === user()">{{ u.name }}</option>
              }
            </select>
          </div>
          <div class="grid gap-1">
            <label for="s-from" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Du</label>
            <input id="s-from" type="date" [class]="field" (change)="from.set(val($event)); page.set(1)" />
          </div>
          <div class="grid gap-1">
            <label for="s-to" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Au</label>
            <input id="s-to" type="date" [class]="field" (change)="to.set(val($event)); page.set(1)" />
          </div>
          <div class="grid gap-1">
            <label for="s-q" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">N° de ticket</label>
            <input id="s-q" [class]="field + ' font-mono'" placeholder="000123" (input)="q.set(val($event)); page.set(1)" />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Tickets de vente</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Ticket</th>
                <th scope="col" class="h-8 px-4">Date</th>
                <th scope="col" class="h-8 px-4">Caissier</th>
                <th scope="col" class="h-8 px-4">Règlement</th>
                <th scope="col" class="h-8 px-4 text-right">Articles</th>
                <th scope="col" class="h-8 px-4 text-right">Total</th>
                <th scope="col" class="h-8 px-4"><span class="sr-only">Détail</span></th>
              </tr>
            </thead>
            <tbody>
              @if (sales.isLoading() && !sales.value()) {
                <tr><td colspan="7" class="p-4"><div class="h-24 animate-pulse rounded bg-muted"></div></td></tr>
              }
              @for (s of sales.value()?.items ?? []; track s.id) {
                <tr class="border-t border-[#F1F5F9]">
                  <td class="px-4 py-2.5 font-mono">{{ s.number }}</td>
                  <td class="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{{ s.issuedAt | dt }}</td>
                  <td class="px-4 py-2.5">{{ s.cashier.name }} <span class="font-mono text-xs text-muted-foreground">{{ s.warehouse }}</span></td>
                  <td class="px-4 py-2.5">{{ methods(s) }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.itemCount | qty }}</td>
                  <td class="px-4 py-2.5 text-right font-mono font-semibold">{{ s.total | xof }}</td>
                  <td class="px-4 py-2.5 text-right"><button type="button" [class]="btnOutline + ' h-8 px-3'" (click)="open(s.id)">Voir</button></td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="px-4 py-10 text-center text-muted-foreground">Aucun ticket.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [(page)]="page" [total]="sales.value()?.total ?? 0" [pageSize]="pageSize" noun="tickets" />
      </section>
    </div>

    <dialog #receiptDialog (close)="receiptId.set(null)" aria-labelledby="receipt-title"
      class="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-lg border bg-card p-0 shadow-xl backdrop:bg-black/50">
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h2 id="receipt-title" class="font-semibold">{{ receipt.value()?.number ?? 'Ticket' }}</h2>
        <button type="button" (click)="receiptDialog.close()" class="rounded px-2 text-muted-foreground hover:text-foreground" aria-label="Fermer">✕</button>
      </div>
      @if (receipt.value(); as r) {
        <div class="max-h-[70vh] overflow-y-auto p-4 font-mono text-xs">
          <div class="mb-2 text-muted-foreground">{{ r.issuedAt | dt }} · {{ r.cashier }} · {{ r.warehouse.code }}</div>
          @for (l of r.lines; track $index) {
            <div class="flex justify-between gap-3 border-b border-dashed py-1">
              <span>{{ l.description }}<br /><span class="text-muted-foreground">{{ l.quantity | qty }} × {{ l.unitPrice | xof }}@if (l.discountRate) { · −{{ l.discountRate }} % }</span></span>
              <span class="shrink-0">{{ l.lineTotal | xof }}</span>
            </div>
          }
          <div class="mt-2 flex justify-between"><span>Total HT</span><span>{{ r.subtotal - r.discount | xof }}</span></div>
          @for (v of r.vat; track v.rate) {
            <div class="flex justify-between text-muted-foreground"><span>TVA {{ v.rate }} %</span><span>{{ v.vat | xof }}</span></div>
          }
          <div class="mt-1 flex justify-between text-sm font-bold"><span>TOTAL TTC</span><span>{{ r.total | xof }}</span></div>
          <div class="mt-2 border-t border-dashed pt-2">
            @for (p of r.payments; track $index) {
              <div class="flex justify-between"><span>{{ methodLabels[p.method] }}@if (p.reference) { ({{ p.reference }}) }</span><span>{{ p.amount | xof }}</span></div>
            }
            @if (r.change) { <div class="flex justify-between"><span>Monnaie rendue</span><span>{{ r.change | xof }}</span></div> }
          </div>
          <div class="mt-3 text-center text-[10px] text-muted-foreground">Empreinte {{ r.hash.slice(0, 16) }}</div>
        </div>
      } @else {
        <div class="p-4"><div class="h-40 animate-pulse rounded bg-muted"></div></div>
      }
    </dialog>
  `,
})
export class Sales {
  private readonly base = inject(API_BASE_URL);
  /** ?userId=… depuis la page Équipe. */
  readonly userId = input<string>();
  protected readonly user = linkedSignal(() => this.userId() ?? '');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly q = signal('');
  protected readonly page = signal(1);
  protected readonly receiptId = signal<string | null>(null);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly field = field;
  protected readonly btnOutline = btnOutline;
  protected readonly methodLabels = paymentMethodLabels;

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('receiptDialog');

  protected readonly users = httpResource<UserRow[]>(() => `${this.base}/users`);
  protected readonly sales = httpResource<Paged<SaleRow>>(
    () =>
      `${this.base}/reports/sales${qs({ userId: this.user(), from: this.from(), to: this.to(), q: this.q().trim(), page: this.page(), pageSize: PAGE_SIZE })}`,
  );
  protected readonly receipt = httpResource<SaleReceipt>(() => {
    const id = this.receiptId();
    return id ? `${this.base}/sales/${id}/receipt` : undefined;
  });

  protected open(id: string) {
    this.receiptId.set(id);
    this.dialog().nativeElement.showModal();
  }

  protected methods(s: SaleRow) {
    return s.methods.map((m) => paymentMethodLabels[m]).join(' + ');
  }

  protected val(e: Event) {
    return (e.target as HTMLInputElement).value;
  }
}
