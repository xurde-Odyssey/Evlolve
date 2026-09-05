import { NextRequest } from "next/server";
import {
  runMonthlyCloseoutAuthoritatively,
  runWeeklyCloseoutAuthoritatively,
} from "@/application/evolve/server/commands";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    periodType?: "WEEK" | "MONTH";
    anchorDate?: string;
  };
  const secret = process.env.EVOLVE_INTERNAL_JOB_SECRET;
  const authorization = request.headers.get("authorization");

  if (secret && authorization !== `Bearer ${secret}`) {
    return Response.json(
      { ok: false, code: "FORBIDDEN", message: "Closeout job is not authorized." },
      { status: 403 },
    );
  }

  const anchorDate = body.anchorDate ?? new Date().toISOString();
  const result =
    body.periodType === "MONTH"
      ? await runMonthlyCloseoutAuthoritatively(anchorDate)
      : await runWeeklyCloseoutAuthoritatively(anchorDate);

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
