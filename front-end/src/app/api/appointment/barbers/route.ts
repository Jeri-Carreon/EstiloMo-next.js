import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const barbers = await db.barber.findMany({
            where: {
                user: {
                    isActive: true,
                },
            },
            orderBy: {
                id: "asc",
            }
        });

        const result = barbers.map((barber) => ({
            id: barber.id,
            name:
                [barber.firstName, barber.lastName].filter(Boolean).join(" ") ||
                barber.email ||
                "Unknown",
        }));

        return NextResponse.json({ barbers: result });
        } catch (error) {
        console.error("GET BARBERS ERROR:", error);    

        return NextResponse.json(
        { error: "Failed to fetch barbers" },
        { status: 500 }
        );
    }
}