import { NextResponse } from "next/server";

import { db } from "@/lib/db";

function formatPeso(value: unknown) {
  const amount = Number(value || 0);

  return `₱${amount.toLocaleString("en-PH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export async function GET() {
  try {
    const services = await db.service.findMany({
      where: {
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
        sortOrder: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });

    const responseText =
      services.length > 0
        ? `Here are our available services:\n\n${services
            .map((service, index) => {
              const duration = service.durationMinutes
                ? ` - ${service.durationMinutes} mins`
                : "";

              return `${index + 1}. ${service.name} - ${formatPeso(
                service.price
              )}${duration}`;
            })
            .join("\n")}`
        : "No available services are listed right now.";

    return NextResponse.json({
      ok: true,
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: Number(service.price || 0),
        priceLabel: formatPeso(service.price),
      })),
      responseText,
    });
  } catch (error) {
    console.error("CHATBOT FETCH SERVICES ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to fetch services.",
      },
      {
        status: 500,
      }
    );
  }
}
