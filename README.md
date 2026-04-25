# SaaS Plans and Subscriptions Demo

NestJS + Prisma demo project for:

- user registration and account verification
- tenant bootstrap
- free trial onboarding
- standard paid plan upgrades and renewals
- enterprise plan request and admin approval flow
- quota enforcement and subscription lifecycle handling

## Requirements

- Node.js 20+
- `pnpm`
- PostgreSQL
- a `.env` file based on `.env.example`

Main environment keys are defined in `.env.example`:

- app and port config
- `DATABASE_URL`
- JWT secrets and expirations
- `HASH_SECRET`
- Tap payment gateway config
- Swagger basic auth credentials
- seed admin credentials

## Install

```bash
pnpm install
cp .env.example .env
```

Update `.env` before running the app, especially:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_VERIFICATION_TOKEN_SECRET`
- `HASH_SECRET`
- `TAP_PAYMENT_*`

For local Tap testing, edit `TAP_PAYMENT_REDIRECT_URL` so it uses a public tunnel back to your local app, for example a free `ngrok` URL that forwards to `http://localhost:3000`.

You can leave the other `TAP_PAYMENT_*` keys as in the `.env.example` file because it is the official testing keys.

## Database

Run migrations:

```bash
pnpm prisma migrate dev
```

Seed the database:

```bash
pnpm prisma db seed
```

The seed creates:

- the default standard plans
- one admin user from `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`

Prisma configuration lives in `prisma.config.ts`, and the schema is split under `prisma/schema/`.

## Run

Development:

```bash
pnpm start:dev
```

Production build:

```bash
pnpm build
pnpm start:prod
```

Default local API URL:

```text
http://localhost:3000/v1
```

Swagger:

```text
http://localhost:3000/api-docs
```

Swagger is protected with basic auth using `SWAGGER_USER` and `SWAGGER_PASSWORD`.

## Docs

Detailed feature docs are available in `docs/`:

- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATION_FEATURE.md`
- `docs/PLANS_SUBSCRIPTIONS_FEATURE.md`
- `docs/ENTERPRISE_PLAN_REQUEST_FEATURE.md`

## First-Run Guide

### 1. Create the first user and tenant

Call:

```text
POST /v1/auth/sign-up
```

Example payload:

```json
{
  "fullName": "First User",
  "email": "user@example.com",
  "password": "12345678",
  "tenant": {
    "name": "first-tenant"
  }
}
```

This creates:

- one user
- one tenant owned by that user
- one tenant usage row
- one verification token response

### 2. Verify the account

Use the returned `verificationToken` with:

```text
POST /v1/auth/verify-verification-token
```

Example payload:

```json
{
  "verificationToken": "TOKEN_FROM_SIGN_UP",
  "code": "OTP_CODE"
}
```

Notes:

- the verification code is currently logged by the app for local testing
- the verification code in local/development environment is `111111`
- successful verification issues the access token
- successful verification also starts the tenant free-trial subscription automatically

### 3. Sign in

If needed, sign in with:

```text
POST /v1/auth/sign-in
```

Example payload:

```json
{
  "email": "user@example.com",
  "password": "12345678"
}
```

Use the returned bearer token for authenticated routes.

### 4. Upgrade to a standard paid plan

List public standard plans:

```text
GET /v1/billing/plans
```

Upgrade:

```text
POST /v1/billing/plan-upgrade
```

Example payload:

```json
{
  "planId": "STANDARD_PLAN_ID",
  "billingCycle": "monthly"
}
```

The API returns a `transactionUrl` for the payment step. Final subscription activation happens after the payment webhook is processed.

### 5. Or request an enterprise plan

Create a request:

```text
POST /v1/enterprise-plan-requests
```

Example payload:

```json
{
  "title": "Need custom enterprise plan",
  "description": "We need higher quotas and custom pricing.",
  "expectedProjects": 200,
  "expectedUsers": 100,
  "expectedSessions": 500,
  "expectedRequests": 100000
}
```

Admin flow after that:

1. review or reject the request from `dashboard/enterprise-plan-requests`
2. approve and create a tenant-private enterprise plan
3. tenant lists available enterprise plans with `GET /v1/tenants/enterprise-plans`
4. tenant subscribes with `POST /v1/billing/enterprise-plan-subscribe`

## Useful Commands

```bash
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
```
