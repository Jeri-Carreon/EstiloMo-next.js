# Appointment Process Flow Guide

This document explains the appointment process step by step and maps each important stage to the code that implements it.

## 1. Customer opens the booking experience

Relevant files:

- [front-end/src/app/appointment/page.tsx](../src/app/appointment/page.tsx)
- [front-end/src/components/appointment/ConfirmationStep.tsx](../src/components/appointment/ConfirmationStep.tsx)

What happens:

- The customer enters the appointment flow from the booking page.
- The UI collects the selected service, barber, date, and time information.
- The page prepares the booking state for the confirmation step.

Important code behavior:

- The page initializes the appointment flow and loads the necessary client state.
- The confirmation UI presents the selected booking details before payment.

## 2. Availability is checked

Relevant files:

- [front-end/src/lib/appointmentAvailability.ts](../src/lib/appointmentAvailability.ts)
- [front-end/src/app/api/appointment/barbers/route.ts](../src/app/api/appointment/barbers/route.ts)

What happens:

- The system verifies whether the chosen barber is available at the requested time.
- It checks appointment conflicts, barber schedules, and day-off or absence rules.

Important code behavior:

- The availability helper validates time ranges and rejects overlapping appointments.
- Barber availability endpoints expose the staff options and their availability to the frontend.

## 3. Customer submits the booking request

Relevant file:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)

What happens:

- The customer submits the chosen cart items, payment method, and booking details.
- The request reaches the confirmation API route.

Important code behavior:

- The route authenticates the user through Supabase.
- It validates the booking payload and the selected payment method.
- It rejects invalid or empty cart requests.

## 4. Booking is validated and prepared

Relevant file:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)

What happens:

- The server validates the appointment data and ensures the request is consistent.
- It checks that the selected service and time values are valid.

Important code behavior:

- The route enforces the expected downpayment amount and allowed payment methods.
- It uses shared helpers to ensure appointment times are valid before creating records.

## 5. A transaction is created for the appointment

Relevant files:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)
- [front-end/src/lib/createCode.ts](../src/lib/createCode.ts)

What happens:

- The backend creates a database transaction that includes:
  - a sale record
  - appointment records
  - payment record
  - related booking metadata

Important code behavior:

- The route uses Prisma transactions so the booking remains consistent if any part fails.
- Unique booking and payment codes are generated using shared helper functions.

## 6. A pending payment is created

Relevant file:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)

What happens:

- After the appointment is prepared, the system creates a pending payment entry with the initial downpayment amount.
- The payment is linked to the sale or appointment record.

Important code behavior:

- The payment status starts as pending and is later updated after payment completion.
- The route ensures the downpayment amount matches the expected value.

## 7. PayMongo checkout is created

Relevant file:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)

What happens:

- The system creates a PayMongo checkout session for the downpayment.
- The customer is redirected to an external secure payment flow.

Important code behavior:

- The route builds the checkout URL and session metadata.
- It sends the required payment details to PayMongo and stores the session identifier.

## 8. Payment result is handled

Relevant files:

- [front-end/src/app/api/appointment/payment-status/route.ts](../src/app/api/appointment/payment-status/route.ts)
- [front-end/src/app/api/appointment/expired/route.ts](../src/app/api/appointment/expired/route.ts)

What happens:

- The system checks whether the payment succeeded, failed, or expired.
- The appointment and sale records are updated accordingly.

Important code behavior:

- If the payment is successful, the booking moves forward.
- If the payment expires or is cancelled, the pending sale and appointment are marked as cancelled or rejected.

## 9. Appointment status is finalized

Relevant files:

- [front-end/src/app/api/appointment/confirm/route.ts](../src/app/api/appointment/confirm/route.ts)
- [front-end/src/app/api/appointment/payment-status/route.ts](../src/app/api/appointment/payment-status/route.ts)

What happens:

- Once the payment is resolved, the appointment status is updated from pending to a final state such as scheduled or rejected.

Important code behavior:

- The booking is not considered complete until the transaction and payment state have been reconciled.

## 10. Reminder job runs later

Relevant file:

- [front-end/src/app/api/cron/send-reminders/route.ts](../src/app/api/cron/send-reminders/route.ts)

What happens:

- A scheduled cron job checks upcoming appointments.
- If the appointment is within one hour of start time, the customer receives a reminder email.

Important code behavior:

- The route validates the cron secret before running.
- It sends reminders only for appointments that meet the timing criteria and have not already been reminded.

## Key database entities involved

- Appointment
- Sale
- Payment
- Customer
- Service
- Barber

## Summary

The appointment process is a transaction-driven workflow that combines:

- frontend booking selection
- server-side validation
- database creation
- payment initiation
- payment status reconciliation
- reminder notifications
