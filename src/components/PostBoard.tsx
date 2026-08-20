"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PostForm from "@/components/PostForm";
import { formatRelative } from "@/lib/format";
import type { Post, PostCategory } from "@/lib/types";

/**
 * 홈의 칸 하나(공지사항 / 명예의 전당).
 *
 * 정보공유는 이 형태가 아니라 제목을 눌러 들어가는 게시판이다 — app/info 참고.
 *
 * 읽기는 누구나, 쓰기는 관리자만. 쓰기 버튼은 관리자에게만 보이고,
 * 실제 차단은 /api/posts 의 requireAdmin 이 한다 — 화면을 숨기는 건 잠금이 아니다.
 *
 * post.body_html 은 서버에서 sanitizeHtml 을 거쳐 내려온 값이다.
 */
export default function PostBoard({
  category,
  label,
  accent,
  posts,
  admin,
  emptyText,
  expand = "first",
}: {
  category: PostCategory;
  label: string;
  accent: string;
  posts: Post[];
  admin: boolean;
  emptyText: string;
  /** 처음에 펼쳐 둘 글. "first" = 맨 위 하나만, "all" = 전부. 접고 펴는 건 그대로 된다. */
  expand?: "first" | "all";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<{ post: Post | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-[3px] rounded-sm" style={{ background: accent }} />
          <h2 className="font-display text-[16px] font-bold tracking-[-0.01em] text-fg">{label}</h2>
          <span className="tnum text-[11.5px] text-faint">{posts.length}</span>
        </div>

        {admin && !editing && (
          <button type="button" onClick={() => setEditing({ post: null })} className="btn btn-ghost btn-sm">
            글쓰기
          </button>
        )}
      </header>

      {error && <p className="border-b border-line px-4 py-2 text-[12px] text-[#f0a0a0]">{error}</p>}

      {editing && (
        <PostForm
          key={editing.post?.id ?? "new"}
          category={category}
          post={editing.post}
          busy={busy}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          onSubmit={async (payload) => {
            const ok = await run(() =>
              editing.post
                ? fetch(`/api/posts/${editing.post.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  })
                : fetch("/api/posts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, category }),
                  }),
            );
            if (ok) setEditing(null);
          }}
        />
      )}

      {posts.length === 0 && !editing ? (
        <p className="px-4 py-10 text-center text-[13px] text-faint">{emptyText}</p>
      ) : (
        <ul>
          {posts.map((post, i) => (
            <PostRow
              key={post.id}
              post={post}
              admin={admin}
              busy={busy}
              defaultOpen={(expand === "all" || i === 0) && !editing}
              onEdit={() => {
                setEditing({ post });
                setError(null);
              }}
              onDelete={() => {
                if (!confirm(`"${post.title}" 글을 삭제할까요? 되돌릴 수 없습니다.`)) return;
                run(() => fetch(`/api/posts/${post.id}`, { method: "DELETE" }));
              }}
              onTogglePin={() =>
                run(() =>
                  fetch(`/api/posts/${post.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pinned: !post.pinned }),
                  }),
                )
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function PostRow({
  post,
  admin,
  busy,
  defaultOpen,
  onEdit,
  onDelete,
  onTogglePin,
}: {
  post: Post;
  admin: boolean;
  busy: boolean;
  defaultOpen: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li className="row">
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span
            aria-hidden
            data-on={open}
            className="text-[10px] text-faint transition-transform data-[on=true]:rotate-90"
          >
            ▶
          </span>
          {post.pinned && <span className="tag border border-gold/40 bg-gold/12 text-gold">고정</span>}
          {/* 명예의 전당 글만 금색으로 깜빡인다. 공지사항은 그대로 — globals.css 의 .blink-hall */}
          <span
            className={`truncate text-[13.5px] font-semibold ${post.category === "hall" ? "blink-hall" : "text-fg"}`}
          >
            {post.title}
          </span>
        </button>

        <time className="shrink-0 text-[11.5px] text-faint" dateTime={post.created_at}>
          {formatRelative(post.created_at)}
        </time>

        {admin && (
          <span className="flex shrink-0 gap-1">
            <button type="button" disabled={busy} onClick={onTogglePin} className="btn btn-ghost btn-sm">
              {post.pinned ? "고정 해제" : "고정"}
            </button>
            <button type="button" disabled={busy} onClick={onEdit} className="btn btn-ghost btn-sm">
              수정
            </button>
            <button type="button" disabled={busy} onClick={onDelete} className="btn btn-danger btn-sm">
              삭제
            </button>
          </span>
        )}
      </div>

      {open && (
        <div className="border-t border-[var(--hairline)] px-4 py-4">
          {post.body_html ? (
            // 서버에서 sanitizeHtml 을 거친 값이다. queries.listPosts 참고.
            // 분류 클래스는 사진 크기 같은 분류별 규칙을 걸기 위한 것 (globals.css).
            //
            // 명예의 전당 본문만 오른쪽에서 왼쪽으로 흐른다. 바깥 .marquee 가 넘치는
            // 부분을 잘라내는 창 역할이라 감싸는 div 가 한 겹 더 필요하다.
            post.category === "hall" ? (
              <div className="marquee">
                <div
                  className="marquee-track prose-post prose-post--hall"
                  dangerouslySetInnerHTML={{ __html: post.body_html }}
                />
              </div>
            ) : (
              <div
                className={`prose-post prose-post--${post.category}`}
                dangerouslySetInnerHTML={{ __html: post.body_html }}
              />
            )
          ) : (
            <p className="text-[12.5px] text-faint">내용이 없습니다.</p>
          )}
        </div>
      )}
    </li>
  );
}
