import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    let { name, email, message } = 
      await req.json();

    name = (name ?? "").trim();
    email = (email ?? "").trim();
    message = (message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { ok: false, error: "Missing fields"},
        { status: 400 }
      )
    }

    if (name.length > 100) {
      return NextResponse.json(
        { ok: false, error: "Name too long" },
        { status: 400}
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email format" },
        { status: 400 }
      );
    } 

    if (email.length > 254) {
      return NextResponse.json(
        { ok: false, error: "Email is too long" },
        { status: 400 }
      );
    }

    if (message.length > 1000){
      return NextResponse.json(
        { ok: false, error: "Message too long" },
        { status: 400 }
      )
    }
    console.log("Received:", { name, email, message });

    const result = await db.contactUsMessages.create({
      data: {
        name,
        email,
        message,
      },
    });

    return NextResponse.json({ success: true, result });

  } catch (error) {
    console.error("❌ CONTACT API ERROR:", error);

    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}