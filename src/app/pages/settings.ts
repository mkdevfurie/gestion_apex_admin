import { HttpClient, httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { companyUpdateSchema, settingsUpdateSchema, type AppSettings, type CompanyInfo } from '../../shared/admin';
import { can } from '../../shared/roles';
import { API_BASE_URL } from '../core/api';
import { apiMessage } from '../core/auth';
import { XofPipe } from '../core/format';
import { SessionStore } from '../core/session';
import { PageHeader, btnPrimary, field } from '../layout/ui';

type SettingsForm = Record<keyof AppSettings, string>;
type CompanyForm = Record<keyof CompanyInfo, string>;

const issuesToMap = (issues: readonly { path: PropertyKey[]; message: string }[]) => {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
};

@Component({
  selector: 'app-settings',
  imports: [PageHeader, XofPipe],
  template: `
    <div class="space-y-5">
      <app-page-header title="Société & paramètres" subtitle="Ces réglages sont appliqués par le serveur, pour tous les postes." />

      @if (!canEdit()) {
        <p role="status" class="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">Consultation seule : seul un administrateur peut modifier ces réglages.</p>
      }

      <div class="grid gap-5 xl:grid-cols-2">
        <!-- Seuils et règles -->
        <form (submit)="saveSettings($event)" novalidate class="rounded-lg border bg-card">
          <fieldset [disabled]="!canEdit()" class="grid gap-4 p-5">
            <legend class="sr-only">Règles de fonctionnement</legend>
            <div>
              <h2 class="font-semibold">Règles de fonctionnement</h2>
              <p class="text-sm text-muted-foreground">Seuils de stock, remises et contrôle de caisse.</p>
            </div>

            <h3 class="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Catalogue & stock</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <label for="st-vat" class="text-sm font-medium">TVA par défaut (nouvel article)</label>
                <select id="st-vat" [class]="field" (change)="setS('defaultVatRate', $event)">
                  @for (r of ['18', '10', '0']; track r) {
                    <option [value]="r" [selected]="s().defaultVatRate === r">{{ r }} %{{ r === '18' ? ' (taux normal)' : r === '10' ? ' (réduit)' : ' (exonéré)' }}</option>
                  }
                </select>
              </div>
              <div class="grid gap-1.5">
                <label for="st-alert" class="text-sm font-medium">Seuil d’alerte par défaut</label>
                <input id="st-alert" inputmode="decimal" [class]="field + ' font-mono'" [value]="s().defaultAlertThreshold"
                  (input)="setS('defaultAlertThreshold', $event)" aria-describedby="st-alert-hint" [attr.aria-invalid]="sErr()['defaultAlertThreshold'] ? true : null" />
                <p id="st-alert-hint" class="text-xs text-muted-foreground">Proposé à la création d’un article ; modifiable article par article.</p>
                @if (sErr()['defaultAlertThreshold']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
              </div>
            </div>

            <h3 class="mt-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Caisse</h3>
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="grid gap-1.5">
                <label for="st-disc" class="text-sm font-medium">Remise maximale par ligne (%)</label>
                <input id="st-disc" inputmode="decimal" [class]="field + ' font-mono'" [value]="s().maxDiscountRate" (input)="setS('maxDiscountRate', $event)"
                  aria-describedby="st-disc-hint" [attr.aria-invalid]="sErr()['maxDiscountRate'] ? true : null" />
                <p id="st-disc-hint" class="text-xs text-muted-foreground">Accordée par un gérant ou un administrateur ; 0 = aucune remise.</p>
                @if (sErr()['maxDiscountRate']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
              </div>
              <div class="grid gap-1.5">
                <label for="st-tol" class="text-sm font-medium">Tolérance d’écart de caisse (FCFA)</label>
                <input id="st-tol" inputmode="numeric" [class]="field + ' font-mono'" [value]="s().cashDifferenceTolerance" (input)="setS('cashDifferenceTolerance', $event)"
                  aria-describedby="st-tol-hint" [attr.aria-invalid]="sErr()['cashDifferenceTolerance'] ? true : null" />
                <p id="st-tol-hint" class="text-xs text-muted-foreground">Au-delà, la clôture est signalée en alerte.</p>
                @if (sErr()['cashDifferenceTolerance']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
              </div>
              <div class="grid gap-1.5">
                <label for="st-float" class="text-sm font-medium">Fond de caisse minimum (FCFA)</label>
                <input id="st-float" inputmode="numeric" [class]="field + ' font-mono'" [value]="s().minOpeningFloat" (input)="setS('minOpeningFloat', $event)"
                  [attr.aria-invalid]="sErr()['minOpeningFloat'] ? true : null" />
                @if (sErr()['minOpeningFloat']; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
              </div>
              <div class="grid gap-1.5 sm:col-span-2">
                <label for="st-footer" class="text-sm font-medium">Pied de ticket</label>
                <textarea id="st-footer" rows="2" maxlength="160" [class]="field + ' h-auto py-2'" (input)="setS('receiptFooter', $event)">{{ s().receiptFooter }}</textarea>
                <p class="text-xs text-muted-foreground">Imprimé en bas de chaque ticket de caisse.</p>
              </div>
            </div>

            @if (sMsg(); as m) { <p role="status" class="text-sm" [class.text-success-soft-foreground]="m.ok" [class.text-destructive]="!m.ok">{{ m.text }}</p> }
            @if (canEdit()) {
              <div class="flex justify-end"><button type="submit" [class]="btnPrimary" [disabled]="saving()">Enregistrer les règles</button></div>
            }
          </fieldset>
        </form>

        <!-- Société -->
        <form (submit)="saveCompany($event)" novalidate class="rounded-lg border bg-card">
          <fieldset [disabled]="!canEdit()" class="grid gap-4 p-5">
            <legend class="sr-only">Identité de la société</legend>
            <div>
              <h2 class="font-semibold">Identité de la société</h2>
              <p class="text-sm text-muted-foreground">Imprimée en tête des tickets et des factures.</p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              @for (f of companyFields; track f.key) {
                <div class="grid gap-1.5" [class.sm:col-span-2]="f.wide">
                  <label [for]="'co-' + f.key" class="text-sm font-medium">{{ f.label }}</label>
                  <input [id]="'co-' + f.key" [class]="field" [value]="c()[f.key]" (input)="setC(f.key, $event)" [attr.placeholder]="f.placeholder ?? null"
                    [attr.aria-invalid]="cErr()[f.key] ? true : null" />
                  @if (cErr()[f.key]; as e) { <p role="alert" class="text-xs text-destructive">{{ e }}</p> }
                </div>
              }
            </div>
            @if (cMsg(); as m) { <p role="status" class="text-sm" [class.text-success-soft-foreground]="m.ok" [class.text-destructive]="!m.ok">{{ m.text }}</p> }
            @if (canEdit()) {
              <div class="flex justify-end"><button type="submit" [class]="btnPrimary" [disabled]="saving()">Enregistrer la société</button></div>
            }
          </fieldset>
        </form>
      </div>

      <section class="rounded-lg border bg-card p-5 text-sm">
        <h2 class="mb-2 font-semibold">Ce qui est appliqué automatiquement</h2>
        <ul class="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>Une remise supérieure à <strong class="text-foreground">{{ savedSettings()?.maxDiscountRate }} %</strong> est refusée par le serveur, même si l’écran est contourné.</li>
          <li>Une caisse ne s’ouvre pas avec moins de <strong class="text-foreground">{{ savedSettings()?.minOpeningFloat | xof }}</strong> de fond.</li>
          <li>Un écart de caisse au-delà de <strong class="text-foreground">{{ savedSettings()?.cashDifferenceTolerance | xof }}</strong> apparaît en alerte (vue d’ensemble, caisses).</li>
          <li>Un article passe « stock bas » quand sa quantité atteint son seuil d’alerte, et « rupture » à zéro.</li>
        </ul>
      </section>
    </div>
  `,
})
export class Settings {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);
  private readonly store = inject(SessionStore);

  protected readonly canEdit = computed(() => can(this.store.user()?.role, 'manageSettings'));
  protected readonly field = field;
  protected readonly btnPrimary = btnPrimary;

  private readonly settingsRes = httpResource<AppSettings>(() => `${this.base}/settings`);
  private readonly companyRes = httpResource<CompanyInfo>(() => `${this.base}/company`);
  protected readonly savedSettings = computed(() => this.settingsRes.value());

  protected readonly s = signal<SettingsForm>({
    defaultVatRate: '18', defaultAlertThreshold: '', maxDiscountRate: '', cashDifferenceTolerance: '', minOpeningFloat: '', receiptFooter: '',
  });
  protected readonly c = signal<CompanyForm>({ name: '', legalForm: '', ninea: '', rccm: '', address: '', phone: '', email: '' });
  protected readonly sErr = signal<Record<string, string>>({});
  protected readonly cErr = signal<Record<string, string>>({});
  protected readonly sMsg = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly cMsg = signal<{ ok: boolean; text: string } | null>(null);
  protected readonly saving = signal(false);

  protected readonly companyFields: { key: keyof CompanyInfo; label: string; wide?: boolean; placeholder?: string }[] = [
    { key: 'name', label: 'Raison sociale', wide: true },
    { key: 'legalForm', label: 'Forme juridique', placeholder: 'SARL, SUARL, SA…' },
    { key: 'phone', label: 'Téléphone', placeholder: '+221 …' },
    { key: 'ninea', label: 'NINEA' },
    { key: 'rccm', label: 'RCCM', placeholder: 'SN-DKR-…' },
    { key: 'address', label: 'Adresse', wide: true },
    { key: 'email', label: 'E-mail', wide: true },
  ];

  constructor() {
    // Remplit les formulaires quand les données arrivent.
    effect(() => {
      const v = this.settingsRes.value();
      if (v) this.s.set(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x)])) as SettingsForm);
    });
    effect(() => {
      const v = this.companyRes.value();
      if (v) this.c.set(Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x ?? ''])) as CompanyForm);
    });
  }

  protected setS(key: keyof AppSettings, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.s.update((f) => ({ ...f, [key]: value }));
  }

  protected setC(key: keyof CompanyInfo, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.c.update((f) => ({ ...f, [key]: value }));
  }

  protected async saveSettings(e: Event) {
    e.preventDefault();
    const f = this.s();
    const n = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.').replace(/\s/g, '')));
    const parsed = settingsUpdateSchema.safeParse({
      defaultVatRate: n(f.defaultVatRate),
      defaultAlertThreshold: n(f.defaultAlertThreshold),
      maxDiscountRate: n(f.maxDiscountRate),
      cashDifferenceTolerance: n(f.cashDifferenceTolerance),
      minOpeningFloat: n(f.minOpeningFloat),
      receiptFooter: f.receiptFooter,
    });
    this.sMsg.set(null);
    if (!parsed.success) {
      this.sErr.set(issuesToMap(parsed.error.issues));
      return;
    }
    this.sErr.set({});
    await this.run(() => firstValueFrom(this.http.patch<AppSettings>(`${this.base}/settings`, parsed.data)), this.sMsg, () => this.settingsRes.reload());
  }

  protected async saveCompany(e: Event) {
    e.preventDefault();
    const parsed = companyUpdateSchema.safeParse(this.c());
    this.cMsg.set(null);
    if (!parsed.success) {
      this.cErr.set(issuesToMap(parsed.error.issues));
      return;
    }
    this.cErr.set({});
    await this.run(() => firstValueFrom(this.http.patch<CompanyInfo>(`${this.base}/company`, parsed.data)), this.cMsg, () => this.companyRes.reload());
  }

  private async run(call: () => Promise<unknown>, msg: typeof this.sMsg, reload: () => void) {
    this.saving.set(true);
    try {
      await call();
      reload();
      msg.set({ ok: true, text: 'Enregistré.' });
    } catch (err) {
      msg.set({ ok: false, text: apiMessage(err) });
    } finally {
      this.saving.set(false);
    }
  }
}
