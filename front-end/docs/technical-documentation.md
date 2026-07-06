# Technical Documentation

## 1. Local Development

### Prerequisites

- Node.js 22+
- npm
- PostgreSQL database
- Supabase project
- PayMongo credentials (optional for payment testing)
- Resend API key (optional for email reminders)

### Setup

```bash
cd front-end
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

The app will run on http://localhost:3000.

## 2. Project Structure

```text
front-end/
  docs/                  # documentation
  prisma/                # Prisma schema and migrations
  public/                # static assets
  src/
    app/                 # App Router pages and API routes
    components/          # shared UI components
    lib/                 # shared utilities, Prisma, Supabase, payment helpers
    sections/            # landing-page sections
```

## 3. Environment Variables

The following environment variables are expected by the application:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- DATABASE_URL
- DIRECT_URL
- APP_URL or NEXT_PUBLIC_APP_URL
- PAYMONGO_SECRET_KEY
- OPENAI_API_KEY
- RESEND_API_KEY
- CRON_SECRET
- PENDING_CHECKOUT_EXPIRATION_MINUTES

## 4. Key Implementation Notes

### Prisma

- Prisma is the single source of truth for the relational schema.
- The schema includes customer, barber, appointment, sale, payment, loyalty, and review models.
- Migrations live in prisma/migrations.

### Supabase

- Supabase Auth is used for authentication and session management.
- Server-side clients are created with the SSR package for route handlers.
- A service-role client is used for privileged operations such as user creation and profile updates.

### Payment Flow

- The booking confirmation API creates a pending sale and payment record.
- A PayMongo checkout session is created for the downpayment.
- Payment status is later updated through the appointment payment-status route.

### Cron Jobs

- The reminder job is exposed through src/app/api/cron/send-reminders/route.ts.
- It requires a bearer token matching CRON_SECRET.
- It finds appointments that are due soon and emails the customer.

## 5. Build and Deploy

### Build

```bash
npm run build
```

### Lint

```bash
npm run lint
```

### Container Build

The Docker image is defined in Dockerfile and is designed for deployment on Cloud Run.

### Cloud Build

The deployment pipeline is defined in cloudbuild.yaml. It:

1. checks required substitutions
2. builds the container image
3. pushes it to Artifact Registry
4. deploys it to Cloud Run with runtime environment variables

## 6. Security Considerations

- Protected routes are enforced with middleware and Supabase auth state.
- Sensitive operations are handled in server-side route handlers.
- Payment and authentication secrets should remain server-only.
- Admin routes should be protected by role checks in their handlers.

## 7. Suggested Next Improvements

- Add automated integration tests for auth, booking, and payment flows
- Add OpenAPI documentation for public and admin APIs
- Introduce a dedicated backend service if the business logic grows further
- Add structured monitoring and alerting for failed payment and reminder jobs
