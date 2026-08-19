import Link from "next/link";
import PartyAdminPanel from "@/components/PartyAdminPanel";
import SetupNotice from "@/components/SetupNotice";
import { isAdmin } from "@/lib/admin";
import { classColor } from "@/lib/format";
import { listApplications, listMembers, listParties } from "@/lib/queries";
import { buildSlotIndex, findBestWindows, formatWindow } from "@/lib/schedule";
import type { Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartiesPage() {
  let members, parties, applications;
  try {
    [members, parties, applications] = await Promise.all([listMembers(), listParties(), listApplications()]);
  } catch (err) {
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  const admin = await isAdmin();
  const memberById = new Map(members.map((m) => [m.id, m]));

  const cards = parties.map((party) => {
    const applicants = applications
      .filter((a) => a.party_id === party.id)
      .map((a) => memberById.get(a.member_id))
      .filter((m): m is Member => Boolean(m));

    const best = findBestWindows(buildSlotIndex(applicants))[0] ?? null;
    return { party, applicants, best };
  });

  return (
    <div>
      <div className="mb-7 border-b border-line pb-5">
        <p className="eyebrow mb-1.5">Parties</p>
        <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-fg">파티모집</h1>
        <p className="mt-1.5 text-[13px] text-dim">
          파티를 열면 지원자들의 가능 시간이 겹치는 구간과 시간대별 인원이 보입니다.
        </p>
      </div>

      {admin && <PartyAdminPanel parties={parties} />}

      {cards.length === 0 ? (
        <div className="card px-6 py-16 text-center text-[13px] text-dim">
          아직 파티가 없습니다. 관리자 모드에서 파티를 추가하세요.
        </div>
      ) : (
        <ul className="grid grid-cols-4 gap-3">
          {cards.map(({ party, applicants, best }) => (
            <li key={party.id}>
              <Link
                href={`/parties/${party.id}`}
                className="card group flex h-full flex-col transition-colors hover:border-brand/60"
              >
                <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
                  <span className="font-display text-[24px] font-bold leading-none text-brand">{party.code}</span>
                  {party.name && <span className="truncate text-[14px] font-semibold text-fg">{party.name}</span>}
                  <span className="tnum ml-auto shrink-0 font-mono text-[12px] text-faint">
                    {applicants.length}명
                  </span>
                </div>

                <div className="px-4 py-3.5">
                  {best ? (
                    <>
                      <p className="label mb-1">가장 많이 겹치는 시간</p>
                      <p className="text-[17px] font-bold text-gold">
                        {formatWindow(best)}
                        <span className="tnum ml-2 text-[12.5px] font-medium text-muted">
                          {best.count}/{applicants.length}명
                        </span>
                      </p>
                    </>
                  ) : (
                    <p className="text-[12.5px] text-faint">
                      {applicants.length === 0 ? "지원자가 없습니다" : "겹치는 시간이 없습니다"}
                    </p>
                  )}

                  {party.memo && <p className="mt-2.5 line-clamp-2 text-[12px] text-dim">{party.memo}</p>}
                </div>

                {applicants.length > 0 && (
                  <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 border-t border-line px-4 py-2.5">
                    {applicants.slice(0, 7).map((m) => (
                      <span key={m.id} className="text-[11.5px] text-muted">
                        {m.nickname}
                        <span className={`ml-1 text-[10px] ${classColor(m.class_name)}`}>{m.class_name}</span>
                      </span>
                    ))}
                    {applicants.length > 7 && (
                      <span className="tnum text-[11.5px] text-faint">+{applicants.length - 7}</span>
                    )}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
