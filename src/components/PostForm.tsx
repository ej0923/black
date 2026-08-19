"use client";

import { useState } from "react";
import RichTextEditor from "@/components/RichTextEditor";
import { POST_CATEGORY_LABEL, type Post, type PostCategory } from "@/lib/types";

/**
 * 글 입력 칸. 저장은 하지 않고 값만 모아서 onSubmit 으로 넘긴다.
 *
 * 홈의 PostBoard(칸 안에 펼쳐지는 형태)와 정보공유의 글쓰기/수정 페이지가
 * 같은 입력 칸을 쓴다. 두 곳의 모양이 갈라지지 않도록 여기 하나만 둔다.
 */
export default function PostForm({
  category,
  post,
  busy,
  onCancel,
  onSubmit,
}: {
  category: PostCategory;
  post: Post | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: { title: string; body_html: string; pinned: boolean }) => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [html, setHtml] = useState(post?.body_html ?? "");
  const [pinned, setPinned] = useState(post?.pinned ?? false);

  return (
    <div className="space-y-3 border-b border-gold/20 bg-gold/[0.04] px-4 py-4">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-gold">
          관리자 · {post ? "글 수정" : "새 글"} ({POST_CATEGORY_LABEL[category]})
        </span>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-muted">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-gold" />
          맨 위에 고정
        </label>
      </div>

      <label className="block">
        <span className="label">제목</span>
        <input
          className="input mt-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 이번 주 공대 일정"
          maxLength={120}
          autoFocus
        />
      </label>

      <div>
        <span className="label">본문</span>
        <div className="mt-1">
          <RichTextEditor
            initialHtml={post?.body_html ?? ""}
            onChange={setHtml}
            // 편집 중에도 저장 후와 같은 사진 크기로 보이게 분류 클래스를 넘긴다
            bodyClassName={`prose-post--${category}`}
            placeholder="내용을 입력하세요. 위 도구모음으로 글꼴·크기·색·굵기를 바꾸고 사진을 넣을 수 있습니다."
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
          취소
        </button>
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => onSubmit({ title, body_html: html, pinned })}
          className="btn btn-primary"
        >
          {busy ? "저장 중…" : post ? "수정 저장" : "등록"}
        </button>
      </div>
    </div>
  );
}
