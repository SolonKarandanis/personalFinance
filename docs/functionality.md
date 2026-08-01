# Functionality

Tracks what's actually built vs. what's still planned. See `decisions.md` for the architecture/stack reasoning behind these choices.

## Implemented

### Infrastructure
- Turborepo monorepo (`api` = NestJS, `frontend` = Angular 22), pnpm workspace, shared `dev`/`build`/`lint`/`test` pipeline.
- Postgres connection via TypeORM (`192.168.1.6:5432/financetracker`), migration-based schema (`synchronize: false`), CLI scripts (`migration:generate`/`run`/`revert`).
- Node pinned to 24.18.1 via `.nvmrc` (required by Angular 22).

### Data model
- Entities: `User`, `Account`, `Category` (with subcategories), `Transaction` (with transfer-pairing), `Budget`.
- PK convention across all entities: integer auto-increment `id` (internal, used for all FK relations) + `domainId` UUID (`gen_random_uuid()`, unique — the external-facing identifier).
- `Transaction` has `source`/`externalId`/`isPending` fields, ready for future CSV import/Plaid sync (not built yet — see below).
- `User.status` (`active`/`deactivated`) enforced at login and refresh.

### Auth (`/auth`)
- `POST /auth/register` — creates a user, sets the refresh token cookie, returns `{ accessToken }`.
- `POST /auth/login` — Passport local strategy (email/password), same cookie + response shape as register.
- `POST /auth/refresh` — reads the refresh token from the cookie (not the body), rotates it, sets the new cookie, returns a new `{ accessToken }`. Old refresh tokens are invalidated (SHA-256 hash + constant-time compare, not bcrypt — see decisions.md for why).
- `POST /auth/logout` — revokes the stored refresh token server-side and clears the cookie client-side.
- Deactivated users are rejected at login and refresh (403).
- **Token transport**: refresh token lives in an httpOnly cookie (`sameSite: strict`, scoped to `/auth/refresh`, `secure` in production) — never touched by JS. Access token stays in the JSON response body / `Authorization: Bearer` header, unchanged. See decisions.md for the reasoning. Requires `cookie-parser` + CORS with `credentials: true` (wired in `main.ts`); `CORS_ORIGIN` env var (default `http://localhost:4200`) sets the allowed origin.

### User management (`/users`)
- `GET /users/account` — caller's own profile (derived from JWT), returns `UserDto`.
- `PATCH /users/:domainId` — update `firstName`/`lastName`.
- `PATCH /users/:domainId/password` — change password (requires current password; revokes the stored refresh token on success).
- `PATCH /users/:domainId/activate` / `PATCH /users/:domainId/deactivate` — set account status.
- **Ownership enforcement**: `OwnDomainIdGuard` (stacked after `JwtAuthGuard` on all four `:domainId` routes) checks the JWT's `domainId` claim against the URL's `:domainId` and 403s on mismatch — a user can only act on their own account. `domainId` is now embedded directly in the access/refresh token payload (alongside `sub`/`email`) so this check costs no extra DB query. Verified with two separate users: cross-user access 403s, self-access succeeds.

### Accounts (`/accounts`)
- `POST /accounts` — create (`name`, `type`, optional `institution`/`initialBalance`).
- `GET /accounts` — list all of the caller's accounts.
- `GET /accounts/:domainId` / `PATCH /accounts/:domainId` — get/update one.
- `DELETE /accounts/:domainId` — archives (`isArchived = true`), never a hard delete — `Transaction.account` cascades on delete, so a real DELETE would silently wipe transaction history.
- `Account.currentBalance` is cached, not computed on read, and kept in sync entirely by Postgres triggers (not application code) — see `decisions.md`. Verified through the real API: creating with an `initialBalance` seeds `currentBalance` to match, editing `initialBalance` shifts `currentBalance` by the same delta.
- **Ownership**: no guard here (unlike Users) — every service method takes `userId` from the JWT and scopes the query by `{ domainId, userId }` together, so another user's `domainId` returns 404, not 403. Verified with two users.

### Categories (`/categories`)
- `POST /categories` — create (`name`, `type`, optional `parentDomainId`/`icon`/`color`).
- `GET /categories` / `GET /categories/:domainId` — list/get, visible set is the caller's own categories **plus every system default** (`userId IS NULL`).
- `PATCH /categories/:domainId` — update `name`/`icon`/`color` only; `type` and `parentDomainId` aren't updatable post-creation (would need cascading re-validation of children, not worth the complexity yet).
- `DELETE /categories/:domainId` — a real hard delete, unlike Accounts: `Transaction.category` is already `onDelete: SET NULL`, so deleting a category can't destroy transaction data, only uncategorize it.
- **Ownership split**: reads use `{ domainId, userId } OR { domainId, userId: NULL }`; writes (`update`/`remove`) use `{ domainId, userId }` only — a system default can never be edited or deleted through this API, by anyone, including whoever's "using" it. Verified: writes on defaults 404 for every user, cross-user writes on custom categories 404.
- **Subcategories**: capped at one level (a category with a `parentId` can't itself be a parent — rejected with 400), child's `type` must match the parent's `type` (400 on mismatch), and the parent must be a system default or belong to the same user (cross-user parenting 404s). All four rules verified end-to-end.
- **Default categories**: 17 starter income/expense categories (`SeedDefaultCategories` migration) + 4 transfer defaults — Savings Transfer, Investment Transfer, Debt Payment, Credit Card Payment (`SeedTransferDefaultCategories` migration, run separately because Postgres won't let a newly-added enum value be used in the same transaction that added it — see decisions.md). All plain `INSERT`s, `userId` left `NULL`, no runtime seeding logic.
- `CategoryDto.isSystemDefault` tells clients which categories to hide edit/delete affordances for.
- `CategoryType` has three values — `income`, `expense`, `transfer` — added specifically so `Transaction.type` can validate against `Category.type` with one uniform rule (no special-casing transfers as "never categorized") once Transactions is built. See decisions.md.

## Planned / not yet implemented

- **Frontend**: still the default Angular scaffold — no login/register screens, no dashboard, no routing/guards, no HTTP client wiring for the API yet.
- **Transaction/Budget CRUD**: entities exist, no controllers/services yet. `Transaction` will need the same `{ domainId, userId }` scoping pattern as Accounts/Categories, the transfer-pairing logic (atomic two-row create via `EntityManager`/`dataSource.transaction()`), and — now decided — a `category.type === transaction.type` check on create/update (rejecting the mismatch, not just discouraging it in the UI). `CategoryType.TRANSFER` exists specifically so this rule needs no special case for transfers.
- **Dashboard/reporting**: the actual point of the app — spending by category, budget vs. actual, balances over time. Needs Transactions/Budgets CRUD first.
- **CSV import / Plaid bank sync**: schema is ready (`source`, `externalId`, `isPending` on `Transaction`), no import/sync logic written. Will exercise the balance triggers as a new write path — that's exactly why triggers were chosen over application-level recalculation.
- **Shared types package**: discussed early on (a `packages/shared-types` for DTOs shared between `api` and `frontend`) but never set up.
- **Roles**: no roles concept (e.g., admin) exists yet — every authorization check so far is "must be the resource's own owner," nothing more granular.
- **Password reset / email verification**: not started.
- **Multi-session refresh tokens**: currently one `hashedRefreshToken` per user (single active session) — no per-device session tracking.
- **Tests**: Nest's default Jest scaffold exists, but no unit/e2e tests have been written for any of the custom auth/users/entity code yet.
