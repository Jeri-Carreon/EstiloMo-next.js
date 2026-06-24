import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
    try {
        const services = await db.service.findMany({
            where: {
                isAvailable: true,
            },
            orderBy: {
                sortOrder: "asc",
            },
        });

        return NextResponse.json({ services });

    } catch (error) {
        return NextResponse.json(
            { error: "failed to fetch services" },
            { status: 500 }
        );
    }
}