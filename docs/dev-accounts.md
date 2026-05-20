# Dev Accounts

Local development only. These accounts are created by running `scripts/seed-dev.sh`.

| Email | Password |
|---|---|
| alice@test.com | Alice1!dev |
| bob@test.com | Bob1!dev |
| charlie@test.com | Charlie1!dev |

## Admin Account

`Admin:Email` in `appsettings.Development.json` is set to `alice@test.com`. Alice is promoted to `Admin` + `AiUser` on backend startup automatically.

| Email | Password | Roles |
|---|---|---|
| alice@test.com | Alice1!dev | Admin, AiUser |

## Usage

Backend and DB must be running first, then:

    bash scripts/seed-dev.sh

Re-running the script wipes and recreates all three accounts cleanly.

See current accounts:

PGPASSWORD="$POSTGRES_PASSWORD" psql -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c 'SELECT "Email", "EmailConfirmed" FROM "AspNetUsers";'
