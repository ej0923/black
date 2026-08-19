"use client";

import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from "@floating-ui/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavItem =
  | { href: string; label: string }
  | { label: string; children: { href: string; label: string }[] };

/**
 * 헤더 탭. "공대모집" 은 페이지가 아니라 묶음이라 눌러야 하위 메뉴가 펼쳐진다.
 *
 * 하위 항목의 주소를 바꾸면 아래 children 만 고치면 된다 — 열림/활성 판정은
 * 전부 이 배열에서 나온다.
 */
const NAV: NavItem[] = [
  { href: "/", label: "홈" },
  { href: "/info", label: "정보공유" },
  {
    label: "공대모집",
    children: [
      { href: "/register", label: "멤버등록" },
      { href: "/roster", label: "멤버목록" },
      { href: "/parties", label: "공대지원" },
    ],
  },
];

/** "/" 는 완전 일치라야 한다. 안 그러면 모든 주소에서 홈이 켜진다. */
function matches(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const TAB_CLASS =
  "group relative flex shrink-0 items-center whitespace-nowrap text-[15.5px] font-semibold text-dim transition-colors hover:text-fg data-[on=true]:text-fg";

/* 모바일 nav 는 overflow-x-auto 라 -bottom-px 면 밑줄이 잘린다. 상자 안에 붙인다. */
const UNDERLINE_CLASS =
  "pointer-events-none absolute inset-x-0 bottom-0 h-0.5 scale-x-0 bg-brand transition-transform duration-150 group-data-[on=true]:scale-x-100 sm:-bottom-px";

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="order-3 flex h-11 w-full items-stretch gap-3 overflow-x-auto sm:order-2 sm:h-full sm:w-auto sm:gap-6 sm:overflow-x-visible">
      {NAV.map((item) =>
        "children" in item ? (
          <NavMenu key={item.label} item={item} pathname={pathname} />
        ) : (
          <Link key={item.href} href={item.href} data-on={matches(pathname, item.href)} className={TAB_CLASS}>
            {item.label}
            <span className={UNDERLINE_CLASS} />
          </Link>
        ),
      )}
    </nav>
  );
}

function NavMenu({
  item,
  pathname,
}: {
  item: { label: string; children: { href: string; label: string }[] };
  pathname: string;
}) {
  const [open, setOpen] = useState(false);

  // 하위 페이지 중 하나에 있으면 부모 탭도 켜 둔다.
  const active = item.children.some((child) => matches(pathname, child.href));

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [offset(6), flip({ padding: 8 }), shift({ padding: 8 })],
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: "menu" }),
  ]);

  return (
    <>
      <button
        ref={refs.setReference}
        type="button"
        data-on={active}
        className={`${TAB_CLASS} gap-1`}
        {...getReferenceProps()}
      >
        {item.label}
        <svg
          viewBox="0 0 10 6"
          aria-hidden
          className={`h-1.5 w-2.5 fill-none stroke-current stroke-[1.6] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path d="M1 1l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={UNDERLINE_CLASS} />
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              // Floating UI 의 setFloating 은 ref 를 읽는 게 아니라 콜백 ref 설정자다.
              // eslint-disable-next-line react-hooks/refs
              ref={refs.setFloating}
              style={floatingStyles}
              className="z-50 min-w-[8.5rem] rounded-lg border border-line bg-[#17232e] py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
              {...getFloatingProps()}
            >
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  role="menuitem"
                  data-on={matches(pathname, child.href)}
                  onClick={() => setOpen(false)}
                  className="block whitespace-nowrap px-3.5 py-2 text-[14px] font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-fg data-[on=true]:text-brand"
                >
                  {child.label}
                </Link>
              ))}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
