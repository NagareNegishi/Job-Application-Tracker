# Interview Reminder Email

Emails a user the morning before any job with `interviewAt` set to the next day.

## Key Decisions

- Delivery: via existing `IEmailService` (`LogEmailService` dev / `ResendEmailService` prod)
- Trigger: scheduled backend job (mechanism TBD — Hangfire, hosted service, or external cron)
- Scope: one email per user per day listing all interviews the next day
- Opt-out: TBD — may reuse `UserPreferences` JSON column

## Status

Early planning — no implementation started.
