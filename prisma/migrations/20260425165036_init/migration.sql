-- CreateTable
CREATE TABLE "enterprise_plan_requests" (
    "request_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expected_projects" INTEGER,
    "expected_users" INTEGER,
    "expected_sessions" INTEGER,
    "expected_requests" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "admin_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_plan_requests_pkey" PRIMARY KEY ("request_id")
);

-- CreateTable
CREATE TABLE "enterprise_plan_request_events" (
    "event_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "fromPlanId" UUID,
    "toPlanId" UUID,
    "actor_user_id" UUID,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enterprise_plan_request_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "subscription_payments" (
    "payment_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT,
    "provider_payment_ref" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "raw_payload" JSONB,
    "paid_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "plans" (
    "plan_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "kind" TEXT NOT NULL DEFAULT 'standard',
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "yearly_price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tenant_id" UUID,
    "max_projects" INTEGER NOT NULL DEFAULT 0,
    "max_users" INTEGER NOT NULL DEFAULT 0,
    "max_sessions" INTEGER NOT NULL DEFAULT 0,
    "max_requests" INTEGER NOT NULL DEFAULT 0,
    "trial_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "tenant_subscriptions" (
    "subscription_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trial_ends_at" TIMESTAMPTZ(6),
    "current_period_start" TIMESTAMPTZ(6) NOT NULL,
    "current_period_end" TIMESTAMPTZ(6) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "cancelled_at" TIMESTAMPTZ(6),
    "suspended_at" TIMESTAMPTZ(6),
    "past_due_at" TIMESTAMPTZ(6),
    "last_grace_warning_at" TIMESTAMPTZ(6),
    "pending_plan_id" UUID,
    "pending_plan_effective_at" TIMESTAMPTZ(6),
    "price_snapshot" DECIMAL(10,2),
    "quota_snapshot" JSONB,
    "paymentProvider" TEXT NOT NULL DEFAULT 'tap',
    "tap_customer_id" TEXT,
    "tap_card_id" TEXT,
    "tap_payment_agreement_id" TEXT,
    "latest_payment_id" UUID,
    "billing_cycle" TEXT NOT NULL DEFAULT 'monthly',
    "nextBillingAt" TIMESTAMPTZ(6),
    "lastBillingAt" TIMESTAMPTZ(6),
    "retry_count" SMALLINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_subscriptions_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "tenant_usages" (
    "usage_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "projects_count" INTEGER NOT NULL DEFAULT 0,
    "users_count" INTEGER NOT NULL DEFAULT 0,
    "sessions_count" INTEGER NOT NULL DEFAULT 0,
    "requests_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_usages_pkey" PRIMARY KEY ("usage_id")
);

-- CreateTable
CREATE TABLE "subscription_events" (
    "event_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "fromPlanId" UUID,
    "toPlanId" UUID,
    "actor_user_id" UUID,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "tanant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tanant_id")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "enterprise_plan_requests_status_created_at_idx" ON "enterprise_plan_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_provider_event_id_key" ON "subscription_payments"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_payments_provider_payment_ref_key" ON "subscription_payments"("provider_payment_ref");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "plans_kind_tenant_id_idx" ON "plans"("kind", "tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscriptions_tenant_id_key" ON "tenant_subscriptions"("tenant_id");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_status_nextBillingAt_idx" ON "tenant_subscriptions"("status", "nextBillingAt");

-- CreateIndex
CREATE INDEX "tenant_subscriptions_trial_ends_at_idx" ON "tenant_subscriptions"("trial_ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_usages_tenant_id_key" ON "tenant_usages"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_owner_id_key" ON "tenants"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "enterprise_plan_requests" ADD CONSTRAINT "enterprise_plan_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tanant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprise_plan_request_events" ADD CONSTRAINT "enterprise_plan_request_events_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "enterprise_plan_requests"("request_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_payments" ADD CONSTRAINT "subscription_payments_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions"("subscription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tanant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tanant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_pending_plan_id_fkey" FOREIGN KEY ("pending_plan_id") REFERENCES "plans"("plan_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "tenant_subscriptions_latest_payment_id_fkey" FOREIGN KEY ("latest_payment_id") REFERENCES "subscription_payments"("payment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_usages" ADD CONSTRAINT "tenant_usages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("tanant_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_events" ADD CONSTRAINT "subscription_events_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions"("subscription_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
