import { NextRequest, NextResponse } from "next/server";

interface SMSPayload {
  to: string;
  message: string;
  type?: "emi_reminder" | "payment_receipt" | "welcome" | "maturity_alert" | "custom";
}

export async function POST(request: NextRequest) {
  const body: SMSPayload = await request.json();

  if (!body.to || !body.message) {
    return NextResponse.json({ error: "to and message are required" }, { status: 400 });
  }

  // Integrate with SMS provider (e.g., MSG91, Textlocal, Fast2SMS)
  // Placeholder — replace with actual SMS provider API call
  const SMS_API_KEY = process.env.SMS_API_KEY;
  const SMS_SENDER = process.env.SMS_SENDER_ID ?? "SAHAYG";

  if (!SMS_API_KEY) {
    // Log and return success in dev mode
    console.log(`[SMS DEV] To: ${body.to} | Message: ${body.message}`);
    return NextResponse.json({
      success: true,
      message: "SMS logged (dev mode — add SMS_API_KEY to send real SMS)",
      to: body.to,
    });
  }

  // Example: Fast2SMS API integration
  try {
    const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: SMS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "q",
        message: body.message,
        language: "english",
        flash: 0,
        numbers: body.to,
      }),
    });

    const result = await response.json();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: "SMS sending failed" }, { status: 500 });
  }
}

// Helper to build standard SMS messages
export function buildSMSMessage(
  type: SMSPayload["type"],
  data: Record<string, string | number>
): string {
  switch (type) {
    case "emi_reminder":
      return `Dear ${data.name}, your EMI of ${data.amount} for loan ${data.loan_id} is due on ${data.due_date}. Please pay on time. - Sahayog CCS`;
    case "payment_receipt":
      return `Dear ${data.name}, your payment of ${data.amount} received on ${data.date}. Loan balance: ${data.balance}. Thank you. - Sahayog CCS`;
    case "welcome":
      return `Welcome to Sahayog Credit Cooperative, ${data.name}! Your member ID is ${data.member_id}. - Sahayog CCS`;
    case "maturity_alert":
      return `Dear ${data.name}, your ${data.type} deposit ${data.deposit_id} of ${data.amount} matures on ${data.date}. Contact us for renewal. - Sahayog CCS`;
    default:
      return String(data.message ?? "");
  }
}
