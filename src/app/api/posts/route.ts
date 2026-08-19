import { NextResponse } from "next/server";
import { AdminRequiredError, requireAdmin } from "@/lib/admin";
import { getRepo } from "@/lib/db";
import { sanitizeHtml } from "@/lib/sanitize";
import { isPostCategory, type PostCategory } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("category");
  let category: PostCategory | undefined;
  if (raw !== null) {
    if (!isPostCategory(raw)) {
      return NextResponse.json({ error: "알 수 없는 분류입니다." }, { status: 400 });
    }
    category = raw;
  }

  try {
    const posts = await (await getRepo()).listPosts(category);
    return NextResponse.json({ posts: posts.map((p) => ({ ...p, body_html: sanitizeHtml(p.body_html) })) });
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

  let body: { category?: string; title?: string; body_html?: string; pinned?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!isPostCategory(body.category)) {
    return NextResponse.json({ error: "알 수 없는 분류입니다." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });

  try {
    const post = await (await getRepo()).createPost({
      category: body.category,
      title: title.slice(0, 120),
      body_html: sanitizeHtml(body.body_html),
      pinned: Boolean(body.pinned),
    });
    return NextResponse.json({ post });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "저장 실패" }, { status: 500 });
  }
}
