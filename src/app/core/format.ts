import { Pipe, type PipeTransform } from '@angular/core';
import { formatXof } from '../../shared/money';

const qty = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const dateTime = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** 1420500 → « 1 420 500 FCFA » */
@Pipe({ name: 'xof' })
export class XofPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : formatXof(v);
  }
}

/** Écart signé : « +4 320 FCFA » / « −130 FCFA ». */
@Pipe({ name: 'signedXof' })
export class SignedXofPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return `${v > 0 ? '+' : v < 0 ? '−' : ''}${formatXof(Math.abs(v))}`;
  }
}

@Pipe({ name: 'qty' })
export class QtyPipe implements PipeTransform {
  transform(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : qty.format(v);
  }
}

@Pipe({ name: 'dt' })
export class DateTimePipe implements PipeTransform {
  transform(v: string | null | undefined): string {
    return v ? dateTime.format(new Date(v)) : '—';
  }
}

/** Période d'analyse : jours glissants, bornes ISO (jour inclus). */
export type PeriodKey = 'today' | '7d' | '30d';
export const periodLabels: Record<PeriodKey, string> = { today: 'Aujourd’hui', '7d': '7 jours', '30d': '30 jours' };

export function periodRange(key: PeriodKey): { from: string; to: string } {
  const to = new Date();
  const days = key === 'today' ? 0 : key === '7d' ? 6 : 29;
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Query string en ignorant les valeurs vides. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  const s = sp.toString();
  return s ? `?${s}` : '';
}
