import { NextResponse } from "next/server";

import { getBackendArchitectureSummary } from "@/src/backend/services/backend-architecture";

export function GET() {
  return NextResponse.json(getBackendArchitectureSummary());
}
