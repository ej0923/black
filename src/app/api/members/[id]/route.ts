import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { sanitizeSlots } from "@/lib/constants";
import { getRepo, type MemberPatch } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 가능시간 / 메모 수정. 로그인이 없으므로 누구나 고칠 수 있다. */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: { slots?: unknown; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: MemberPatch = {};
  if (body.slots !== undefined) patch.available_slots = sanitizeSlots(body.slots);
  if (body.note !== undefined) patch.note = typeof body.note === "string" ? body.note.slice(0, 200) : null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  try {
    const member = await (await getRepo()).updateMember(id, patch);
    if (!member) return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ member });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}

/** 멤버 삭제는 관리자만. 지원 내역도 함께 지워진다. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { id } = await params;
  try {
    await (await getRepo()).deleteMember(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "삭제 실패" }, { status: 500 });
  }
}
