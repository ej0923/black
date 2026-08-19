import Link from "next/link";
import { notFound } from "next/navigation";
import PartyDetail from "@/components/PartyDetail";
import SetupNotice from "@/components/SetupNotice";
import { getParty, getPartyMembers, listMembers } from "@/lib/queries";
import type { Member, Party } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PartyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let loaded: { party: Party; applicants: Member[]; allMembers: Member[] } | null = null;
  try {
    const party = await getParty(id);
    if (party) {
      const [applicants, allMembers] = await Promise.all([getPartyMembers(id), listMembers()]);
      loaded = { party, applicants, allMembers };
    }
  } catch (err) {
    // notFound() 는 아래에서 try 밖으로 던진다. 여기 걸리는 건 DB/설정 오류뿐이다.
    return <SetupNotice message={err instanceof Error ? err.message : String(err)} />;
  }

  if (!loaded) notFound();
  const { party, applicants, allMembers } = loaded;

  return (
    <div>
      <Link href="/parties" className="text-[12px] text-faint transition-colors hover:text-brand">
        ← 공대모집
      </Link>

      <div className="mb-6 mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line pb-4">
        <span className="font-display text-[32px] font-bold leading-none text-brand">{party.code}</span>
        {party.name && (
          <h1 className="font-display text-[20px] font-bold tracking-[-0.01em] text-fg">{party.name}</h1>
        )}
        {party.memo && <p className="text-[12.5px] text-dim">{party.memo}</p>}
        <span className="tnum ml-auto font-mono text-[12px] text-faint">지원자 {applicants.length}명</span>
      </div>

      <PartyDetail party={party} applicants={applicants} allMembers={allMembers} />
    </div>
  );
}
