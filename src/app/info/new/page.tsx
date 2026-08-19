import Link from "next/link";
import PostEditor from "@/components/PostEditor";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** 정보공유 글쓰기. 관리자만. */
export default async function NewInfoPostPage() {
  const admin = await isAdmin();

  return (
    <div>
      <Link href="/info" className="text-[12px] text-faint transition-colors hover:text-brand">
        ← 정보공유
      </Link>

      <h1 className="mb-5 mt-2 font-display text-[22px] font-bold tracking-[-0.015em] text-fg">글쓰기</h1>

      {admin ? (
        <PostEditor category="info" post={null} basePath="/info" />
      ) : (
        <AdminOnlyNotice />
      )}
    </div>
  );
}

/** 화면을 숨기는 건 잠금이 아니다 — 실제 차단은 /api/posts 의 requireAdmin 이 한다. */
function AdminOnlyNotice() {
  return (
    <p className="card px-4 py-10 text-center text-[13px] text-faint">
      글은 관리자만 쓸 수 있습니다.{" "}
      <Link href="/admin" className="text-dim underline underline-offset-2 hover:text-brand">
        관리자
      </Link>{" "}
      로 먼저 로그인하세요.
    </p>
  );
}
