import Link from "next/link";
import PostBoard from "@/components/PostBoard";
import PostCard from "@/components/PostCard";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { TARGET_LEGION } from "@/lib/constants";
import { listPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 홈에 미리 보여줄 정보공유 카드 수. 넓은 화면의 한 줄과 같은 수로 맞춘다. */
const INFO_PREVIEW = 3;

/** 홈 — 공지사항과 명예의 전당. 글은 관리자만 쓴다. */
export default async function HomePage() {
  let notices, hall, info;
  try {
    [notices, hall, info] = await Promise.all([listPosts("notice"), listPosts("hall"), listPosts("info")]);
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
        </div>
        {/* 좁은 화면에서는 헤더 "공대모집" 메뉴에 같은 링크가 있으니 여기선 감춘다. */}
        <div className="hidden gap-2 sm:flex">
          <Link href="/roster" className="btn btn-ghost">
            멤버목록
          </Link>
          <Link href="/register" className="btn btn-flame">
            멤버등록
          </Link>
        </div>
      </div>

      {/* 한 단으로 쌓는다. 명예의 전당이 위, 정보공유 미리보기, 공지사항이 아래. */}
      <div className="space-y-8">
        <PostBoard
          category="hall"
          label="명예의 전당"
          accent="var(--color-gold)"
          posts={hall}
          admin={admin}
          emptyText="아직 등록된 기록이 없습니다."
        />

        {/*
          정보공유 최신 세 장. 글쓰기 버튼은 여기 두지 않는다 — 쓰기는 /info 에서 한다.
          글이 하나도 없으면 빈 칸 대신 통째로 감춘다(홈은 요약이지 게시판이 아니다).
        */}
        {info.length > 0 && (
          <section>
            <header className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-[3px] rounded-sm bg-mint" />
                <h2 className="font-display text-[16px] font-bold tracking-[-0.01em] text-fg">정보공유</h2>
                <span className="tnum text-[11.5px] text-faint">{info.length}</span>
              </div>

              <Link href="/info" className="btn btn-ghost btn-sm">
                더보기
              </Link>
            </header>

            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {info.slice(0, INFO_PREVIEW).map((post) => (
                <PostCard key={post.id} post={post} href={`/info/${post.id}`} />
              ))}
            </ul>
          </section>
        )}

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
