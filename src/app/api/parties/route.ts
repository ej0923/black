import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { getRepo } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ parties: await (await getRepo()).listParties() });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "조회 실패" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  let body: { code?: string; name?: string; memo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const code = (body.code ?? "").trim();
  if (!code) return NextResponse.json({ error: "파티 코드를 입력하세요." }, { status: 400 });

  try {
    const party = await (await getRepo()).createParty({
      code: code.slice(0, 20),
      name: body.name?.trim().slice(0, 50) || null,
      memo: body.memo?.trim().slice(0, 200) || null,
    });
    return NextResponse.json({ party });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "생성 실패" }, { status: 500 });
  }
}
