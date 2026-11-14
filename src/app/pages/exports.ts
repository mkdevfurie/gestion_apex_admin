import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { can } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { SessionStore } from '../core/session';
import { qs } from '../core/format';
import { PageHeader, btnOutline, btnPrimary, field } from '../layout/ui';

type ChainResult = { ok: boolean; checked: number; brokenAt: string | null; problem: string | null };
type ExportDef = { file: string; label: string; detail: string; period: boolean; costs?: boolean };

const EXPORTS: ExportDef[] = [
  { file: 'sales.csv', label: 'Ventes', detail: 'Tickets, factures et avoirs avec HT, TVA, TTC et règlements.', period: true },
  { file: 'purchases.csv', label: 'Achats', detail: 'Réceptions fournisseurs, montants payés et restant dus.', period: true },
  { file: 'receivables.csv', label: 'Créances clients', detail: 'Reste dû par client, dont échu, plafond.', period: false },
  { file: 'stock.csv', label: 'État du stock', detail: 'Quantités par article, coût moyen (PMP) et valeur.', period: false, costs: true },
  { file: 'audit.csv', label: 'Journal d’activité', detail: 'Toutes les actions des employés (traçabilité).', period: true },
];

/** Exports comptables CSV (Excel) et contrôle d'intégrité des pièces. */
@Component({
  selector: 'app-exports',
  imports: [PageHeader],
  template: `
    <div class="space-y-5">
      <app-page-header title="Exports & contrôle" subtitle="Fichiers CSV pour le comptable (séparateur « ; », ouverture directe dans Excel)." />

      <section class="rounded-lg border bg-card p-4">
        <div class="flex flex-wrap items-end gap-3">
          <div class="grid gap-1">
            <label for="e-from" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Du</label>
            <input id="e-from" type="date" [class]="field" [value]="from()" (change)="from.set(val($event))" />
          </div>
          <div class="grid gap-1">
            <label for="e-to" class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Au</label>
            <input id="e-to" type="date" [class]="field" [value]="to()" (change)="to.set(val($event))" />
          </div>
          <p class="text-sm text-muted-foreground">La période s’applique aux ventes, achats et journal.</p>
        </div>
      </section>

      <section class="grid gap-3 md:grid-cols-2">
        @for (e of exports(); track e.file) {
          <div class="flex items-start justify-between gap-4 rounded-lg border bg-card p-4">
            <div>
              <div class="font-semibold">{{ e.label }}</div>
              <p class="text-sm text-muted-foreground">{{ e.detail }}</p>
              <div class="mt-1 font-mono text-xs text-muted-foreground">{{ e.file }}</div>
            </div>
            <button type="button" [class]="btnOutline" [disabled]="busy() === e.file" (click)="download(e)">
              {{ busy() === e.file ? 'Export…' : 'Télécharger' }}
            </button>
          </div>
        }
      </section>
      @if (error()) {
        <p role="alert" class="rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">{{ error() }}</p>
      }

      @if (canVerify()) {
        <section class="rounded-lg border bg-card p-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="max-w-2xl">
              <h2 class="font-semibold">Intégrité des pièces de vente</h2>
              <p class="text-sm text-muted-foreground">
                Chaque ticket, facture et avoir est scellé par une empreinte qui dépend de la pièce précédente.
                La vérification recalcule toute la chaîne : une modification directe en base est détectée.
              </p>
            </div>
            <button type="button" [class]="btnPrimary" [disabled]="verifying()" (click)="verify()">{{ verifying() ? 'Vérification…' : 'Vérifier la chaîne' }}</button>
          </div>
          @if (chain(); as c) {
            @if (c.ok) {
              <p role="status" class="mt-3 rounded-md border border-[#A7F3D0] bg-success-soft px-3 py-2 text-sm text-success-soft-foreground">
                Chaîne intègre : {{ c.checked }} pièce(s) vérifiée(s).
              </p>
            } @else {
              <p role="alert" class="mt-3 rounded-md border border-[#FECACA] bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground">
                Rupture détectée à la pièce <b class="font-mono">{{ c.brokenAt }}</b> ({{ c.problem }}) après {{ c.checked }} pièce(s) valides.
                Consultez le journal d’activité et la base de données.
              </p>
            }
          }
        </section>
      }
    </div>
  `,
})
export class Exports {
  private readonly base = inject(API_BASE_URL);
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);
  protected readonly field = field;
  protected readonly btnOutline = btnOutline;
  protected readonly btnPrimary = btnPrimary;
  protected readonly from = signal(new Date(Date.now() - 29 * 86_400_000).toISOString().slice(0, 10));
  protected readonly to = signal(new Date().toISOString().slice(0, 10));
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly verifying = signal(false);
  protected readonly chain = signal<ChainResult | null>(null);
  private readonly role = computed(() => this.session.user()?.role);
  protected readonly exports = computed(() => {
    const r = this.role();
    return EXPORTS.filter((e) => !e.costs || (r && can(r, 'viewCosts')));
  });
  protected readonly canVerify = computed(() => {
    const r = this.role();
    return Boolean(r && can(r, 'manageSettings'));
  });

  protected val(e: Event) {
    return (e.target as HTMLInputElement).value;
  }

  protected async download(e: ExportDef) {
    this.busy.set(e.file);
    this.error.set(null);
    try {
      const query = e.period ? qs({ from: this.from(), to: this.to() }) : '';
      const blob = await firstValueFrom(this.http.get(`${this.base}/exports/${e.file}${query}`, { responseType: 'blob' }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = e.period ? e.file.replace('.csv', `_${this.from()}_${this.to()}.csv`) : e.file;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error.set(`Export « ${e.label} » impossible. Réessayez.`);
    } finally {
      this.busy.set(null);
    }
  }

  protected async verify() {
    this.verifying.set(true);
    try {
      this.chain.set(await firstValueFrom(this.http.get<ChainResult>(`${this.base}/exports/chain-verify`)));
    } catch {
      this.error.set('Vérification impossible. Réessayez.');
    } finally {
      this.verifying.set(false);
    }
  }
}
