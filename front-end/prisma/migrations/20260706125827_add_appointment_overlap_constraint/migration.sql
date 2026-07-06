-- This is manual add

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT no_overlapping_appointments
EXCLUDE USING gist (
  "barberId" WITH =,
  "appointmentDate" WITH =,
  int4range("startMinutes", "endMinutes", '[)') WITH &&
)
WHERE (status IN ('PENDING', 'SCHEDULED'));