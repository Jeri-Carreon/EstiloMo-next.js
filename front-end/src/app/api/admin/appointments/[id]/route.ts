import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(
            authOptions
        );

        if (
            !session?.user?.email ||
            !["OWNER", "RECEPTIONIST"].includes(session.user.role)
        ) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Missing appointment id" },
                { status: 400 }
            );
        }

        let {
            appointmentCode,
            customerCode,
            customerName,
            schedule,
            barberName
        
        }