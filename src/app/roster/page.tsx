import Link from "next/link";
import MemberList from "@/components/MemberList";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { TARGET_LEGION } from "@/lib/constants";
import { formatPower } from "@/lib/format";
import { listApplications, listMembers, listParties } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  let members, parties, applications;
  try {
    [members, parties, applications] = await Promise.all([listMembers(), listParties(), listApplications()]);
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  const admin = await isAdmin();

  const rated = members.filter((m) => m.combat_power);
  const avgPower = rated.length
    ? Math.round(rated.reduce((sum, m) => sum + (m.combat_power ?? 0), 0) / rated.length)
    : 0;
  const topPower = members.reduce((max, m) => Math.max(max, m.combat_power ?? 0), 0);
  const applied = new Set(applications.map((a) => a.member_id)).size;

  const stats = [
    { label: "등록 인원", value: String(members.length), unit: "명" },
    { label: "평균 전투력", value: formatPower(avgPower), unit: "" },
    { label: "최고 전투력", value: formatPower(topPower), unit: "" },
    { label: "파티", value: String(parties.length), unit: "개" },
    { label: "파티 지원자", value: `${applied}`, unit: `/ ${members.length}명` },
  ];

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <p className="eyebrow mb-1.5">Legion Roster</p>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">
            {TARGET_LEGION} 레기온 멤버목록
          </h1>
          <p className="mt-1.5 text-[13px] text-dim">
            전투력과 아이템레벨은 plaync 에서 가져온 값입니다. 갱신을 눌러야 최신화됩니다.
          </p>
        </div>
        <Link href="/register" className="btn btn-flame">
          멤버등록
        </Link>
      </div>

      <dl className="mb-6 grid grid-cols-2 divide-x divide-line border-y border-line sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="px-4 py-3.5 first:pl-0">
            <dt className="label">{stat.label}</dt>
            <dd className="tnum mt-1 font-display text-[21px] font-bold leading-none text-fg">
              {stat.value}
              {stat.unit && <span className="ml-1 text-[12px] font-medium text-dim">{stat.unit}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <MemberList members={members} parties={parties} applications={applications} admin={admin} />
    </div>
  );
}
