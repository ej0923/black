import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버 전용 Supabase 클라이언트.
 *
 * 이 서비스는 로그인이 없고 모든 쓰기가 라우트 핸들러를 거친다.
 * 키는 service_role 이 있으면 그것을, 없으면 anon 을 쓴다.
 *
 * anon 으로 돌릴 때는 supabase/schema.sql 의 anon 정책이 적용돼 있어야 한다.
 * 그 정책은 anon 에게 네 테이블 전권을 주므로, 관리자 판별은 오직
 * 라우트 핸들러의 쿠키 검사에만 의존하게 된다는 점을 알고 쓸 것.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY (또는 SUPABASE_SERVICE_ROLE_KEY) 를 설정하세요.",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
