import PostTable from "@/components/PostTable";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { listPosts } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** 정보공유 — 제목을 눌러 들어가는 목록형 게시판. 쓰기는 관리자만. */
export default async function InfoPage() {
  let posts;
  try {
    posts = await listPosts("info");
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  const admin = await isAdmin();

  return (
    <div>
      <div className="mb-7 border-b border-line pb-5">
        <p className="eyebrow mb-1.5">Info</p>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">정보공유</h1>
        <p className="mt-1.5 text-[13px] text-dim">
          공략·세팅·아이템 정보를 모아두는 곳입니다. 제목을 누르면 글로 들어갑니다. 글은 관리자만 올릴 수 있습니다.
        </p>
      </div>

      <PostTable posts={posts} basePath="/info" admin={admin} emptyText="아직 공유된 정보가 없습니다." />
    </div>
  );
}
