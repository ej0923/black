import Link from "next/link";
import { notFound } from "next/navigation";
import PostEditor from "@/components/PostEditor";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { getPost } from "@/lib/queries";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 정보공유 글 수정. 관리자만. */
export default async function EditInfoPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let post: Post | null;
  try {
    post = await getPost(id);
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  if (!post || post.category !== "info") notFound();

  const admin = await isAdmin();

  return (
    <div>
      <Link href={`/info/${post.id}`} className="text-[12px] text-faint transition-colors hover:text-brand">
        ← {post.title}
      </Link>

      <h1 className="mb-5 mt-2 font-display text-[22px] font-bold tracking-[-0.015em] text-fg">글 수정</h1>

      {admin ? (
        <PostEditor category="info" post={post} basePath="/info" />
      ) : (
        // 화면을 숨기는 건 잠금이 아니다 — 실제 차단은 /api/posts 의 requireAdmin 이 한다.
        <p className="card px-4 py-10 text-center text-[13px] text-faint">
          글은 관리자만 고칠 수 있습니다.{" "}
          <Link href="/admin" className="text-dim underline underline-offset-2 hover:text-brand">
            관리자
          </Link>{" "}
          로 먼저 로그인하세요.
        </p>
      )}
    </div>
  );
}
