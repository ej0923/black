import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { getRepo } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 그 파티에 지원한 사람들의 가능시간만 비운다. 관리자 전용.
 *
 * 멤버 등록과 지원 내역은 그대로 둔다 — 지워지는 건 available_slots 뿐이다.
 * 가능시간은 멤버마다 하나뿐이라, 다른 파티에도 지원한 사람은 그쪽 표에서도 비게 된다.
 */
export async function POST(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { id } = await params;

  try {
    const repo = await getRepo();
    const party = await repo.getParty(id);
    if (!party) return NextResponse.json({ error: "파티를 찾을 수 없습니다." }, { status: 404 });

    const cleared = await repo.clearPartySlots(id);
    return NextResponse.json({ ok: true, cleared });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "초기화 실패" }, { status: 500 });
  }
}
