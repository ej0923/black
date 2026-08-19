import Link from "next/link";
import PostBoard from "@/components/PostBoard";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { TARGET_LEGION } from "@/lib/constants";
import { listPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 홈 — 공지사항과 명예의 전당. 글은 관리자만 쓴다. */
export default async function HomePage() {
  let notices, hall;
  try {
    [notices, hall] = await Promise.all([listPosts("notice"), listPosts("hall")]);
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  const admin = await isAdmin();

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow mb-1.5">Home</p>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">
            {TARGET_LEGION} 레기온
          </h1>
          <p className="mt-1.5 text-[13px] text-dim">명예의 전당과 공지사항입니다. 글은 관리자만 올릴 수 있습니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/roster" className="btn btn-ghost">
            멤버목록
          </Link>
          <Link href="/register" className="btn btn-flame">
            멤버등록
          </Link>
        </div>
      </div>

      {/* 한 단으로 쌓는다. 명예의 전당이 위, 공지사항이 아래. */}
      <div className="space-y-5">
        <PostBoard
          category="hall"
          label="명예의 전당"
          accent="var(--color-gold)"
          posts={hall}
          admin={admin}
          emptyText="아직 등록된 기록이 없습니다."
        />
        <PostBoard
          category="notice"
          label="공지사항"
          accent="var(--color-brand)"
          posts={notices}
          admin={admin}
          emptyText="아직 올라온 공지가 없습니다."
          expand="all"
        />
      </div>

      {!admin && (
        <p className="mt-5 text-[11.5px] text-faint">
          글을 쓰려면 우측 상단의{" "}
          <Link href="/admin" className="text-dim underline underline-offset-2 hover:text-brand">
            관리자
          </Link>{" "}
          로 먼저 로그인하세요.
        </p>
      )}
    </div>
  );
}
