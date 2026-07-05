import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import {
  getCustomerAppointmentBusyRanges,
  getDynamicAvailabilityForDate,
  parseTimeRangesParam,
  resolveCandidateIntervalMinutes,
} from "@/lib/appointmentAvailability";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const barberId = searchParams.get("barberId");
    const serviceId = searchParams.get("serviceId");
    const date = searchParams.get("date");

    if (!barberId || !serviceId || !date) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing barberId, serviceId, or date",
        },
        {
          status: 400,
        }
      );
    }

    const service = await db.service.findUnique({
      where: {
        id: serviceId,
      },
      select: {
        durationMinutes: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        {
          ok: false,
          message: "Service not found",
        },
        {
          status: 404,
        }
      );
    }

    const blockedRanges = parseTimeRangesParam(searchParams.get("blockedSlots"));

    if (searchParams.get("customerConflicts") === "1") {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.email) {
        const dbUser = await db.user.findUnique({
          where: {
            email: authUser.email,
          },
          select: {
            email: true,
            customer: {
              select: {
                id: true,
                email: true,
                mobileNumber: true,
              },
            },
          },
        });

        if (dbUser?.customer) {
          const customerBusyRanges = await getCustomerAppointmentBusyRanges(db, {
            customerId: dbUser.customer.id,
            customerEmail:
              dbUser.customer.email || dbUser.email || authUser.email,
            customerMobileNumber: dbUser.customer.mobileNumber,
            date,
          });

          blockedRanges.push(...customerBusyRanges);
        }
      }
    }

    const result = await getDynamicAvailabilityForDate(db, {
      barberId,
      date,
      serviceDurationMinutes: service.durationMinutes,
      candidateIntervalMinutes: resolveCandidateIntervalMinutes(
        searchParams.get("intervalMinutes")
      ),
      blockedRanges,
      breakRanges: parseTimeRangesParam(searchParams.get("breakSlots")),
    });

    if (result.isDisabledDay) {
      return NextResponse.json({
        ok: true,
        availableTimes: [],
        isDisabledDay: true,
      });
    }

    return NextResponse.json({
      ok: true,
      availableTimes: result.availableTimes,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        message: "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}
