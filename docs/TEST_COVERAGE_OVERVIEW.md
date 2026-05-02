# Test Coverage Overview

## Scope

This document summarizes the automated test coverage in the repository across unit, integration, and end-to-end (e2e) layers.

The current test suite covers the subscription, billing, plans, enterprise-plan request, webhook, and access-control flows from three angles:

- **Unit tests**: verify service and guard logic in isolation with Prisma and logger mocks.
- **Integration tests**: verify real database behavior with Prisma against a test database.
- **E2E tests**: verify HTTP routes, auth, webhook handling, and guard behavior through a running NestJS application.

---

## Test structure at a glance

### Unit test files

- `src/subscriptions/subscriptions.service.spec.ts`
- `src/enterprise-plan-requests/enterprise-plan-requests.service.spec.ts`
- `src/billing/webhook/billing-webhook.service.spec.ts`
- `src/common/guards/subscription.guard.spec.ts`
- `src/payment-gateway/tap-payment-provider/tap-payment-provider.service.spec.ts`
- `src/plans/plans.service.spec.ts`

### Integration test files

- `test/subscriptions.integration-spec.ts`

### E2E test files

- `test/app.e2e-spec.ts`

### Shared test support

- `test/test-utils.ts`
- `test/mock-helpers.ts`

These helper files provide Prisma seeding, cleanup, decimal helpers, entity factories, and reusable Jest mocks.

---

## Unit test coverage

Unit tests validate business logic without touching a real database or HTTP server.

### `src/subscriptions/subscriptions.service.spec.ts`

Covers the subscription lifecycle service, including:

- starting a free trial for a new tenant
- requesting an upgrade to a paid plan
- validating upgrade constraints
- activating a subscription after payment success
- deduplicating webhook/payment events by `providerEventId`
- recording failed payments
- processing trial expiration
- moving subscriptions to `PAST_DUE`
- moving subscriptions to `SUSPENDED`
- expiring suspended subscriptions after the allowed window
- finalizing cancellations at period end
- scheduling downgrades
- cancelling subscriptions
- resubscribing suspended subscriptions
- applying scheduled downgrades
- subscription lookup failure cases

This file is the main unit-level coverage for the subscription state machine.

### `src/enterprise-plan-requests/enterprise-plan-requests.service.spec.ts`

Covers the enterprise custom plan request workflow:

- blocking request creation when an open request already exists
- creating a new enterprise request
- reviewing a request as `CONTACTED`
- rejecting review/update attempts for finalized requests
- rejecting plan creation when the request is already rejected
- rejecting duplicate enterprise plan names
- approving a request and creating a private enterprise plan
- best-effort behavior when writing an audit/subscription event fails
- handling missing request lookup results

This test file verifies the admin/customer workflow for custom enterprise plans.

### `src/billing/webhook/billing-webhook.service.spec.ts`

Covers the Tap webhook routing layer:

- routing `CAPTURED` events to subscription activation
- routing `FAILED` events to payment failure handling
- routing `DECLINED` events to payment failure handling
- ignoring webhook events without tenant metadata

This ensures the webhook service correctly dispatches payment outcomes to the subscription service.

### `src/common/guards/subscription.guard.spec.ts`

Covers route protection and quota enforcement:

- rejecting requests that have no tenant context
- rejecting tenants without a subscription
- blocking access to enterprise plans owned by another tenant
- blocking cancelled subscriptions
- allowing valid trialing subscriptions
- rejecting requests when quota is exceeded
- rejecting stale trial access

This file validates access-control logic before controllers and services run.

### `src/payment-gateway/tap-payment-provider/tap-payment-provider.service.spec.ts`

Covers Tap webhook signature validation logic:

- validating a correct webhook payload signature
- rejecting invalid signatures
- rejecting tampered amounts
- rejecting tampered statuses

This protects the payment integration boundary and ensures webhook authenticity checks work as expected.

### `src/plans/plans.service.spec.ts`

Covers plan management behavior:

- preventing duplicate plan names
- creating a new plan successfully
- blocking price changes on free plans
- allowing non-price edits on free plans
- preventing deletion of free plans
- preventing deletion when a plan has subscriptions
- preventing deletion of enterprise-bound plans
- deleting a standard plan with no subscriptions
- listing active standard plans for the landing page
- rejecting updates for missing plans

This gives coverage for admin-facing plan management rules.

---

## Integration test coverage

Integration tests use real Prisma operations against a real test database. They verify that the service logic works with actual persistence, relations, and transactional behavior.

### `test/subscriptions.integration-spec.ts`

This suite covers the full billing workflow at the database level:

