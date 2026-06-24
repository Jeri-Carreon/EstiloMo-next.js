import { db } from "@/lib/db";

export async function ensureSingleAppointmentSetting(input?: {
  bookingCutoffHours?: number;
}) {
  return db.$transaction(async (tx) => {
    const settings = await tx.appointmentSetting.findMany({
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    if (settings.length === 0) {
      return tx.appointmentSetting.create({
        data: {
          bookingCutoffHours: input?.bookingCutoffHours ?? 1,
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

    if (input?.bookingCutoffHours !== undefined) {
      if (primarySetting.bookingCutoffHours !== input.bookingCutoffHours) {
        return tx.appointmentSetting.update({
          where: { id: primarySetting.id },
          data: { bookingCutoffHours: input.bookingCutoffHours },
        });
      }
    }

    return primarySetting;
  });
}
