import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "aion2_admin";

function adminPassword(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error("ADMIN_PASSWORD 환경변수가 설정되지 않았습니다.");
  return pw;
}

/** 비밀번호에서 파생한 쿠키 값. 비번을 바꾸면 기존 세션은 자동으로 무효가 된다. */
export function adminToken(): string {
  const secret = process.env.ADMIN_SECRET ?? "aion2-baekah-fallback-secret";
  return createHmac("sha256", secret).update(adminPassword()).digest("hex");
}

export function verifyPassword(input: string): boolean {
  const expected = Buffer.from(adminPassword());
  const given = Buffer.from(input ?? "");
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}

export async function isAdmin(): Promise<boolean> {
  try {
    const jar = await cookies();
    const value = jar.get(ADMIN_COOKIE)?.value;
    if (!value) return false;
    const expected = Buffer.from(adminToken());
    const given = Buffer.from(value);
    if (expected.length !== given.length) return false;
    return timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** 관리자 전용 라우트에서 사용. 아니면 throw. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new AdminRequiredError();
  }
}

export class AdminRequiredError extends Error {
  constructor() {
    super("관리자 권한이 필요합니다.");
  }
}
