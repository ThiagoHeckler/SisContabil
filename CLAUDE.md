# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

Two independent apps in one repo, not a monorepo build system — no shared tooling, no shared package.json:

- `siscontabil-api/` — Laravel 13 (PHP 8.3) API. Owns exactly one domain: syncing and serving the official NCM (Nomenclatura Comum do Mercosul) table from the Brazilian government's Siscomex API.
- `siscontabil-web/` — React 18 + Vite SPA. The actual application: calculators/tools for Brazilian tax accounting (ICMS and PIS/COFINS). Most of its data lives in the browser's `localStorage`, not a database — the Laravel API is only consulted for the official NCM lookup/sync feature.

The two only talk to each other over HTTP: the SPA calls `http://localhost:8000/api` (configurable via `VITE_API_URL`) for NCM search/sync endpoints. Everything else in the SPA (DIFAL calc, NF-e conversion, user-registered NCM fiscal data) is self-contained client-side logic with no backend persistence.

## Commands

### API (`siscontabil-api/`)
```bash
composer install
cp .env.example .env && php artisan key:generate   # first-time setup
php artisan migrate                                  # uses SQLite by default (DB_CONNECTION=sqlite)

composer dev            # runs server + queue listener + pail logs + vite concurrently
php artisan serve       # API only, http://localhost:8000

composer test           # clears config cache, then `php artisan test`
php artisan test --filter=TestName    # run a single test
php artisan test tests/Feature/SomeTest.php

php artisan ncm:sincronizar    # manually trigger the NCM sync from Siscomex (also runs weekly via Schedule, Mondays 06:00 — routes/console.php)
```
Only the default Laravel example tests exist under `tests/` (`ExampleTest.php` in `Feature`/`Unit`) — no feature-specific test coverage yet for the NCM sync flow.

### Web (`siscontabil-web/`)
```bash
npm install
npm run dev        # Vite dev server, http://localhost:5173
npm run build
npm run preview
```
No test runner or linter is configured in this package. `xlsx` (SheetJS) is pinned to a CDN tarball (`https://cdn.sheetjs.com/...`) instead of the npm registry version — the last npm-published release (0.18.5) has unpatched high-severity advisories (prototype pollution, ReDoS); the CDN build is the officially patched one. Don't `npm audit fix` this back to the registry version.

### Running both together
The web app expects the API at `http://localhost:8000/api` by default (see `src/hooks/useNcmOficial.js`). Start `php artisan serve` (or `composer dev`) in `siscontabil-api/` before using the "Tabela Oficial" tab in the NCM Consultor page — other pages work with the API offline.

CORS (`siscontabil-api/config/cors.php`) is hardcoded to allow `localhost:5173`/`4173`/`3000` for `api/*` — update this if the dev port changes.

---

## Production Deploy (Docker on Ubuntu Server VM)

The system is deployed on a **Ubuntu Server VM (VirtualBox)** inside a Windows Server environment, accessible on the local network at `http://192.168.1.75:8080`.

### Docker stack (docker-compose.yml at repo root)
- `siscontabil_api` — PHP 8.4-fpm (Laravel API)
- `siscontabil_web` — Node 20 Alpine build → nginx:alpine (React SPA)
- `siscontabil_mysql` — MySQL 8.4 (replaces SQLite in production)
- `siscontabil_nginx` — nginx:alpine reverse proxy on port 8080

### Environment in production
The API container receives env vars directly from `docker-compose.yml` (no `.env` file in the container):
```
DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=siscontabil
DB_USERNAME=siscontabil
DB_PASSWORD=siscontabil@2025
```

### Deploying changes
After committing to GitHub, on the VM:
```bash
cd ~/SisContabil
git pull
docker compose up -d --build
```

### CORS in production
`siscontabil-api/config/cors.php` must allow `http://192.168.1.75:8080` in addition to localhost origins.

---

## Current State & What Needs To Be Done Next

### What exists today
- Full Docker deploy working on `192.168.1.75:8080`
- 15,156 official NCM records migrated from SQLite → MySQL
- All user data (custom NCM fiscal rules, PIS/COFINS rules) still lives in **browser localStorage** — this is a known limitation
- **Authentication implemented** (Laravel Sanctum token auth + React login) — see below.

### Authentication (implemented)
Token-based Sanctum auth (Bearer tokens, not stateful SPA cookies).

