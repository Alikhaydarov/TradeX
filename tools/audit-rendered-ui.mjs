#!/usr/bin/env node
/**
 * Audits the UI as a browser actually paints it.
 *
 * The other two audits (audit:ui, audit:responsive) grep source files, which
 * catches shapes but never the thing a visitor experiences: text that is too
 * faint to read, a control too small to hit, a row that pushes the page
 * sideways. Those only exist after CSS cascades and layout runs, so this one
 * drives a real browser over a real build.
 *
 * Two decisions make the numbers trustworthy rather than merely plausible:
 *
 *   Colours are resolved by painting them on a canvas, not by parsing the
 *   computed value. Tailwind v4 emits `oklab(...)`, and a regex reading digits
 *   out of that returns nonsense - an early version of this script reported
 *   every dark-section label at exactly 1.0:1 for that reason. Painting also
 *   recovers alpha, so translucent text is composited over its real backdrop
 *   before the ratio is taken.
 *
 *   Animation is frozen. A cross-fading element is mid-transition whenever the
 *   snapshot lands, so an animated page reports different failures on every
 *   run. With transitions off, each element sits in its settled state and the
 *   result is the same every time.
 *
 * Requires Playwright's chromium:  npx playwright install chromium
 * Point AUDIT_CHROMIUM at an existing binary to use that instead.
 */
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const BASE = process.env.AUDIT_URL || "http://localhost:3111";
const PATHS = (process.env.AUDIT_PATHS || "/,/pricing,/dashboard,/trades,/community").split(",");
const VIEWPORTS = [
  { name: "320", width: 320, height: 640 },
  { name: "375", width: 375, height: 812 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

/**
 * Findings that are understood and deliberately allowed. Each needs a reason -
 * an unexplained entry here is just a hidden failure.
 */
const ALLOWED = [
  {
    match: (f) => f.kind === "contrast" && f.size <= 8,
    why: "Miniature app mock-ups in the landing showcase render at 7px on purpose. They are pictures of the product, and every one is aria-hidden, with the real label and description in full-size text beside them.",
  },
];

const MIN_TARGET = 24; // WCAG 2.5.8 target size (minimum)

function collect({ minTarget }) {
  const results = [];
  const docW = document.documentElement.clientWidth;

  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });

  // Paint the colour to resolve any colour space, then recover alpha by
  // painting it over white and over black and comparing.
  const toRgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    const solid = ctx.fillStyle;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = solid; ctx.fillRect(0, 0, 1, 1);
    const onWhite = ctx.getImageData(0, 0, 1, 1).data;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = solid; ctx.fillRect(0, 0, 1, 1);
    const onBlack = ctx.getImageData(0, 0, 1, 1).data;
    const a = 1 - (onWhite[0] - onBlack[0]) / 255;
    const rgb = a === 0 ? [0, 0, 0] : [0, 1, 2].map((i) => Math.min(255, Math.max(0, onBlack[i] / a)));
    return { rgb, a };
  };
  const over = (fg, bg) => fg.rgb.map((c, i) => c * fg.a + bg[i] * (1 - fg.a));
  const backdrop = (el) => {
    const layers = [];
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      const c = toRgba(getComputedStyle(n).backgroundColor);
      if (c.a > 0) { layers.push(c); if (c.a === 1) break; }
    }
    const root = toRgba(getComputedStyle(document.documentElement).backgroundColor);
    let base = root.a === 1 ? root.rgb : [255, 255, 255];
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  };
  const luminance = (c) => {
    const [r, g, b] = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const describe = (el) =>
    (el.className?.toString?.() || el.tagName.toLowerCase()).slice(0, 100);
  const invisible = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity === 0) return true;
    }
    return false;
  };

  // Anything sticking out past the viewport - the page should never scroll
  // sideways, and naming the element is what makes it fixable.
  if (document.documentElement.scrollWidth > docW + 1) {
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).position === "fixed") continue;
      if (r.right > docW + 1 || r.left < -1) {
        results.push({ kind: "overflow", selector: describe(el), detail: `spans ${Math.round(r.left)}..${Math.round(r.right)} in ${docW}px` });
      }
    }
  }

  for (const el of document.querySelectorAll('a, button, [role="button"], input, select, textarea')) {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || invisible(el)) continue;

    if (r.height < minTarget || r.width < minTarget) {
      results.push({ kind: "target", selector: describe(el), detail: `${Math.round(r.width)}x${Math.round(r.height)}, minimum ${minTarget}` });
    }
    const name = (el.getAttribute("aria-label") || el.getAttribute("title") || el.textContent || el.getAttribute("placeholder") || "").trim();
    const labelled = el.getAttribute("aria-labelledby") || (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`));
    if (!name && !labelled) {
      results.push({ kind: "name", selector: describe(el), detail: "control has no accessible name" });
    }
  }

  const ids = new Map();
  for (const el of document.querySelectorAll("[id]")) ids.set(el.id, (ids.get(el.id) || 0) + 1);
  for (const [id, n] of ids) if (n > 1) results.push({ kind: "duplicate-id", selector: `#${id}`, detail: `${n} elements` });

  for (const img of document.querySelectorAll("img")) {
    if (img.getAttribute("alt") === null) {
      results.push({ kind: "img-alt", selector: describe(img), detail: "img without an alt attribute" });
    }
  }

  // Text sitting on top of something that is not one of its own ancestors.
  //
  // This is the case the contrast check above cannot see. It derives the
  // backdrop by walking parents, so text whose real backdrop is a sibling -
  // a product photo pulled up underneath a hero, say - measures against the
  // page background and passes while being unreadable on screen. Rather than
  // guess the composite, report that the backdrop is not what the DOM implies
  // and let a person look.
  const opaqueBackdrop = (el) => {
    if (["IMG", "VIDEO", "CANVAS", "SVG"].includes(el.tagName)) return true;
    const c = toRgba(getComputedStyle(el).backgroundColor);
    return c.a > 0.5;
  };
  for (const el of document.querySelectorAll("*")) {
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText || invisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;

    let intruder = null;
    for (const [fx, fy] of [[0.15, 0.5], [0.5, 0.5], [0.85, 0.5]]) {
      const x = r.left + r.width * fx;
      const y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
      const stack = document.elementsFromPoint(x, y);
      const self = stack.indexOf(el);
      if (self === -1) continue;
      for (const below of stack.slice(self + 1)) {
        if (below.contains(el)) continue;      // an ancestor is the normal case
        if (below === document.body || below === document.documentElement) break;
        if (opaqueBackdrop(below)) { intruder = below; break; }
      }
      if (intruder) break;
    }
    if (intruder) {
      results.push({
        kind: "backdrop",
        selector: describe(el),
        detail: `painted over <${intruder.tagName.toLowerCase()}> "${(intruder.className?.toString?.() || "").slice(0, 45)}" which is not an ancestor - contrast here is whatever that element happens to be`,
      });
    }
  }

  for (const el of document.querySelectorAll("*")) {
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || invisible(el)) continue;

    const cs = getComputedStyle(el);
    const bg = backdrop(el);
    const fg = toRgba(cs.color);
    const l1 = luminance(over(fg, bg));
    const l2 = luminance(bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
    const need = large ? 3 : 4.5;
    if (ratio < need) {
      results.push({
        kind: "contrast", selector: describe(el), size: Math.round(size),
        detail: `${ratio.toFixed(2)}:1, needs ${need}:1 at ${Math.round(size)}px - "${(el.textContent || "").trim().slice(0, 40)}"`,
      });
    }
  }
  return results;
}

