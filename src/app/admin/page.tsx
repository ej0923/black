import AdminPanel from "@/components/AdminPanel";
import { isAdmin } from "@/lib/admin";
import { TARGET_LEGION } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  return (
    <div className="mx-auto max-w-md">
      <div className="border-b border-line pb-5">
        <p className="eyebrow mb-1.5">Admin</p>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">관리자</h1>
        <p className="mt-1.5 text-[13px] text-dim">
          파티 추가·삭제, 멤버 삭제, {TARGET_LEGION} 레기온이 아닌 캐릭터의 예외 등록에 필요합니다.
        </p>
      </div>
      <AdminPanel initialAdmin={admin} />
    </div>
  );
}
