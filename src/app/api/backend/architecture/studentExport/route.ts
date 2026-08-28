import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getStudentsForExport } from "@/server/services/student-registry";
import { EXPORT_COLUMNS } from "@/server/lib/student-export-column";

export async function GET(request: NextRequest) {
  // Auth check — this export contains household income, addresses, etc.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filters = {
    search: searchParams.get("search") ?? undefined,
    grade: searchParams.get("grade") ?? undefined,
    year: searchParams.get("year") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  };

  const students = await getStudentsForExport(filters);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Erda Scholar System";
  workbook.created = new Date();

  const sheetName = filters.year ? `SY ${filters.year}` : "Students";
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = EXPORT_COLUMNS.map((col) => ({
    header: col.header,
    key: col.key as string,
    width: col.width ?? 16,
  }));

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 32;

  for (const student of students) {
    const row: Record<string, unknown> = {};
    for (const col of EXPORT_COLUMNS) {
      const value = (student as any)[col.key];
      row[col.key as string] =
        typeof value === "boolean" ? (value ? "Yes" : "No") : value ?? "";
    }
    sheet.addRow(row);
  }

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();

  const filenameYear = filters.year ? filters.year.replace(/\s+/g, "") : "All";
  const filename = `SY_${filenameYear}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}