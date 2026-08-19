"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Post } from "@/lib/types";

/** 글 상세의 관리자 버튼 줄 — 고정 / 수정 / 삭제. */
export default function PostActions({ post, basePath }: { post: Post; basePath: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<Response>, after: () => void) {
    setBusy(true);
    setError(null);
    try {
      const res = await fn();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "요청에 실패했습니다.");
      after();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && <span className="mr-auto text-[12px] text-[#f0a0a0]">{error}</span>}

      <button
        type="button"
        disabled={busy}
        onClick={() =>
          run(
            () =>
              fetch(`/api/posts/${post.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pinned: !post.pinned }),
              }),
            () => setBusy(false),
          )
        }
        className="btn btn-ghost btn-sm"
      >
        {post.pinned ? "고정 해제" : "고정"}
      </button>

      <Link href={`${basePath}/${post.id}/edit`} className="btn btn-ghost btn-sm">
        수정
      </Link>

      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!confirm(`"${post.title}" 글을 삭제할까요? 되돌릴 수 없습니다.`)) return;
          run(
            () => fetch(`/api/posts/${post.id}`, { method: "DELETE" }),
            () => router.push(basePath),
          );
        }}
        className="btn btn-danger btn-sm"
      >
        삭제
      </button>
    </div>
  );
}