async function main() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium");
    process.exit(2);
  }

  let server;
  if (!process.env.AUDIT_URL) {
    server = spawn("npm", ["run", "start"], { env: { ...process.env, PORT: "3111" }, stdio: "ignore" });
    for (let i = 0; i < 40; i++) {
      try { await fetch(BASE); break; } catch { await sleep(500); }
    }
  }

  // Honours a pre-installed browser (CI images, sandboxes) instead of insisting
  // on the copy Playwright downloads for its own version.
  const browser = await chromium.launch(
    process.env.AUDIT_CHROMIUM ? { executablePath: process.env.AUDIT_CHROMIUM } : {},
  );
  const findings = [];
  const pageErrors = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    // Settled state only: a transition caught halfway makes every run disagree.
    await context.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = "*,*::before,*::after{transition:none!important;animation:none!important}";
      document.addEventListener("DOMContentLoaded", () => document.head.append(style));
    });
    for (const path of PATHS) {
      const page = await context.newPage();
      page.on("pageerror", (e) => pageErrors.push({ kind: "page-error", vp: vp.name, path, selector: "-", detail: e.message.slice(0, 140) }));
      try {
        await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
        await page.waitForTimeout(250);
        for (const f of await page.evaluate(collect, { minTarget: MIN_TARGET })) findings.push({ vp: vp.name, path, ...f });
      } catch (error) {
        findings.push({ vp: vp.name, path, kind: "load", selector: "-", detail: error.message.slice(0, 140) });
      }
      await page.close();
    }
    await context.close();
  }
  await browser.close();
  server?.kill();

  const all = [...findings, ...pageErrors];
  const allowed = [];
  const failures = [];
  for (const f of all) {
    const rule = ALLOWED.find((a) => a.match(f));
    (rule ? allowed : failures).push(f);
  }

  // One line per distinct problem: the same style failing at four viewports is
  // one thing to fix, not four.
  const fold = (rows) => {
    const seen = new Map();
    for (const r of rows) {
      const key = `${r.kind}|${r.selector}|${r.detail}`;
      if (!seen.has(key)) seen.set(key, { ...r, paths: new Set() });
      seen.get(key).paths.add(r.path);
    }
    return [...seen.values()];
  };

  const unique = fold(failures);
  console.log(`Rendered UI audit: ${PATHS.length} paths x ${VIEWPORTS.length} viewports`);
  console.log(`  ${unique.length} distinct problems, ${fold(allowed).length} allowed by policy\n`);

  const order = ["load", "page-error", "overflow", "backdrop", "target", "name", "duplicate-id", "img-alt", "contrast"];
  for (const kind of order) {
    const rows = unique.filter((r) => r.kind === kind);
    if (!rows.length) continue;
    console.log(`${kind} (${rows.length})`);
    for (const r of rows) {
      console.log(`  ${[...r.paths].join(" ")}  ${r.detail}`);
      console.log(`      ${r.selector}`);
    }
    console.log();
  }

  if (unique.length) {
    console.error(`FAILED: ${unique.length} rendered UI problems.`);
    process.exit(1);
  }
  console.log("No rendered UI problems.");
}

main().catch((error) => { console.error(error); process.exit(1); });
