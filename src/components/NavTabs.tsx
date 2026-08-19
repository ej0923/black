"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/info", label: "정보공유" },
  { href: "/register", label: "멤버등록" },
  { href: "/roster", label: "멤버목록" },
  { href: "/parties", label: "파티모집" },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex h-full items-stretch gap-6">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-on={active}
            className="group relative flex items-center text-[15.5px] font-semibold text-dim transition-colors hover:text-fg data-[on=true]:text-fg"
          >
            {item.label}
            <span className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 scale-x-0 bg-brand transition-transform duration-150 group-data-[on=true]:scale-x-100" />
          </Link>
        );
      })}
    </nav>
  );
}