**Backend (`siscontabil-api/`):**
- `User` model uses `HasApiTokens`.
- `POST /api/auth/login` (public) — email + password → `{ token, user }` (422 on bad credentials).
- `POST /api/auth/logout` (`auth:sanctum`) — revokes the current token.
- `GET /api/auth/me` (`auth:sanctum`) — returns the authenticated user.
- Admin user seeded via `php artisan db:seed` (`DatabaseSeeder`, idempotent `updateOrCreate`). Credentials come from `ADMIN_NAME`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env` (default `admin@siscontabil.local` / `siscontabil` — change before seeding in production).
- NCM read endpoints (`GET /api/ncm*`) stay public; future data endpoints go behind `auth:sanctum`.

**Frontend (`siscontabil-web/`):**
- `lib/api.js` — central `apiFetch`: injects `Authorization: Bearer {token}` from `localStorage` (key `siscontabil_token`), and on any 401 clears the token and fires an `AUTH_EXPIRED_EVENT`.
- `hooks/useAuth.jsx` — `AuthProvider` + `useAuth()`; validates the stored token via `/auth/me` on boot, exposes `login`/`logout`/`user`/`carregando`.
- `pages/auth/Login.jsx` (`/login`) — email + password form.
- `App.jsx` gates all app routes on `user`; unauthenticated users only reach `/login`.
- Logout button + logged-in user shown in the sidebar (`Layout.jsx`).
- **Note:** `hooks/useNcmOficial.js` has its own `apiFetch` (NCM is public); if NCM endpoints ever require auth, switch it to `lib/api.js`.

### What needs to be implemented (in order)

#### 1. Migrate localStorage data → MySQL (shared across all users)

**Context:** The accounting team shares rules — all users see the same PIS/COFINS and NCM fiscal data. There is no per-user data isolation needed for these registries.

**Data currently in localStorage (to be migrated to MySQL):**

**`siscontabil_pis_cofins_regras`** (key in `pisCofinsStorage.js`):
```json
[
  {
    "ncm": "02013000",
    "descricaoProduto": "CARNE BOVINA",
    "codigoEnquadramento": "...",
    "tabela": "...",
    "lei": "..."
  }
]
```
→ Create table `pis_cofins_regras` in MySQL, CRUD endpoints at `/api/pis-cofins-regras`, protect with `auth:sanctum`.

**`siscontabil_ncm_database`** (key in `ncmStorage.js`):
Custom user annotations over official NCM codes — MVA %, ST antecipação by state, fiscal notes.
→ Create table `ncm_fiscal` in MySQL, CRUD endpoints at `/api/ncm-fiscal`, protect with `auth:sanctum`.

**Migration strategy for existing localStorage data:**
- Add a one-time "Importar dados locais" button in the UI
- It reads localStorage, POSTs to the new API endpoints, then clears localStorage
- Show confirmation before clearing

**Frontend changes:**
- Replace all `localStorage.getItem/setItem` calls in `ncmStorage.js` and `pisCofinsStorage.js` with `fetch` calls to the new API endpoints
- Keep the same data shape — just change the persistence layer
- Handle loading/error states (API calls are async, localStorage is sync)

### What NOT to change
- The DIFAL Calculator — pure client-side computation, no persistence needed
- The NF-e Converter — processes XML files locally, no persistence needed
- The Cálculo ST tab — stateless calculator, no persistence needed
- The official NCM sync pipeline (`ncm:sincronizar`, `SiscomexNcmService`) — working correctly
- The `xlsx` (SheetJS) CDN pin — do not change this

---

## Architecture

### API: NCM sync pipeline
Single vertical slice, `app/Http/Controllers/Api/NcmController.php` → `NcmSincronizacaoService` → `SiscomexNcmService` → `Ncm` model (table `ncm`, SQLite).

- `SiscomexNcmService::baixar()` downloads the full NCM table (JSON) from `https://portalunico.siscomex.gov.br/classif/api/publico/nomenclatura/download/json`. SSL verification can be disabled via `SISCOMEX_VERIFY_SSL=false` in `.env` as a fallback for local PHP installs missing `cacert.pem`.
- `NcmSincronizacaoService::sincronizar()` upserts all records (by `codigo`, chunked at 500) and marks any code *not* present in the latest download as `ativo=false` (soft "revoked" tracking — Brazil's NCM table changes over time and old codes stay queryable but flagged).
- Runs on a weekly schedule (Mondays 06:00, `routes/console.php`) and can be triggered manually via `php artisan ncm:sincronizar` or `POST /api/ncm/sincronizar`.
- Read endpoints: `GET /api/ncm?busca=` (paginated LIKE search over código/descrição, SQLite-compatible), `GET /api/ncm/{codigo}` (exact match), `GET /api/ncm/status` (count + vigência, used by the UI to detect "not synced yet").

### Web: independent tools under one shell
`src/App.jsx` routes to four pages, wrapped by `src/components/Layout.jsx` (sidebar nav). Each page is self-contained; there's no shared state/store between them.

1. **DIFAL Calculator** (`pages/difal/DifalCalculator.jsx`) — computes ICMS DIFAL ("diferencial de alíquota") using the "por dentro" (tax-inclusive base) method specific to Mato Grosso: `BC = (V_oper − ICMS_origem) / (1 − ALQ_interna)`, then `DIFAL = BC × ALQ_interna − V_oper × ALQ_interestadual`. Pure client-side form/computation, no persistence.

2. **NF-e Converter** (`pages/nfe/`) — the most complex piece. Flow: user drops an NF-e XML → `nfeParser.js` parses it via `DOMParser` and applies a **hardcoded tax-rule lookup table** (`TAX_RULES_DB`, keyed by NCM code) to classify each line item and compute ICMS by state (currently PA and GO) → `excelGenerator.js` produces a downloadable `.xls` (SpreadsheetML) with **live Excel formulas** (not just static values) mirroring the same calculation, referenced by relative cell offsets (`RC[-1]`, `RC[-2]`, etc.) so accountants can audit/adjust in Excel.
   - Rule types per NCM+UF: `NORMAL` (no tax), `ICMS-ST` (substituição tributária, applies MVA markup), `DIFERENCIAL`, `DIFAL` (uses a state-specific divisor, e.g. GO's 0.81). Comments in the code note this is a "faithful port" of an original `NFeXmlParser.js`/Java desktop app.
   - GO has display-label remapping: `DIFERENCIAL` shows as `DIFAL` and `ICMS-ST` shows as `NORMAL` for that state (see `getRuleDisplay` in `NfeConverter.jsx` and `displayRule` in `excelGenerator.js` — keep these two in sync if the rule table changes).
   - If the XML already shows `vICMSST > 0` (ST already paid/highlighted on the invoice), the item is tagged `ICMS-ST-PAGO` and skipped from recalculation (see `siscontabil-api`'s sibling commit history — this was a deliberate fix, not the default path).

3. **NCM Consultor** (`pages/ncm/NcmConsultor.jsx`) — five-tab UI:
   - **Tabela Oficial**: searches the Laravel API's synced Siscomex table; lets the user "bookmark" an official NCM and annotate it with fiscal data (MVA %, ST antecipação by state) via `AnotacaoFiscalPanel`, persisted to `localStorage` through `ncmStorage.js` (not sent to the API — the API only serves the read-only official table).
   - **Consulta / Cadastro / Listagem**: CRUD over the same `localStorage`-backed NCM registry, independent of whether the API's official table has ever been synced.
   - **Cálculo ST**: standalone ST calculator (Pará-specific 12%/19% rates: `ICMS = Base × 12%`, `Base_ST = Base × (1 + MVA%)`, `ICMS_ST = Base_ST × 19% − ICMS`), with its own `localStorage` history and Excel export via `lib/spreadsheet.js`.
   - `ncmStorage.js` explicitly notes it "replaces the SQLite of the original Java app" — this is a from-scratch rewrite of a prior desktop tool, so expect UI/domain conventions (Portuguese labels, state abbreviations) to mirror that legacy app rather than a greenfield design.

4. **Ajuste de PIS e COFINS** (`pages/pis-cofins/`) — cross-references a user-uploaded item list against a locally-registered NCM rule table to flag zero-rate PIS/COFINS items with their legal basis. Two tabs:
   - **Processar Tabela**: user uploads a `.xlsx` (Código, NCM, Descrição — header row 1, data from row 2). `pisCofinsParser.js#lerTabelaXlsx` reads it via the `xlsx` (SheetJS) library — the only page in this app that parses spreadsheets rather than just writing them. For each row, `extrairNcm8DaTabela` normalizes the uploaded NCM (nominally 11 digits, but pads to 11 first in case Excel stored it as a number and dropped leading zeros) down to the official 8-digit prefix, looks it up against the registered rules, and annotates the row with `codigoEnquadramento` / `tabela` / `lei` when matched. Output is previewed on-screen and exported via `exportarResultado` (reuses `lib/spreadsheet.js`, same hand-rolled SpreadsheetML approach as the other tools — not the `xlsx` library, which is only used for reading).
   - **Cadastro NCM**: registry of `{ ncm (8 digits), descricaoProduto, codigoEnquadramento, tabela, lei }`, persisted in its own `localStorage` key (`pisCofinsStorage.js`) — deliberately separate from the ICMS/ST registry in `ncmStorage.js` since PIS/COFINS enquadramento is an unrelated classification.

### Key coupling to be aware of
- The NF-e tax rule table (`TAX_RULES_DB` in `nfeParser.js`) and its Excel formula generation (`excelGenerator.js`) must stay consistent: adding/changing a rule type, MVA, or divisor requires updating both the calculation in `applyFiscalRules()` and the corresponding formula string in `generateExcel()`.
- All monetary/percentage parsing in the web app assumes Brazilian formatting (`,` as decimal separator, `.` as thousands separator) — see `parseBRL`/`fmtBRL` duplicated per-page rather than shared.
