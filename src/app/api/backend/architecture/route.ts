import { NextResponse } from "next/server";

import { getBackendArchitectureSummary } from "@/server/services/backend-architecture";

export function GET() {
  return NextResponse.json(getBackendArchitectureSummary());
}
