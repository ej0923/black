import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { getRepo, type PartyPatch } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { id } = await params;

  let body: { code?: string; name?: string; memo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: PartyPatch = {};
  if (body.code !== undefined) {
    const code = body.code.trim();
    if (!code) return NextResponse.json({ error: "파티 코드는 비울 수 없습니다." }, { status: 400 });
    patch.code = code.slice(0, 20);
  }
  if (body.name !== undefined) patch.name = body.name.trim().slice(0, 50) || null;
  if (body.memo !== undefined) patch.memo = body.memo.trim().slice(0, 200) || null;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  try {
    const party = await (await getRepo()).updateParty(id, patch);
    if (!party) return NextResponse.json({ error: "파티를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ party });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    await requireAdmin();
  } catch (err) {
    if (err instanceof AdminRequiredError) return NextResponse.json({ error: err.message }, { status: 401 });
    throw err;
  }

  const { id } = await params;
  try {
    await (await getRepo()).deleteParty(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "삭제 실패" }, { status: 500 });
  }
}
