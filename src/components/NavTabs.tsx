"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/info", label: "정보공유" },
  { href: "/register", label: "멤버등록" },
  { href: "/roster", label: "멤버목록" },
  { href: "/parties", label: "공대모집" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="order-3 flex h-11 w-full items-stretch gap-3 overflow-x-auto sm:order-2 sm:h-full sm:w-auto sm:gap-6 sm:overflow-x-visible">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-on={active}
            className="group relative flex shrink-0 items-center whitespace-nowrap text-[15.5px] font-semibold text-dim transition-colors hover:text-fg data-[on=true]:text-fg"
          >
            {item.label}
            {/* 모바일 nav 는 overflow-x-auto 라 -bottom-px 면 밑줄이 잘린다. 상자 안에 붙인다. */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-brand transition-transform duration-150 group-data-[on=true]:scale-x-100 sm:-bottom-px" />
          </Link>
        );
      })}
    </nav>
  );
}
