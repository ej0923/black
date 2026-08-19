"use client";

import { useEffect, useId, useRef, useState } from "react";
import { sanitizeHtml, youtubeEmbedUrl } from "@/lib/sanitize";

/**
 * 홈 글 본문 에디터.
 *
 * contentEditable + document.execCommand 로 만들었다. execCommand 는 표준에서
 * deprecated 됐지만 모든 브라우저가 여전히 지원하고, 이 정도 도구모음(볼드·밑줄·
 * 색·크기·폰트·사진·정렬)에는 외부 라이브러리를 들일 이유가 없다.
 *
 * 내보내는 값은 HTML 문자열이다. 저장할 때도 그릴 때도 서버에서 다시 정제하므로
 * 여기서의 정제는 편의(붙여넣기 청소)일 뿐 보안 경계가 아니다.
 */

const FONTS: { label: string; css: string }[] = [
  { label: "기본", css: "" },
  { label: "아이온2", css: "Aion2, 'Pretendard Variable', sans-serif" },
  { label: "프리텐다드", css: "'Pretendard Variable', Pretendard, sans-serif" },
  { label: "명조", css: "'Nanum Myeongjo', 'Apple SD Gothic Neo', serif" },
  { label: "고정폭", css: "'SF Mono', Consolas, 'D2Coding', monospace" },
];

const SIZES = [13, 15, 18, 22, 28, 36, 48];

/** 화면 전체와 한 벌로 보이도록 프로젝트 팔레트 안에서만 고른다. */
const COLORS = [
  "#e8eef4",
  "#9db0c1",
  "#66788a",
  "#3d94d8",
  "#1566b3",
  "#ee6c2a",
  "#e9a43a",
  "#09ce9f",
  "#d33939",
  "#a36ce6",
  "#e58370",
  "#8fc871",
  "#ffffff",
  "#000000",
];

/** execCommand("fontSize") 는 1~7 만 받는다. 7 로 표시해두고 원하는 px 로 바꿔치기한다. */
const SIZE_SLOT = "7";

type Props = {
  /** 처음 채워 넣을 HTML. 이후 이 값이 바뀌어도 편집 중 내용을 덮어쓰지 않는다. */
  initialHtml?: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /**
   * 편집 영역에 덧붙일 클래스. 분류별 본문 규칙(예: 공지사항 사진 300px)을
   * 편집 중에도 그대로 보여주기 위한 것이다. 저장 후 화면과 같은 클래스를 준다.
   */
  bodyClassName?: string;
};