- booting a trial subscription and writing a `TRIAL_STARTED` event
- upgrading a trial subscription and activating it through the payment/webhook path
- deduplicating repeated payment events with the same provider event ID
- applying a scheduled downgrade when the effective time has passed
- enforcing quota limits at the service layer
- incrementing resource usage when under quota
- executing the enterprise request workflow
- creating a private enterprise plan from a request
- ensuring enterprise plan ownership isolation between tenants

This is the most important integration suite in the repo because it proves the billing flow works end-to-end at the persistence and service layer, without HTTP.

---

## E2E test coverage

E2E tests run the NestJS application and hit real HTTP endpoints. They validate request/response behavior, authentication, guards, validation, and webhook routes.

### `test/app.e2e-spec.ts`

Covers the public API and billing routes:

- returning only active public plans from `GET /v1/billing/plans`
- allowing admins to create plans with `POST /v1/plans`
- rejecting duplicate plan creation with `POST /v1/plans`
- rejecting non-admin users from creating plans
- returning a checkout URL from `POST /v1/billing/plan-upgrade`
- activating subscriptions through the Tap webhook route
- ignoring duplicate webhook deliveries idempotently
- rejecting invalid webhook signatures
- allowing trialing tenants to access profile routes
- blocking quota-exceeded resource usage
- blocking suspended tenants from mutation routes

This suite verifies the application behaves correctly from a client perspective.

---

## Shared test utilities

### `test/mock-helpers.ts`

Provides reusable mocks for:

- Prisma service
- logger service

These mocks are used by unit tests to isolate logic from external dependencies.

### `test/test-utils.ts`

Provides reusable helpers for:

- cleaning the test database
- seeding standard plans
- creating users, admins, tenants, plans, subscriptions, and usage records
- generating decimal values
- creating access tokens
- delay/poll helpers for async e2e assertions

These helpers keep integration and e2e tests concise and consistent.

---

## What the current coverage gives you

The suite already covers the most important billing scenarios:

- trial activation
- plan upgrades
- payment success and failure
- webhook signature validation
- downgrade scheduling
- cancellation
- suspension and expiration
- enterprise plan requests and approval
- quota enforcement
- route access control
- HTTP-level billing behavior

That means the repo has coverage not just for isolated service logic, but also for the persistence layer and the public API surface.

---

## Coverage notes

A few behaviors are tested more than once on purpose:

- **payment deduplication** is checked in both unit and integration/e2e tests
- **quota enforcement** is checked in guard tests and integration/e2e flows
- **subscription activation** is checked at service, DB, and HTTP levels

That overlap is useful because billing systems are stateful and sensitive to regressions.

---

## Suggested future additions

The current suite is already strong. The next useful additions would be:

- resubscribe flow after suspension at unit and integration level
- `EXPIRED` transition coverage in a cron-focused test
- `TRIAL_EXPIRED` transition coverage in a cron-focused test
- cancellation finalization at the cron level
- recurring renewal cron with Tap saved-card flow
- enterprise plan subscription checkout e2e coverage

---

## Summary

In short:

- **Unit tests** cover service and guard logic in isolation.
- **Integration tests** cover real database behavior and transactional billing flows.
- **E2E tests** cover the public HTTP API, auth, webhook handling, and user-visible behavior.

Together, these tests provide layered coverage for the subscription and billing domain.

---

## ⚠️ Test Database Requirements

To ensure safe and reliable test execution, this project **requires a dedicated test database**.

### ✅ Environment Setup

Before running **integration** or **e2e** tests, make sure:

- A `.env.test` file exists in the root of the repository
- It contains a valid `DATABASE_URL` pointing to a **test database**

Example:

```
DATABASE_URL=postgresql://user:password@localhost:5432/my_test_db?schema=public
```

---

### ⚠️ Important Behavior

- The test database will be **reset (dropped and recreated)** before running:
  - Integration tests
  - End-to-end (e2e) tests
- **Never use your development or production database** in `.env.test`

---

## ▶️ Running Tests

### Unit Tests

```
pnpm test
```

### Integration Tests

```
pnpm test:integration
```

### E2E Tests

```
pnpm test:e2e
```

---

### 🧪 What Happens During Integration/E2E Tests

1. `.env.test` is loaded
2. The system connects to `DATABASE_URL`
3. The database is **reset**
4. Migrations are applied
5. Tests are executed

---

### 🚨 Safety Reminder

Always double-check:

- `.env.test` exists
- `DATABASE_URL` points to a **non-critical database**

Otherwise, you risk **data loss** due to automatic resets.
