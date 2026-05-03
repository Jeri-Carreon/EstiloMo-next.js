import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { name, email, message } = await req.json();

    console.log("📩 Received:", { name, email, message });

    const result = await db.contactUsMessages.create({
      data: {
        name,
        email,
        message,
      },
    });

    return Response.json({ success: true, result });

  } catch (error) {
    console.error("❌ CONTACT API ERROR:", error);

    return Response.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}