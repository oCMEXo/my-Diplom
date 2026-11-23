export const DEVICES = [
  { name: "small-phone", width: 320, height: 640, touch: true },
  { name: "phone", width: 375, height: 812, touch: true },
  { name: "phone-landscape", width: 812, height: 375, touch: true },
  { name: "tablet", width: 768, height: 1024, touch: true },
  { name: "tablet-landscape", width: 1024, height: 768, touch: true },
  { name: "desktop", width: 1440, height: 900, touch: false },
  { name: "desktop-zoom-200", width: 720, height: 450, touch: false },
] as const;

export interface Problem {
  kind: "page-scrolls-sideways" | "small-target" | "overlap" | "contrast";
  detail: string;
}

export function auditPage(): Problem[] {
  type Color = { r: number; g: number; b: number; a: number };
  const problems: Problem[] = [];
  const MIN_TARGET = 44;

  const visible = (el: Element) => {
    const box = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
  };
  const label = (el: Element) =>
    (el.getAttribute("aria-label") || el.textContent || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);

  const root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) {
    problems.push({ kind: "page-scrolls-sideways", detail: `${root.scrollWidth} > ${root.clientWidth}` });
  }

  const selector =
    "button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=menuitem], [role=tab], [role=radio], [role=checkbox], [role=switch]";
  const interactive = Array.from(document.querySelectorAll(selector)).filter(
    (el) =>
      visible(el) &&
      !el.closest(".monaco-editor, .xterm, .konvajs-content, [aria-hidden=true], [inert]") &&
      !(el.tagName === "A" && el.closest("p")),
  );

  if (window.matchMedia("(pointer: coarse)").matches) {
    for (const el of interactive) {
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
      const box = el.getBoundingClientRect();
      if (Math.round(box.height) < MIN_TARGET || Math.round(box.width) < MIN_TARGET) {
        problems.push({ kind: "small-target", detail: `${label(el)} ${Math.round(box.width)}x${Math.round(box.height)}` });
      }
    }
  }

  const boxes = interactive.map((el) => ({ el, rects: Array.from(el.getClientRects()) }));
  const hit = (one: DOMRect, two: DOMRect) =>
    Math.min(one.right, two.right) - Math.max(one.left, two.left) > 2 &&
    Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top) > 2;
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      if (a.rects.some((one) => b.rects.some((two) => hit(one, two)))) {
        problems.push({ kind: "overlap", detail: `${label(a.el)} / ${label(b.el)}` });
      }
    }
  }

  const parse = (value: string): Color | null => {
    const match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const [r, g, b, a = 1] = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r, g, b, a };
  };
  const luminance = ({ r, g, b }: Color) => {
    const channel = (v: number) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const blend = (top: Color, bottom: Color): Color => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const background = (el: Element): Color | null => {
    const layers: Color[] = [];
    for (let node: Element | null = el; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.backgroundImage !== "none") return null;
      const color = parse(style.backgroundColor);
      if (color && color.a > 0) {
        layers.push(color);
        if (color.a >= 1) break;
      }
    }
    let result: Color = { r: 255, g: 255, b: 255, a: 1 };
    if (layers.length && layers[layers.length - 1].a >= 1) result = layers.pop()!;
    for (const layer of layers.reverse()) result = blend(layer, result);
    return result;
  };

  const seen = new Set<Element>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent?.trim() || !el || seen.has(el)) continue;
    seen.add(el);
    if (!visible(el) || el.closest(".monaco-editor, .xterm, script, style, [aria-hidden=true], :disabled, [aria-disabled=true]")) continue;
    const style = getComputedStyle(el);
    const text = parse(style.color);
    const behind = background(el);
    if (!text || !behind) continue;
    const shown = blend({ ...text, a: text.a * Number(style.opacity) }, behind);
    const [high, low] = [luminance(shown), luminance(behind)].sort((x, y) => y - x);
    const ratio = (high + 0.05) / (low + 0.05);
    const size = parseFloat(style.fontSize);
    const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) {
      problems.push({ kind: "contrast", detail: `${ratio.toFixed(2)} "${label(el)}" <${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 80)}">` });
    }
  }
  return problems;
}
