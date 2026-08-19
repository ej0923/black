import type { Metadata } from "next";
import Link from "next/link";
import NavTabs from "@/components/NavTabs";
import { isAdmin } from "@/lib/admin";
import { RACE_NAME, SERVER_NAME, TARGET_LEGION } from "@/lib/constants";
import { isLocalDb } from "@/lib/db";
import "./globals.css";

export const metadata: Metadata = {
  title: `${TARGET_LEGION}`,
  description: `아이온2 ${SERVER_NAME} 서버 ${TARGET_LEGION} 레기온 공격대 편성 매니저`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const admin = await isAdmin();

  return (
    <html lang="ko" className="dark">
      <body>
        {/* 최상단 브랜드 라인 */}
        <div className="h-[3px] bg-[linear-gradient(90deg,#074783,#1566b3_28%,#3d94d8_52%,#ee6c2a_88%)]" />

        <header className="sticky top-0 z-40 border-b border-line bg-[linear-gradient(90deg,#0f171f,#17232e_55%,#0f171f)]">
          {/*
            모바일에서는 한 줄에 다 들어가지 않는다. flex 아이템은 min-width 가 auto 라
            한글 라벨이 min-content(한 글자)까지 찌그러져 세로로 쌓이므로, 좁은 화면에서는
            wrap 으로 탭을 둘째 줄에 통째로 내린다(NavTabs 의 order-3 / w-full).
          */}
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-8 px-4 sm:h-14 sm:flex-nowrap sm:items-stretch sm:px-5">
            <Link href="/" className="order-1 flex h-12 shrink-0 items-center gap-2.5 self-center sm:h-auto">
              <span className="font-display text-[22px] font-bold leading-none tracking-[-0.02em] text-fg">
                {TARGET_LEGION}
              </span>
              <span className="h-3.5 w-px bg-line-strong" />
              <span className="font-display text-[11px] font-medium uppercase tracking-[0.18em] text-brand">
                Aion2
              </span>
            </Link>

            <NavTabs />

            <div className="order-2 ml-auto flex shrink-0 items-center gap-3 sm:order-3">
              <Link
                href="/admin"
                className={
                  admin
                    ? "tag border border-gold/40 bg-gold/12 text-gold"
                    : "text-xs font-medium text-faint transition-colors hover:text-muted"
                }
              >
                {admin ? "관리자 모드" : "관리자"}
              </Link>
            </div>
          </div>
        </header>

        {isLocalDb() && (
          <div className="border-b border-gold/20 bg-gold/[0.07]">
            <p className="mx-auto max-w-[1180px] px-5 py-1.5 text-[11.5px] text-gold/90">
              로컬 테스트 모드 · Supabase 대신 <code className="font-mono">.data/dev-db.json</code> 에 저장 중이며 샘플
              멤버가 섞여 있습니다.
            </p>
          </div>
        )}

        <main className="mx-auto max-w-[1180px] px-5 py-9">{children}</main>

        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-3 gap-y-1 px-5 py-6 text-[11.5px] text-faint">
            <span>
              캐릭터 정보 출처 ·{" "}
              <a
                href="https://aion2.plaync.com/ko-kr/characters/index"
                target="_blank"
                rel="noreferrer"
                className="text-dim transition-colors hover:text-brand"
              >
                아이온2 캐릭터 정보실
              </a>
            </span>
            <span className="text-line-strong">|</span>
            <span>{SERVER_NAME} · {RACE_NAME} · {TARGET_LEGION}</span>
            <span className="ml-auto">All rights reserved. &copy; 은쁨/시엘</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
