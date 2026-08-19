/**
 * 글 본문 HTML 정제기 — 허용 목록 방식.
 *
 * 에디터가 만들어내는 HTML 을 그대로 innerHTML 로 그리면 XSS 가 된다.
 * 이 서비스는 anon 키로 Supabase 에 붙기 때문에(supabase/schema.sql 참고)
 * 키만 알면 관리자 UI 를 거치지 않고 REST 로 직접 행을 밀어넣을 수 있다.
 * 즉 **DB 에 든 HTML 은 관리자가 쓴 것이라고 신뢰할 수 없다.**
 * 그래서 저장할 때와 화면에 그릴 때 양쪽에서 통과시킨다.
 *
 * 허용 목록에 없는 태그는 껍데기만 버리고 안쪽 내용은 살린다.
 * script 처럼 내용 자체가 위험한 것들은 통째로 버린다.
 */

/** 닫는 태그가 없는 태그 */
const VOID_TAGS = new Set(["br", "hr", "img"]);

/** 태그도 내용도 통째로 버릴 것들 */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  // iframe 은 여기 없다. 유튜브 embed 하나만 따로 다룬다 — sanitizeHtml 안의 iframe 처리 참고.
  "object",
  "embed",
  "svg",
  "math",
  "noscript",
  "template",
  "textarea",
  "title",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "option",
]);

/** 태그 → 허용 속성 */
const ALLOWED: Record<string, string[]> = {
  p: ["style"],
  div: ["style"],
  span: ["style"],
  br: [],
  hr: [],
  b: ["style"],
  strong: ["style"],
  i: ["style"],
  em: ["style"],
  u: ["style"],
  s: ["style"],
  strike: ["style"],
  del: ["style"],
  mark: ["style"],
  sub: [],
  sup: [],
  h1: ["style"],
  h2: ["style"],
  h3: ["style"],
  h4: ["style"],
  blockquote: ["style"],
  pre: ["style"],
  code: ["style"],
  ul: ["style"],
  ol: ["style"],
  li: ["style"],
  a: ["href", "target", "rel", "style"],
  img: ["src", "alt", "style"],
  // execCommand 가 styleWithCSS 를 못 쓰는 브라우저에서 내놓는 형태
  font: ["color", "face", "size"],
};

/** style 속성에서 살려둘 CSS 속성 */
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
  "font-weight",
  "font-style",
  "text-decoration",
  "text-decoration-line",
  "text-align",
  "line-height",
  "width",
  "max-width",
  "height",
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * 엔티티를 실제 문자로 되돌린다.
 * `java&#115;cript:` 같은 우회를 막으려면 검사 전에 반드시 거쳐야 한다.
 */
function decodeEntities(input: string): string {
  return input.replace(/&(#[xX]?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);?/g, (match, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1] === "x" || body[1] === "X";
      const code = Number.parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return "";
      try {
        return String.fromCodePoint(code);
      } catch {
        return "";
      }
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? match;
  });
}

function escapeText(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(input: string): string {
  return escapeText(input).replace(/"/g, "&quot;");
}

/** http/https 절대주소만 통과. 그 외(javascript:, data:, vbscript: …)는 전부 버린다. */
function safeUrl(raw: string): string | null {
  // 제어문자와 공백은 스킴을 숨기는 데 쓰인다(`java<TAB>script:`). 검사 전에 털어낸다.
  const cleaned = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u00a0\u2000-\u200f\ufeff]/g, "");
  if (!/^https?:\/\/[^\s]+$/i.test(cleaned)) return null;
  if (cleaned.includes('"') || cleaned.includes("<") || cleaned.includes(">")) return null;
  return cleaned;
}

