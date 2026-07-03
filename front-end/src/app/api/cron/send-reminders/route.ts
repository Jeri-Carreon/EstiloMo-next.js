import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}


export async function GET(req: Request) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Protect this route — only your scheduler should be able to call it
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch active appointments today/tomorrow that haven't been reminded
  const candidates = await db.appointment.findMany({
    where: {
      status: { in: ["SCHEDULED"] },
      reminderSent: false,
      appointmentDate: {
        gte: new Date(now.toDateString()),
      },
    },
    include: {
      customer: { select: { email: true, firstName: true } },
      service: { select: { name: true } },
      barber: { select: { firstName: true, lastName: true } },
    },
  });

  // Filter to ones starting within the next hour
  const dueNow = candidates.filter((appt) => {
    const start = new Date(appt.appointmentDate);
    start.setMinutes(start.getMinutes() + appt.startMinutes);
    const diffMinutes = (start.getTime() - now.getTime()) / 60000;
    return diffMinutes > 0 && diffMinutes <= 60;
  });

  let sentCount = 0;

  for (const appt of dueNow) {
    if (!appt.customer.email) continue;

    const start = new Date(appt.appointmentDate);
    start.setMinutes(start.getMinutes() + appt.startMinutes);

    try {
      await resend.emails.send({
        from: "noreply@mail.codeegoh.com",
        to: appt.customer.email,
        subject: "Your appointment is in 1 hour",
        html: `<p>Hi ${appt.customer.firstName}, this is a reminder that your ${appt.service.name} appointment with ${appt.barber.firstName} is at ${minutesToTime(appt.startMinutes)} today.</p>`,
      });

      await db.appointment.update({
        where: { id: appt.id },
        data: { reminderSent: true },
      });

      sentCount++;
    } catch (err) {
      console.error(`Failed to send reminder for appointment ${appt.id}:`, err);
    }
  }

  return NextResponse.json({ checked: candidates.length, sent: sentCount });
}