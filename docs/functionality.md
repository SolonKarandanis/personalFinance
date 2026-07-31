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
- `POST /auth/register` — creates a user, returns access + refresh tokens.
- `POST /auth/login` — Passport local strategy (email/password), returns tokens.
- `POST /auth/refresh` — rotates access + refresh tokens; old refresh tokens are invalidated (SHA-256 hash + constant-time compare, not bcrypt — see decisions.md for why).
- `POST /auth/logout` — revokes the stored refresh token.
- Deactivated users are rejected at login and refresh (403).

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

## Planned / not yet implemented

- **Frontend**: still the default Angular scaffold — no login/register screens, no dashboard, no routing/guards, no HTTP client wiring for the API yet.
- **Category/Transaction/Budget CRUD**: entities exist, no controllers/services yet. `Transaction` will need to apply the same `{ domainId, userId }` scoping pattern as Accounts, plus the transfer-pairing logic (atomic two-row create via `EntityManager`/`dataSource.transaction()`) discussed but not yet built.
- **Dashboard/reporting**: the actual point of the app — spending by category, budget vs. actual, balances over time. Needs Transactions/Budgets CRUD first.
- **CSV import / Plaid bank sync**: schema is ready (`source`, `externalId`, `isPending` on `Transaction`), no import/sync logic written. Will exercise the balance triggers as a new write path — that's exactly why triggers were chosen over application-level recalculation.
- **Shared types package**: discussed early on (a `packages/shared-types` for DTOs shared between `api` and `frontend`) but never set up.
- **Roles**: no roles concept (e.g., admin) exists yet — every authorization check so far is "must be the resource's own owner," nothing more granular.
- **Password reset / email verification**: not started.
- **Multi-session refresh tokens**: currently one `hashedRefreshToken` per user (single active session) — no per-device session tracking.
- **Tests**: Nest's default Jest scaffold exists, but no unit/e2e tests have been written for any of the custom auth/users/entity code yet.
