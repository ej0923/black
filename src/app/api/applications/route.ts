import { NextResponse } from "next/server";
import { getRepo } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 지원. 확정 절차가 없으므로 이 한 번으로 참여가 끝난다. 중복 지원 허용. */
export async function POST(req: Request) {
  let body: { partyId?: string; memberId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!body.partyId || !body.memberId) {
    return NextResponse.json({ error: "파티와 멤버를 지정하세요." }, { status: 400 });
  }

  try {
    await (await getRepo()).applyToParty(body.partyId, body.memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "지원 실패" }, { status: 500 });
  }
}

/** 지원 취소 */
export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const partyId = url.searchParams.get("partyId");
  const memberId = url.searchParams.get("memberId");

  if (!partyId || !memberId) {
    return NextResponse.json({ error: "파티와 멤버를 지정하세요." }, { status: 400 });
  }

  try {
    await (await getRepo()).cancelApplication(partyId, memberId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "취소 실패" }, { status: 500 });
  }
}
