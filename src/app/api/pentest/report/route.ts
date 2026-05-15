/**
 * AEGIS Phase 3 - Monitoring Report API
 * 
 * GET /api/report - Generate and return monitoring report
 * GET /api/report?format=json - Get report data as JSON
 * POST /api/report - Generate and save report to file
 */

import { NextRequest, NextResponse } from "next/server";
import { generateMonitoringReport, collectReportData, getAttackLogs } from "@/lib/reportGenerator";
import * as path from "path";

export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format");
  const hours = parseInt(req.nextUrl.searchParams.get("hours") || "24");

  try {
    if (format === "json") {
      const data = await collectReportData(hours);
      return NextResponse.json({
        ok: true,
        data,
      });
    }

    // Return markdown report
    const report = await generateMonitoringReport(undefined, hours);
    
    return new NextResponse(report, {
      headers: {
        "Content-Type": "text/markdown",
      },
    });
  } catch (err) {
    console.error("[Report] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hours = body.hours || 24;
    const outputPath = body.outputPath || path.join(process.cwd(), "reports", "MONITORING_REPORT.md");

    const report = await generateMonitoringReport(outputPath, hours);

    return NextResponse.json({
      ok: true,
      message: "Report generated successfully",
      path: outputPath,
      preview: report.substring(0, 500) + "...",
    });
  } catch (err) {
    console.error("[Report] Error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
