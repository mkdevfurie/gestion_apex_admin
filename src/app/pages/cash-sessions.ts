import { httpResource } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import type { AppSettings, CashSessionRow, Paged } from '../../shared/admin';
import type { UserRow } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { DateTimePipe, SignedXofPipe, XofPipe, qs } from '../core/format';
import { PageHeader, Pager, field } from '../layout/ui';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-cash-sessions',
  imports: [PageHeader, Pager, XofPipe, SignedXofPipe, DateTimePipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Caisses" [subtitle]="'Ouvertures, clôtures et écarts. Tolérance actuelle : ' + ((settings.value()?.cashDifferenceTolerance ?? 0) | xof) + '.'" />

      <section class="overflow-hidden rounded-lg border bg-card">
        <div class="flex flex-wrap items-end gap-3 border-b px-4 py-3">
          <div class="grid gap-1">
            <label for="c-status" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">État</label>
            <select id="c-status" [class]="field" (change)="status.set(val($event)); page.set(1)">
              <option value="">Toutes</option>
              <option value="open">Ouvertes</option>
              <option value="closed">Clôturées</option>
            </select>
          </div>
          <div class="grid gap-1">
            <label for="c-user" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Caissier</label>
            <select id="c-user" [class]="field + ' min-w-44'" (change)="user.set(val($event)); page.set(1)">
              <option value="">Tous</option>
              @for (u of users.value() ?? []; track u.id) {
                <option [value]="u.id">{{ u.name }}</option>
              }
            </select>
          </div>
          <label class="flex h-9 items-center gap-2 text-sm">
            <input type="checkbox" [checked]="alertsOnly()" (change)="alertsOnly.set(checked($event)); page.set(1)" class="size-4" />
            Écarts hors tolérance seulement
          </label>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <caption class="sr-only">Sessions de caisse</caption>
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-4">Caissier</th>
                <th scope="col" class="h-8 px-4">Ouverture</th>
                <th scope="col" class="h-8 px-4">Clôture</th>
                <th scope="col" class="h-8 px-4 text-right">Tickets</th>
                <th scope="col" class="h-8 px-4 text-right">Ventes</th>
                <th scope="col" class="h-8 px-4 text-right">Fond</th>
                <th scope="col" class="h-8 px-4 text-right">Attendu</th>
                <th scope="col" class="h-8 px-4 text-right">Compté</th>
                <th scope="col" class="h-8 px-4 text-right">Écart</th>
              </tr>
            </thead>
            <tbody>
              @if (sessions.isLoading() && !sessions.value()) {
                <tr><td colspan="9" class="p-4"><div class="h-24 animate-pulse rounded bg-muted"></div></td></tr>
              }
              @for (s of sessions.value()?.items ?? []; track s.id) {
                <tr class="border-t border-[#F1F5F9]" [class.bg-danger-soft]="s.alert">
                  <td class="px-4 py-2.5"><div class="font-medium">{{ s.openedBy.name }}</div><div class="font-mono text-xs text-muted-foreground">{{ s.warehouse }}</div></td>
                  <td class="px-4 py-2.5 font-mono text-xs whitespace-nowrap">{{ s.openedAt | dt }}</td>
                  <td class="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                    @if (s.closedAt) { {{ s.closedAt | dt }} } @else {
                      <span class="rounded-full border border-[#A7F3D0] bg-success-soft px-2 py-0.5 font-sans text-success-soft-foreground">Ouverte</span>
                    }
                  </td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.ticketCount }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.salesTotal | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.openingFloat | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.expectedCash | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono">{{ s.countedCash | xof }}</td>
                  <td class="px-4 py-2.5 text-right font-mono font-semibold whitespace-nowrap"
                    [class.text-danger-soft-foreground]="(s.difference ?? 0) < 0" [class.text-success-soft-foreground]="(s.difference ?? 0) > 0">
                    {{ s.difference | signedXof }} @if (s.alert) { <span class="sr-only">(hors tolérance)</span> ⚠ }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="9" class="px-4 py-10 text-center text-muted-foreground">Aucune session.</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [(page)]="page" [total]="sessions.value()?.total ?? 0" [pageSize]="pageSize" noun="sessions" />
      </section>
    </div>
  `,
})
export class CashSessions {
  private readonly base = inject(API_BASE_URL);
  protected readonly status = signal<'' | 'open' | 'closed'>('');
  protected readonly user = signal('');
  protected readonly alertsOnly = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = PAGE_SIZE;
  protected readonly field = field;

  protected readonly settings = httpResource<AppSettings>(() => `${this.base}/settings`);
  protected readonly users = httpResource<UserRow[]>(() => `${this.base}/users`);
  protected readonly sessions = httpResource<Paged<CashSessionRow>>(
    () =>
      `${this.base}/reports/cash-sessions${qs({
        status: this.status(),
        userId: this.user(),
        alertsOnly: this.alertsOnly() || undefined,
        page: this.page(),
        pageSize: PAGE_SIZE,
      })}`,
  );

  protected val(e: Event) {
    return (e.target as HTMLSelectElement).value as never;
  }
  protected checked(e: Event) {
    return (e.target as HTMLInputElement).checked;
  }
}
