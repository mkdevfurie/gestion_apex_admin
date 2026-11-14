import { Component, input, model } from '@angular/core';
import { periodLabels, type PeriodKey } from '../core/format';

// Petits composants communs de la console (en-tête de page, carte indicateur,
// sélecteur de période, pagination).

@Component({
  selector: 'app-page-header',
  host: { class: 'flex flex-wrap items-end justify-between gap-3' },
  template: `
    <div>
      <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{{ eyebrow() }}</div>
      <h1 class="text-2xl font-semibold tracking-tight">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="mt-1 text-sm text-muted-foreground">{{ subtitle() }}</p>
      }
    </div>
    <div class="flex flex-wrap items-center gap-2"><ng-content /></div>
  `,
})
export class PageHeader {
  readonly eyebrow = input('Console d’administration');
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}

@Component({
  selector: 'app-kpi',
  host: { class: 'block rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]' },
  template: `
    <div class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{{ label() }}</div>
    @if (loading()) {
      <div class="mt-2 h-8 w-3/4 animate-pulse rounded bg-muted"></div>
    } @else {
      <div class="mt-2 font-mono text-2xl font-semibold" [class.text-danger-soft-foreground]="tone() === 'danger'"
        [class.text-success-soft-foreground]="tone() === 'success'">{{ value() }}</div>
      @if (sub()) {
        <div class="mt-1 text-sm text-muted-foreground">{{ sub() }}</div>
      }
    }
  `,
})
export class Kpi {
  readonly label = input.required<string>();
  readonly value = input<string | number | null>();
  readonly sub = input<string | null>();
  readonly loading = input(false);
  readonly tone = input<'danger' | 'success' | null>(null);
}

@Component({
  selector: 'app-period',
  template: `
    <div role="radiogroup" aria-label="Période" class="inline-flex rounded-md border bg-card p-0.5">
      @for (k of keys; track k) {
        <button type="button" role="radio" [attr.aria-checked]="value() === k" (click)="value.set(k)"
          class="h-8 rounded px-3 text-sm transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          [class]="value() === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'">
          {{ labels[k] }}
        </button>
      }
    </div>
  `,
})
export class PeriodPicker {
  readonly value = model<PeriodKey>('today');
  protected readonly keys = Object.keys(periodLabels) as PeriodKey[];
  protected readonly labels = periodLabels;
}

@Component({
  selector: 'app-pager',
  host: { class: 'flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground' },
  template: `
    <span>{{ total() }} {{ noun() }}</span>
    <div class="flex items-center gap-2">
      <button type="button" (click)="page.set(page() - 1)" [disabled]="page() <= 1" class="h-8 rounded-md border bg-card px-3 hover:bg-accent disabled:opacity-50">Précédent</button>
      <span class="font-mono text-xs">{{ page() }} / {{ pages() }}</span>
      <button type="button" (click)="page.set(page() + 1)" [disabled]="page() >= pages()" class="h-8 rounded-md border bg-card px-3 hover:bg-accent disabled:opacity-50">Suivant</button>
    </div>
  `,
})
export class Pager {
  readonly page = model(1);
  readonly total = input(0);
  readonly pageSize = input(25);
  readonly noun = input('éléments');
  protected pages() {
    return Math.max(1, Math.ceil(this.total() / this.pageSize()));
  }
}

/** Classes communes des champs et boutons. */
export const field =
  'h-9 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';
export const btn =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
export const btnPrimary = `${btn} bg-primary text-primary-foreground hover:bg-primary/90`;
export const btnOutline = `${btn} border bg-card hover:bg-accent`;