export default function RichTextEditor({
  initialHtml = "",
  onChange,
  placeholder,
  minHeight = 260,
  bodyClassName = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [empty, setEmpty] = useState(true);
  const paletteId = useId();

  // 최초 1회만 주입한다. 매 입력마다 innerHTML 을 다시 쓰면 커서가 맨 앞으로 튄다.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = sanitizeHtml(initialHtml);
    setEmpty(!el.textContent?.trim() && !el.querySelector("img, iframe"));
    // Enter 가 <div> 대신 <p> 를 만들도록
    try {
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch {
      // 지원하지 않는 브라우저는 기본값으로 둔다
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit() {
    const el = ref.current;
    if (!el) return;
    setEmpty(!el.textContent?.trim() && !el.querySelector("img, iframe"));
    onChange(el.innerHTML);
  }

  /** 버튼을 눌러도 편집 영역의 선택이 풀리지 않게 한 뒤 명령을 실행한다. */
  function exec(command: string, value?: string, useCss = true) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, useCss ? "true" : "false");
      document.execCommand(command, false, value);
    } catch {
      // 지원하지 않는 명령은 조용히 넘어간다
    }
    emit();
  }

  function applyFontSize(px: number) {
    const el = ref.current;
    if (!el) return;
    el.focus();
    try {
      // CSS 모드에서는 px 를 못 받으므로 <font size="7"> 로 표시한 뒤 직접 바꾼다.
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, SIZE_SLOT);
    } catch {
      return;
    }
    el.querySelectorAll(`font[size="${SIZE_SLOT}"]`).forEach((node) => {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (node.firstChild) span.appendChild(node.firstChild);
      node.replaceWith(span);
    });
    emit();
  }

  function insertImage() {
    const url = window.prompt("이미지 주소를 붙여넣으세요.\n예) https://i.imgur.com/abc123.png");
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert("http:// 또는 https:// 로 시작하는 주소만 넣을 수 있습니다.");
      return;
    }
    const el = ref.current;
    if (!el) return;
    el.focus();
    // sanitizeHtml 이 그대로 통과시키는 형태로 만들어 넣는다
    const safe = sanitizeHtml(`<img src="${url.trim()}" alt="" />`);
    if (!safe) {
      window.alert("이 주소는 사용할 수 없습니다.");
      return;
    }
    document.execCommand("insertHTML", false, safe);
    emit();
  }

  /** 유튜브 주소를 넣으면 글에서 바로 재생되는 영상 칸이 들어간다. */
  function insertYoutube() {
    const url = window.prompt(
      "유튜브 주소를 붙여넣으세요.\n예) https://www.youtube.com/watch?v=… 또는 https://youtu.be/…",
    );
    if (!url) return;

    const embed = youtubeEmbedUrl(url);
    if (!embed) {
      window.alert("유튜브 영상 주소가 아닙니다. 주소창의 주소를 그대로 붙여넣어 주세요.");
      return;
    }

    const el = ref.current;
    if (!el) return;
    el.focus();
    // 정제기가 iframe 을 다시 만들어 내놓는다. 뒤에 빈 문단을 붙여 계속 쓸 수 있게 한다.
    const safe = sanitizeHtml(`<iframe src="${embed}"></iframe><p><br /></p>`);
    document.execCommand("insertHTML", false, safe);
    emit();
  }

  function insertLink() {
    const url = window.prompt("링크 주소를 붙여넣으세요.");
    if (!url) return;
    if (!/^https?:\/\//i.test(url.trim())) {
      window.alert("http:// 또는 https:// 로 시작하는 주소만 넣을 수 있습니다.");
      return;
    }
    exec("createLink", url.trim());
  }

  return (
    <div className="border border-line-strong bg-[#0e161d]">
      {/* ── 도구모음 ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1 border-b border-line bg-surface px-2 py-1.5">
        <select
          aria-label="글꼴"
          defaultValue=""
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const css = e.target.value;
            if (css) exec("fontName", css);
            else exec("removeFormat");
            e.target.value = "";
          }}
          className="input h-7 w-[86px] px-1.5 text-[12px]"
        >
          <option value="" disabled>
            글꼴
          </option>
          {FONTS.map((f) => (
            <option key={f.label} value={f.css}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          aria-label="글자 크기"
          defaultValue=""
          onChange={(e) => {
            const px = Number(e.target.value);
            if (px) applyFontSize(px);
            e.target.value = "";
          }}
          className="input h-7 w-[74px] px-1.5 text-[12px]"
        >
          <option value="" disabled>
            크기
          </option>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}px
            </option>
          ))}
        </select>

        <Divider />

        <ToolButton label="굵게" title="굵게 (Ctrl+B)" onClick={() => exec("bold")}>
          <span className="font-bold">가</span>
        </ToolButton>
        <ToolButton label="기울임" title="기울임 (Ctrl+I)" onClick={() => exec("italic")}>
          <span className="italic">가</span>
        </ToolButton>
        <ToolButton label="밑줄" title="밑줄 (Ctrl+U)" onClick={() => exec("underline")}>
          <span className="underline underline-offset-2">가</span>
        </ToolButton>
        <ToolButton label="취소선" title="취소선" onClick={() => exec("strikeThrough")}>
          <span className="line-through">가</span>
        </ToolButton>

        <Divider />

        {/* 색 */}
        <div className="relative">
          <ToolButton label="글자 색" title="글자 색" onClick={() => setColorOpen((o) => !o)} active={colorOpen}>
            <span className="flex flex-col items-center leading-none">
              <span className="text-[11px] font-bold">가</span>
              <span className="mt-0.5 h-[3px] w-3.5 bg-[linear-gradient(90deg,#3d94d8,#ee6c2a,#09ce9f)]" />
            </span>
          </ToolButton>
          {colorOpen && (
            <div
              id={paletteId}
              className="absolute left-0 top-full z-30 mt-1 grid w-[152px] grid-cols-7 gap-1 border border-line-strong bg-raised p-1.5 shadow-lg"
            >
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  aria-label={`색 ${c}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    exec("foreColor", c);
                    setColorOpen(false);
                  }}
                  style={{ background: c }}
                  className="h-4 w-4 border border-line-strong transition-transform hover:scale-110"
                />
              ))}
            </div>
          )}
        </div>

        <Divider />

        <ToolButton label="왼쪽 정렬" title="왼쪽 정렬" onClick={() => exec("justifyLeft")}>
          <Bars widths={[12, 8, 12, 7]} align="left" />
        </ToolButton>
        <ToolButton label="가운데 정렬" title="가운데 정렬" onClick={() => exec("justifyCenter")}>
          <Bars widths={[12, 8, 12, 7]} align="center" />
        </ToolButton>
        <ToolButton label="목록" title="글머리 기호" onClick={() => exec("insertUnorderedList")}>
          <span className="text-[13px] leading-none">•≡</span>
        </ToolButton>

        <Divider />

        <ToolButton label="사진 추가" title="사진 추가 (이미지 주소)" onClick={insertImage}>
          <span className="text-[13px] leading-none">🖼</span>
        </ToolButton>
        <ToolButton label="동영상 추가" title="유튜브 영상 넣기" onClick={insertYoutube}>
          <span className="text-[13px] leading-none">▶</span>
        </ToolButton>
        <ToolButton label="링크" title="링크 걸기" onClick={insertLink}>
          <span className="text-[13px] leading-none">🔗</span>
        </ToolButton>
        <ToolButton
          label="구분선"
          title="가로 구분선"
          onClick={() => {
            ref.current?.focus();
            document.execCommand("insertHorizontalRule");
            emit();
          }}
        >
          <span className="text-[13px] leading-none">―</span>
        </ToolButton>

        <Divider />

        <ToolButton label="서식 지우기" title="서식 지우기" onClick={() => exec("removeFormat")}>
          <span className="text-[12px] leading-none">✕가</span>
        </ToolButton>
      </div>

      {/* ── 편집 영역 ────────────────────────────────────── */}
      <div className="relative">
        {empty && placeholder && (
          <p className="pointer-events-none absolute left-3.5 top-3 text-[13.5px] text-faint">{placeholder}</p>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="본문"
          spellCheck={false}
          style={{ minHeight }}
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            // 웹에서 복사한 내용에는 별게 다 들어온다. 서식은 살리되 위험한 것만 걷어낸다.
            e.preventDefault();
            const html = e.clipboardData.getData("text/html");
            const text = e.clipboardData.getData("text/plain");
            const safe = html ? sanitizeHtml(html) : "";
            if (safe) document.execCommand("insertHTML", false, safe);
            else if (text) document.execCommand("insertText", false, text);
            emit();
          }}
          className={`prose-post rte-body ${bodyClassName} max-h-[560px] overflow-y-auto px-3.5 py-3 text-[13.5px] outline-none`}
        />
      </div>

      <p className="border-t border-line px-3.5 py-1.5 text-[11px] text-faint">
        Enter 로 문단 바꿈 · Shift+Enter 로 한 줄 바꿈 · 사진은 이미지 주소를, 영상은 유튜브 주소를 붙여넣습니다
      </p>
    </div>
  );
}

function ToolButton({
  label,
  title,
  onClick,
  active,
  children,
}: {
  label: string;
  title: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      data-on={Boolean(active)}
      // 눌러도 편집 영역의 선택이 풀리면 안 된다
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex h-7 min-w-7 items-center justify-center rounded-sm px-1.5 text-muted transition-colors hover:bg-raised hover:text-fg data-[on=true]:bg-raised data-[on=true]:text-brand"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-line" />;
}

function Bars({ widths, align }: { widths: number[]; align: "left" | "center" }) {
  return (
    <span className={`flex w-3.5 flex-col gap-[2px] ${align === "center" ? "items-center" : "items-start"}`}>
      {widths.map((w, i) => (
        <span key={i} style={{ width: w }} className="h-[1.5px] bg-current" />
      ))}
    </span>
  );
}
