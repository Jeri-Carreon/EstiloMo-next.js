import { db } from "@/lib/db";

export const DEFAULT_PENDING_CHECKOUT_EXPIRATION_MINUTES = 5;
export const MAX_PENDING_CHECKOUT_EXPIRATION_MINUTES = 60;

type AppointmentSettingInput = {
  bookingCutoffHours?: number;
  pendingCheckoutExpirationMinutes?: number;
};

/**
 * Validates and normalizes a pending checkout expiration value.
 */
function normalizePendingCheckoutExpirationMinutes(
  value: unknown,
  fallback = DEFAULT_PENDING_CHECKOUT_EXPIRATION_MINUTES
): number {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(
    Math.floor(parsedValue),
    MAX_PENDING_CHECKOUT_EXPIRATION_MINUTES
  );
}

/**
 * Returns the environment-variable value or the hardcoded default.
 *
 * This should only be used when an AppointmentSetting record does not
 * exist yet. Once a database setting exists, the database value takes
 * priority.
 */
function getEnvironmentExpirationFallback(): number {
  return normalizePendingCheckoutExpirationMinutes(
    process.env.PENDING_CHECKOUT_EXPIRATION_MINUTES
  );
}

/**
 * Ensures that only one AppointmentSetting record exists.
 *
 * When multiple records exist, the most recently updated record is retained
 * and older duplicate records are deleted.
 */
export async function ensureSingleAppointmentSetting(
  input?: AppointmentSettingInput
) {
  return db.$transaction(async (tx) => {
    const settings = await tx.appointmentSetting.findMany({
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    const normalizedExpirationInput =
      input?.pendingCheckoutExpirationMinutes !== undefined
        ? normalizePendingCheckoutExpirationMinutes(
            input.pendingCheckoutExpirationMinutes
          )
        : undefined;

    if (settings.length === 0) {
      return tx.appointmentSetting.create({
        data: {
          bookingCutoffHours: input?.bookingCutoffHours ?? 1,
          pendingCheckoutExpirationMinutes:
            normalizedExpirationInput ??
            getEnvironmentExpirationFallback(),
        },
      });
    }

    const [primarySetting, ...duplicateSettings] = settings;

    if (duplicateSettings.length > 0) {
      await tx.appointmentSetting.deleteMany({
        where: {
          id: {
            in: duplicateSettings.map((setting) => setting.id),
          },
        },
      });
    }

    const updateData: {
      bookingCutoffHours?: number;
      pendingCheckoutExpirationMinutes?: number;
    } = {};

    if (
      input?.bookingCutoffHours !== undefined &&
      primarySetting.bookingCutoffHours !== input.bookingCutoffHours
    ) {
      updateData.bookingCutoffHours = input.bookingCutoffHours;
    }

    if (
      normalizedExpirationInput !== undefined &&
      primarySetting.pendingCheckoutExpirationMinutes !==
        normalizedExpirationInput
    ) {
      updateData.pendingCheckoutExpirationMinutes =
        normalizedExpirationInput;
    }

    if (Object.keys(updateData).length > 0) {
      return tx.appointmentSetting.update({
        where: {
          id: primarySetting.id,
        },
        data: updateData,
      });
    }

    return primarySetting;
  });
}

/**
 * Retrieves the pending checkout expiration duration.
 *
 * Priority:
 * 1. AppointmentSetting database value
 * 2. PENDING_CHECKOUT_EXPIRATION_MINUTES environment variable
 * 3. Hardcoded default of 5 minutes
 */
export async function getPendingCheckoutExpirationMinutes(): Promise<number> {
  const setting = await ensureSingleAppointmentSetting();

  return normalizePendingCheckoutExpirationMinutes(
    setting.pendingCheckoutExpirationMinutes,
    getEnvironmentExpirationFallback()
  );
}