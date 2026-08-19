import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { getRepo, type PostPatch } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { isPostCategory } from "@/lib/types";

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

  let body: { category?: string; title?: string; body_html?: string; pinned?: boolean; sort_order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const patch: PostPatch = {};

  if (body.category !== undefined) {
    if (!isPostCategory(body.category)) {
      return NextResponse.json({ error: "알 수 없는 분류입니다." }, { status: 400 });
    }
    patch.category = body.category;
  }
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "제목은 비울 수 없습니다." }, { status: 400 });
    patch.title = title.slice(0, 120);
  }
  if (body.body_html !== undefined) patch.body_html = sanitizeHtml(body.body_html);
  if (body.pinned !== undefined) patch.pinned = Boolean(body.pinned);
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    patch.sort_order = Math.trunc(body.sort_order);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "수정할 내용이 없습니다." }, { status: 400 });
  }

  try {
    const post = await (await getRepo()).updatePost(id, patch);
    if (!post) return NextResponse.json({ error: "글을 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ post });
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
    await (await getRepo()).deletePost(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "삭제 실패" }, { status: 500 });
  }
}
