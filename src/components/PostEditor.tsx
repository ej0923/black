"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PostForm from "@/components/PostForm";
import type { Post, PostCategory } from "@/lib/types";

/**
 * 글쓰기 / 수정 페이지의 알맹이.
 *
 * 저장이 끝나면 그 글의 상세로 보낸다. 쓰기 차단은 화면이 아니라
 * /api/posts 의 requireAdmin 이 한다.
 */
export default function PostEditor({
  category,
  post,
  basePath,
}: {
  category: PostCategory;
  /** 수정이면 원본 글, 새 글이면 null */
  post: Post | null;
  /** 목록 주소. 예) "/info" */
  basePath: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cancelHref = post ? `${basePath}/${post.id}` : basePath;

  async function submit(payload: { title: string; body_html: string; pinned: boolean }) {
    setBusy(true);
    setError(null);
    try {
      const res = post
        ? await fetch(`/api/posts/${post.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/posts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, category }),
          });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");

      const id: string = json.post?.id ?? post?.id;
      router.push(id ? `${basePath}/${id}` : basePath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      setBusy(false);
    }
    // 성공하면 화면을 떠나므로 busy 를 되돌리지 않는다 — 이동하는 동안 버튼이 잠겨 있어야 한다.
  }

  return (
    <section className="card overflow-hidden">
      {error && <p className="border-b border-line px-4 py-2 text-[12px] text-[#f0a0a0]">{error}</p>}
      <PostForm
        category={category}
        post={post}
        busy={busy}
        onCancel={() => router.push(cancelHref)}
        onSubmit={submit}
      />
    </section>
  );
}
