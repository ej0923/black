import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminToken, isAdmin, verifyPassword } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ admin: await isAdmin() });
}

/** 관리자 로그인. 비밀번호는 ADMIN_PASSWORD 환경변수. */
export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  let ok = false;
  try {
    ok = verifyPassword(body.password ?? "");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서버 설정 오류" },
      { status: 500 },
    );
  }

  if (!ok) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const res = NextResponse.json({ admin: true });
  res.cookies.set(ADMIN_COOKIE, adminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

/** 로그아웃 */
export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
