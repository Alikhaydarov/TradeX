import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const baseUrl = process.env.UI_AUDIT_BASE_URL || "http://127.0.0.1:3000";
const outputDir = process.env.UI_AUDIT_OUTPUT || "ui-audit-artifacts";

const viewports = [
  { name: "phone-320", width: 320, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 1000 },
  { name: "wide-2560", width: 2560, height: 1440 },
];

const routes = [
  { name: "home", path: "/" },
  { name: "pricing", path: "/pricing" },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const report = [];
let failed = false;

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });

    for (const route of routes) {
      const page = await context.newPage();
      const response = await page.goto(`${baseUrl}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      await page.waitForTimeout(350);

      const metrics = await page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return {
          viewportWidth: window.innerWidth,
          rootScrollWidth: root.scrollWidth,
          bodyScrollWidth: body.scrollWidth,
          rootScrollHeight: root.scrollHeight,
          title: document.title,
          hasMain: Boolean(document.querySelector("main")),
          hasHorizontalOverflow:
            root.scrollWidth > window.innerWidth + 1 ||
            body.scrollWidth > window.innerWidth + 1,
        };
      });

      const screenshot = `${outputDir}/${route.name}-${viewport.name}.png`;
      await page.screenshot({ path: screenshot, fullPage: true });

      const result = {
        route: route.path,
        viewport,
        status: response?.status() ?? null,
        screenshot,
        ...metrics,
      };
      report.push(result);

      if (
        !response ||
        response.status() >= 400 ||
        metrics.hasHorizontalOverflow ||
        !metrics.title
      ) {
        failed = true;
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

await writeFile(
  `${outputDir}/responsive-report.json`,
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

if (failed) {
  console.error("Responsive smoke audit found a failed route or horizontal overflow.");
  process.exit(1);
}

console.log(`Responsive smoke audit passed for ${report.length} route/viewport pairs.`);
