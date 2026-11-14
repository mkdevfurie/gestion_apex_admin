# Gestion Apex — Dashboard admin

Back-office d'administration de la gestion commerciale Apex Ledger :
utilisateurs et rôles, dépôts, journal d'audit, paramètres de la société.

**Stack** : Angular 22 (standalone, zoneless, signals) · Tailwind CSS 4 · Vitest

Dépôts liés :

- API NestJS — [gestion_apex_backend](https://github.com/mkdevfurie/gestion_apex_backend)
- Front caisse / stock / factures (React) — [gestion_apex_teste](https://github.com/mkdevfurie/gestion_apex_teste)

## Démarrage

L'API doit tourner sur `http://localhost:3001` (voir le dépôt backend).

```bash
corepack enable pnpm   # une seule fois
pnpm install
pnpm dev               # http://localhost:4300 — /api est relayé vers :3001 (proxy.conf.json)
```

En production, fournir l'URL de l'API via le jeton `API_BASE_URL`
(`src/app/core/api.ts`) et ajouter l'URL de l'admin à `WEB_ORIGIN` côté API.

## Structure

```
src/app/core      API_BASE_URL, HealthService (GET /api/health toutes les 30 s)
src/app/layout    Shell (barre latérale), icônes SVG
src/app/pages     Écrans (chargés à la demande)
src/shared        Calculs partagés (totaux, TVA, formatXof, schémas Zod)
```

`src/shared` existe aussi dans l'API et le front. **Toute modification doit être
reportée dans les trois dépôts.**

## Commandes

```bash
pnpm build | pnpm typecheck
pnpm test --watch=false
```
