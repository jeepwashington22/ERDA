// Diagnose workbook structure: sheet names, dimensions, first-row headers.
// Run: node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/inspect-workbook.ts "SY 2025-26.xlsx"
import * as XLSX from "xlsx";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const filename = process.argv[2] ?? "SY 2025-26.xlsx";
const path = join(process.cwd(), "YearlyRecords", filename);
console.time("read");
const wb = XLSX.read(readFileSync(path), { type: "buffer", cellDates: true });
console.timeEnd("read");

for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name];
  const range = sheet["!ref"] ?? "(empty)";
  console.log(`sheet "${name}" range=${range}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  console.log(`  rows parsed: ${rows.length}; first row: ${JSON.stringify((rows[0] ?? []).slice(0, 8))}`);
}
process.exit(0);
