import { Component } from '@angular/core';
import { formatXof } from '../../shared/money';

// Données fictives en attendant les endpoints d'administration.
const KPIS = [
  { label: 'Utilisateurs actifs', value: '7', hint: '2 gérants · 4 caissiers · 1 magasinier' },
  { label: 'Dépôts', value: '2', hint: 'Dépôt principal · Annexe Thiaroye' },
  { label: 'Ventes du mois', value: formatXof(31_240_000), hint: '612 tickets et factures' },
  { label: 'Écarts de caisse', value: formatXof(-12_500), hint: '3 clôtures à vérifier', alert: true },
];

// Rôles définis dans le schéma Prisma de l'API (enum Role).
const ROLES = [
  { code: 'ADMIN', name: 'Administrateur', scope: 'Tout, y compris utilisateurs, société et journal d’audit' },
  { code: 'MANAGER', name: 'Gérant', scope: 'Ventes, achats, avoirs, inventaires, rapports' },
  { code: 'CASHIER', name: 'Caissier / vendeur', scope: 'Caisse, tickets, encaissements, clients' },
  { code: 'STOCK_KEEPER', name: 'Magasinier', scope: 'Réceptions, transferts, pertes, inventaires' },
];

@Component({
  selector: 'app-overview',
  template: `
    <div class="space-y-6">
      <div>
        <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Administration
        </div>
        <h1 class="text-2xl font-semibold tracking-tight">Vue d'ensemble</h1>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        @for (k of kpis; track k.label) {
          <section class="rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {{ k.label }}
            </h2>
            <p class="mt-2 font-mono text-2xl font-semibold">{{ k.value }}</p>
            <div class="mt-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">
              {{ k.hint }}
              @if (k.alert) {
                <span class="rounded-full border border-[#FECACA] bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger-soft-foreground">
                  À contrôler
                </span>
              }
            </div>
          </section>
        }
      </div>

      <section class="overflow-hidden rounded-lg border bg-card">
        <h2 class="border-b px-5 py-3 font-semibold">Rôles et accès</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-background text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th scope="col" class="h-8 px-5">Code</th>
                <th scope="col" class="h-8 px-5">Rôle</th>
                <th scope="col" class="h-8 px-5">Périmètre</th>
              </tr>
            </thead>
            <tbody>
              @for (r of roles; track r.code) {
                <tr class="border-t border-[#F1F5F9] hover:bg-background">
                  <td class="h-10 px-5 font-mono text-[13px]">{{ r.code }}</td>
                  <td class="h-10 px-5 font-medium">{{ r.name }}</td>
                  <td class="h-10 px-5 text-muted-foreground">{{ r.scope }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class Overview {
  protected readonly kpis = KPIS;
  protected readonly roles = ROLES;
}