/** style 속성을 허용된 CSS 속성만 남겨 다시 조립한다. */
function safeStyle(raw: string): string | null {
  const decoded = decodeEntities(raw);
  // url(...) 과 CSS 주석은 값 안에 무엇이든 숨길 수 있다. 통째로 거절한다.
  if (/url\s*\(|expression\s*\(|\/\*|\\|<|>/i.test(decoded)) return null;

  const kept: string[] = [];
  for (const chunk of decoded.split(";")) {
    const colon = chunk.indexOf(":");
    if (colon < 0) continue;

    const prop = chunk.slice(0, colon).trim().toLowerCase();
    const value = chunk.slice(colon + 1).trim();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;
    if (!value || value.length > 120) continue;
    // 색·크기·글꼴 이름에 필요한 문자만
    if (!/^[a-zA-Z0-9\s,.#%()'"/_-]+$/.test(value)) continue;

    kept.push(`${prop}: ${value}`);
  }

  return kept.length ? kept.join("; ") : null;
}

// ── 유튜브 ──────────────────────────────────────────────────────────
//
// iframe 은 남의 문서를 내 페이지 안에서 실행하는 것이므로 주소를 조금도 믿을 수 없다.
// 그래서 "정제"하지 않고 **다시 만든다** — 주소에서 영상 id 만 뽑아내 우리가 아는
// embed 주소로 조립하고, 속성도 입력에서 받지 않고 아래 값으로 고정한다.
// 입력에 무엇이 들어 있든 살아남는 것은 11자리 id 와 시작 초뿐이다.

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** ?t=90 / ?t=1m30s / ?start=90 → 초. 없거나 이상하면 0. */
function startSeconds(raw: string | null): number {
  if (!raw) return 0;
  if (/^\d{1,6}$/.test(raw)) return Number(raw);
  const m = /^(?:(\d{1,2})h)?(?:(\d{1,3})m)?(?:(\d{1,3})s)?$/i.exec(raw);
  if (!m || !(m[1] || m[2] || m[3])) return 0;
  return Math.min(Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0), 999_999);
}

/**
 * 유튜브 주소 → 우리가 쓰는 embed 주소. 유튜브 영상이 아니면 null.
 *
 * watch?v= / youtu.be / shorts / live / embed 를 모두 받는다.
 * 돌려주는 주소는 항상 youtube-nocookie.com 이다.
 */
export function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = decodeEntities(String(raw)).trim();
  if (!cleaned || /[\s"'<>\\]/.test(cleaned)) return null;

  let url: URL;
  try {
    url = new URL(cleaned.startsWith("//") ? `https:${cleaned}` : cleaned);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  let id: string | null = null;
  if (host === "youtu.be") {
    id = parts[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["embed", "shorts", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  }
  if (!id || !YT_ID_RE.test(id)) return null;

  const start = startSeconds(url.searchParams.get("start") ?? url.searchParams.get("t"));
  return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
}

/** 화면에 올릴 iframe 은 항상 이 모양이다. 크기는 CSS(.prose-post iframe)가 잡는다. */
function youtubeIframe(src: string): string {
  return (
    `<iframe src="${escapeAttr(src)}" title="YouTube 동영상" loading="lazy"` +
    ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"` +
    ` referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`
  );
}

const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

/** 태그의 속성 뭉치에서 이름 하나의 값만 꺼낸다 */
function attrValue(rawAttrs: string, name: string): string | null {
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(rawAttrs))) {
    if (m[1].toLowerCase() === name) return m[2] ?? m[3] ?? m[4] ?? "";
  }
  return null;
}

function sanitizeAttrs(tag: string, rawAttrs: string): string {
  const allowed = ALLOWED[tag];
  if (!allowed || allowed.length === 0) return "";

  const out: string[] = [];
  const seen = new Set<string>();

  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(rawAttrs))) {
    const name = m[1].toLowerCase();
    if (!allowed.includes(name) || seen.has(name)) continue;

    const value = m[2] ?? m[3] ?? m[4] ?? "";

    if (name === "href" || name === "src") {
      const url = safeUrl(value);
      if (!url) continue;
      seen.add(name);
      out.push(`${name}="${escapeAttr(url)}"`);
      continue;
    }

    if (name === "style") {
      const style = safeStyle(value);
      if (!style) continue;
      seen.add(name);
      out.push(`style="${escapeAttr(style)}"`);
      continue;
    }

    if (name === "target") {
      seen.add(name);
      out.push(`target="_blank"`);
      continue;
    }
    if (name === "rel") continue; // a 태그에는 아래에서 직접 붙인다

    const plain = decodeEntities(value).slice(0, 200);
    if (/[<>]/.test(plain)) continue;
    seen.add(name);
    out.push(`${name}="${escapeAttr(plain)}"`);
  }

  // 새 탭으로 여는 링크는 opener 를 끊어야 한다
  if (tag === "a") out.push(`rel="noopener noreferrer nofollow"`);

  return out.length ? ` ${out.join(" ")}` : "";
}

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/y;

/**
 * 허용 목록에 없는 것은 전부 버리고 안전한 HTML 만 돌려준다.
 * 입력이 어떤 쓰레기여도 예외를 던지지 않는다.
 */
export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return "";

  const html = String(input).slice(0, 200_000);
  const out: string[] = [];
  const stack: string[] = [];
  let i = 0;

  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      out.push(escapeText(decodeEntities(html.slice(i))));
      break;
    }
    if (lt > i) out.push(escapeText(decodeEntities(html.slice(i, lt))));

    // 주석 / doctype / 처리 지시자 — 통째로 버린다
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html.startsWith("<!", lt) || html.startsWith("<?", lt)) {
      const end = html.indexOf(">", lt);
      i = end < 0 ? html.length : end + 1;
      continue;
    }

    TAG_RE.lastIndex = lt;
    const m = TAG_RE.exec(html);
    if (!m) {
      // 태그가 아닌 '<' — 문자로 취급
      out.push("&lt;");
      i = lt + 1;
      continue;
    }

    const closing = m[1] === "/";
    const tag = m[2].toLowerCase();
    const rawAttrs = m[3] ?? "";
    i = TAG_RE.lastIndex;

    if (DROP_WITH_CONTENT.has(tag)) {
      if (!closing) {
        // 짝이 되는 닫는 태그까지 내용을 통째로 건너뛴다
        const closeRe = new RegExp(`</${tag}\\s*>`, "gi");
        closeRe.lastIndex = i;
        const found = closeRe.exec(html);
        i = found ? found.index + found[0].length : html.length;
      }
      continue;
    }

    // 유튜브 embed 만 살아남는 iframe. 속성은 입력에서 받지 않고 새로 만들어 붙이고,
    // 태그 안쪽(스크립트가 못 도는 브라우저용 대체 내용)은 통째로 버린다.
    if (tag === "iframe") {
      if (closing) continue;

      const embed = youtubeEmbedUrl(attrValue(rawAttrs, "src"));
      if (embed) out.push(youtubeIframe(embed));

      // 짝이 되는 닫는 태그가 있으면 거기까지 건너뛴다. 없으면 그냥 지나간다 —
      // 없는 짝을 찾겠다고 남은 글을 통째로 삼키면 안 된다.
      const closeRe = /<\/iframe\s*>/gi;
      closeRe.lastIndex = i;
      const found = closeRe.exec(html);
      if (found) i = found.index + found[0].length;
      continue;
    }

    if (!(tag in ALLOWED)) continue; // 껍데기만 버리고 안쪽은 계속 처리

    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at < 0) continue; // 열린 적 없는 닫는 태그
      for (let d = stack.length - 1; d >= at; d--) out.push(`</${stack[d]}>`);
      stack.length = at;
      continue;
    }

    const attrs = sanitizeAttrs(tag, rawAttrs);
    if (VOID_TAGS.has(tag)) {
      // img 는 주소가 살아남지 못했으면 껍데기만 남으므로 버린다
      if (tag === "img" && !attrs.includes("src=")) continue;
      out.push(`<${tag}${attrs} />`);
      continue;
    }

    // 중첩이 너무 깊으면 더 열지 않는다
    if (stack.length > 60) continue;

    out.push(`<${tag}${attrs}>`);
    stack.push(tag);
  }

  for (let d = stack.length - 1; d >= 0; d--) out.push(`</${stack[d]}>`);

  return out.join("");
}

/** 미리보기·목록에 쓸 순수 텍스트 요약 */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  return decodeEntities(
    String(input)
      .replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}
