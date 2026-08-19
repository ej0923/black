import Link from "next/link";
import { notFound } from "next/navigation";
import PostActions from "@/components/PostActions";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { getPost, listPosts } from "@/lib/queries";
import type { Post } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 정보공유 글 하나. 본문은 여기서만 보여준다. */
export default async function InfoPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let loaded: { post: Post; prev: Post | null; next: Post | null } | null = null;
  try {
    const post = await getPost(id);
    // 분류가 다른 글의 주소로 들어오면 정보공유 글이 아니다.
    if (post && post.category === "info") {
      // 목록과 같은 순서에서의 위아래 글. 글 수가 많지 않아 목록을 그대로 쓴다.
      const all = await listPosts("info");
      const i = all.findIndex((p) => p.id === post.id);
      loaded = { post, prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
    }
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  if (!loaded) notFound();
  const { post, prev, next } = loaded;

  const admin = await isAdmin();

  return (
    <div>
      <Link href="/info" className="text-[12px] text-faint transition-colors hover:text-brand">
        ← 정보공유
      </Link>

      <article className="card mt-2 overflow-hidden">
        <header className="border-b border-line px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {post.pinned && <span className="tag border border-gold/40 bg-gold/12 text-gold">고정</span>}
            <h1 className="font-display text-[20px] font-bold leading-snug tracking-[-0.01em] text-fg">{post.title}</h1>
          </div>
          <p className="tnum mt-1.5 text-[11.5px] text-faint">
            <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
            {post.updated_at !== post.created_at && <> · 수정 {formatDate(post.updated_at)}</>}
          </p>
        </header>

        <div className="px-4 py-5">
          {post.body_html ? (
            // 서버에서 sanitizeHtml 을 거친 값이다. queries.getPost 참고.
            <div
              className={`prose-post prose-post--${post.category}`}
              dangerouslySetInnerHTML={{ __html: post.body_html }}
            />
          ) : (
            <p className="text-[12.5px] text-faint">내용이 없습니다.</p>
          )}
        </div>
      </article>

      {admin && (
        <div className="mt-3">
          <PostActions post={post} basePath="/info" />
        </div>
      )}

      {/* 위아래 글 — 목록과 같은 순서다 */}
      <nav className="card mt-5 overflow-hidden">
        <AdjacentRow label="이전 글" post={prev} />
        <AdjacentRow label="다음 글" post={next} />
      </nav>

      <div className="mt-5 flex justify-center">
        <Link href="/info" className="btn btn-ghost">
          목록으로
        </Link>
      </div>
    </div>
  );
}

function AdjacentRow({ label, post }: { label: string; post: Post | null }) {
  const body = (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="label w-12 shrink-0">{label}</span>
      {post ? (
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{post.title}</span>
      ) : (
        <span className="flex-1 text-[13px] text-faint">없습니다</span>
      )}
    </div>
  );

  return post ? (
    <div className="row">
      <Link href={`/info/${post.id}`} className="block transition-colors hover:text-brand">
        {body}
      </Link>
    </div>
  ) : (
    <div className="row">{body}</div>
  );
}
