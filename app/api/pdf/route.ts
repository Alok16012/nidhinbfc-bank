import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatDate } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  if (!type || !id) {
    return NextResponse.json({ error: "type and id required" }, { status: 400 });
  }

  // Generate HTML for PDF (can be enhanced with Puppeteer/react-pdf)
  if (type === "passbook") {
    const { data: member } = await supabase.from("members").select("*").eq("id", id).single();
    const { data: entries } = await supabase.from("passbook").select("*").eq("member_id", id).order("date");

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Passbook - ${member.name}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { font-size: 18px; text-align: center; }
          h2 { font-size: 14px; margin-top: 5px; text-align: center; color: #444; }
          .info { display: flex; gap: 20px; margin: 15px 0; }
          .info div { flex: 1; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #1d4ed8; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #eee; }
          tr:hover td { background: #f8f9fa; }
          .cr { color: green; } .dr { color: red; }
        </style>
      </head>
      <body>
        <h1>Sahayog Credit Cooperative Society</h1>
        <h2>Member Passbook</h2>
        <div class="info">
          <div><strong>Name:</strong> ${member.name}</div>
          <div><strong>Member ID:</strong> ${member.member_id}</div>
          <div><strong>Phone:</strong> ${member.phone}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Narration</th><th>Debit</th><th>Credit</th><th>Balance</th>
            </tr>
          </thead>
          <tbody>
            ${(entries || []).map((e: any) => `
              <tr>
                <td>${formatDate(e.date)}</td>
                <td>${e.narration}</td>
                <td class="dr">${e.debit > 0 ? formatINR(e.debit) : "—"}</td>
                <td class="cr">${e.credit > 0 ? formatINR(e.credit) : "—"}</td>
                <td><strong>${formatINR(e.balance)}</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p style="margin-top:20px;text-align:center;color:#888;font-size:10px">
          Generated on ${new Date().toLocaleString("en-IN")}
        </p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="passbook-${member.member_id}.html"`,
      },
    });
  }

  return NextResponse.json({ error: "PDF type not supported yet" }, { status: 400 });
}
