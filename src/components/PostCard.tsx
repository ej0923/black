import Link from "next/link";
import { formatDate } from "@/lib/format";
import { firstSentence } from "@/lib/sanitize";
import type { Post } from "@/lib/types";

/**
 * 글 한 장짜리 카드. /info 목록(PostTable)과 홈의 정보공유 미리보기가 같이 쓴다.
 *
 * 제목 한 줄과 본문 첫 문장 한 줄만 싣는다 — 본문 전체는 들어간 글에서 본다.
 * 카드 높이를 min-h 로 맞춰 두는 이유는, 첫 문장이 없는 글이 섞여도 한 줄에
 * 놓인 카드들의 아랫변이 어긋나지 않게 하기 위한 것이다.
 */
export default function PostCard({ post, href }: { post: Post; href: string }) {
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

          {excerpt && <p className="mt-1.5 line-clamp-1 text-[16px] leading-snug text-dim">{excerpt}</p>}
        </div>

        <time dateTime={post.created_at} className="tnum text-[11.5px] text-faint">
          {formatDate(post.created_at)}
        </time>
      </Link>
    </li>
  );
}
