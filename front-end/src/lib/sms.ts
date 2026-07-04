export function toE164PH(mobileNumber: string) {
  const digits = mobileNumber.replace(/\D/g, "");
  if (digits.startsWith("09") && digits.length === 11) {
    return `+63${digits.slice(1)}`;
  }
  return digits.startsWith("+") ? digits : `+${digits}`;
}

export async function sendSMS(
  recipient: string,
  content: string,
  metadata?: Record<string, string>
) {
  const secret = process.env.UNISMS_API_SECRET!;
  const senderId = process.env.UNISMS_SENDER_ID!;

  const response = await fetch("https://unismsapi.com/api/sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      recipient,
      content,
      sender_id: senderId,
      ...(metadata ? { metadata } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`UniSMS send failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}