import Link from "next/link";
import { formatDate } from "@/lib/format";
import { firstSentence } from "@/lib/sanitize";
import type { Post } from "@/lib/types";

/**
 * 제목을 눌러 들어가는 카드형 게시판. 넓은 화면에서 한 줄에 세 장.
 *
 * 카드에는 제목 한 줄과 본문 첫 문장 한 줄만 싣는다 — 본문 전체는 들어간 글에서 본다.
 *
 * 읽기는 누구나, 쓰기는 관리자만 — 글쓰기 버튼은 관리자에게만 보이고 실제 차단은
 * /api/posts 의 requireAdmin 이 한다.
 */
export default function PostTable({
  posts,
  basePath,
  admin,
  emptyText,
}: {
  posts: Post[];
  /** 글 상세 주소의 앞부분. 예) "/info" → "/info/{id}" */
  basePath: string;
  admin: boolean;
  emptyText: string;
}) {
  return (
    <section>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-[3px] rounded-sm bg-mint" />
          <h2 className="font-display text-[16px] font-bold tracking-[-0.01em] text-fg">전체 글</h2>
          <span className="tnum text-[11.5px] text-faint">{posts.length}</span>
        </div>

        {admin && (
          <Link href={`${basePath}/new`} className="btn btn-ghost btn-sm">
            글쓰기
          </Link>
        )}
      </header>

      {posts.length === 0 ? (
        <p className="card px-4 py-10 text-center text-[13px] text-faint">{emptyText}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} href={`${basePath}/${post.id}`} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PostCard({ post, href }: { post: Post; href: string }) {
  const excerpt = firstSentence(post.body_html, { skip: post.title });

  return (
    <li>
      <Link
        href={href}
        className="card group flex h-full min-h-[128px] flex-col justify-between gap-3 px-4 py-4 transition-colors hover:border-line-strong"
      >
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            {post.pinned && <span className="tag mt-1 shrink-0 border border-gold/40 bg-gold/12 text-gold">고정</span>}
            <h3 className="line-clamp-1 font-display text-[18px] font-bold leading-snug tracking-[-0.015em] text-fg transition-colors group-hover:text-brand">
              {post.title}
            </h3>
          </div>

          {excerpt && <p className="mt-1.5 line-clamp-1 text-[13px] leading-snug text-dim">{excerpt}</p>}
        </div>

        <time dateTime={post.created_at} className="tnum text-[11.5px] text-faint">
          {formatDate(post.created_at)}
        </time>
      </Link>
    </li>
  );
}
