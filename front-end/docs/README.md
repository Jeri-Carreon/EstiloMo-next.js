# EstiloMo Documentation

This folder contains the current system architecture, core user flows, and implementation notes for the EstiloMo application.

## Documents

- [System Architecture](./system-architecture.md)
- [User and Booking Flows](./booking-and-user-flows.md)
- [Technical Documentation](./technical-documentation.md)

## Project Summary

EstiloMo is a barber-shop management and booking platform built with Next.js, Prisma, PostgreSQL, and Supabase. It supports:

- public storefront and service browsing
- customer registration and authentication
- appointment booking with payment downpayment
- admin dashboards for services, staff, sales, reviews, and loyalty
- automated reminders and reporting

## High-Level Stack

- Frontend: Next.js 16, React 19, Material UI
- Backend/API: Next.js App Router route handlers
- Database: PostgreSQL via Prisma ORM
- Auth: Supabase Auth
- Storage: Supabase Storage (for uploads)
- Payments: PayMongo checkout integration
- Notifications: Resend email delivery and optional Twilio SMS
- Deployment: Docker, Google Cloud Build, Cloud Run
