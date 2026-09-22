#!/usr/bin/env node
// Launches the Vite dev server and drives the app with Playwright.
//
//   node driver.mjs sweep                       every route, every width
//   node driver.mjs route /dashboard/analytics  one route, every width
//   node driver.mjs shot /dashboard/tools 375   one screenshot
//
// Screenshots land in .artifacts/screens/. Exits non-zero if any route
// overflows horizontally or logs a console error.

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const PORT = 8080; // vite.config.ts, not Vite's default 5173
const ORIGIN = `http://localhost:${PORT}`;
const WIDTHS = [375, 768, 1024, 1440, 1920];
const OUT = ".artifacts/screens";
// NotFound.tsx logs this on purpose, so it is not a failure.
const EXPECTED_CONSOLE = /^404 Error:/;

const ROUTES = [
  "/",
  "/auth",
  "/dashboard/make-call",
  "/dashboard/assistant",
  "/dashboard/tools",
  "/dashboard/audio-library",
  "/dashboard/call-logs",
  "/dashboard/analytics",
  "/dashboard/phone-number",
  "/dashboard/inbound",
  "/dashboard/inbound-context",
  "/dashboard/passthrough-call-records",
  "/dashboard/developer",
  "/dashboard/integration",
  "/no-such-page",
];

const slug = (route) => route.replace(/\//g, "_").replace(/^_/, "") || "root";

async function startServer() {
  const proc = spawn("npm", ["run", "dev"], { stdio: "ignore" });
  process.on("exit", () => proc.kill());
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(ORIGIN);
      return proc;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`dev server did not answer on ${ORIGIN}`);
}

async function newContext(browser) {
  const context = await browser.newContext();
  // Without this every /dashboard/* route bounces to /auth. The api_key is a stub — off-origin
  // calls are stubbed below, so it is never validated — but it lets credential fields render.
  await context.addInitScript(() => {
    localStorage.setItem(
      "intvyom_auth",
      JSON.stringify({ user_id: "driver", user_name: "driver", api_key: "driver-key" }),
    );
  });
  // Stub every off-origin call so pages render their empty state, not an error.
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN) || url.startsWith("data:")) return route.continue();
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  return context;
}

// Returns { route, width, overflow, wide, errors }.
async function visit(page, route, width) {
  const errors = [];
  const onConsole = (m) =>
    m.type() === "error" && !EXPECTED_CONSOLE.test(m.text()) && errors.push(m.text());
  const onError = (e) => errors.push(String(e));
  page.on("console", onConsole);
  page.on("pageerror", onError);

  await page.setViewportSize({ width, height: 900 });
  // Signed-out routes: the seeded session would redirect them to the dashboard.
  if (route === "/" || route === "/auth") {
    await page.goto(ORIGIN + "/auth", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
  }
  // Never networkidle: the LiveKit routes hold a socket open forever.
  await page.goto(ORIGIN + route, { waitUntil: "domcontentloaded" });
  // #root's first child is the invisible Toaster region, so wait on text instead.
  await page.waitForFunction(() => document.body.innerText.trim().length > 0, null, {
    timeout: 15000,
  });
  await page.waitForTimeout(600); // let animations and first paint settle

  const { overflow, wide } = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .slice(0, 5)
      .map((el) => el.tagName.toLowerCase() + "." + (el.className?.toString().split(" ")[0] || ""));
    return { overflow: document.documentElement.scrollWidth - vw, wide };
  });

  await page.screenshot({ path: `${OUT}/${slug(route)}-${width}.png`, fullPage: true });
  page.off("console", onConsole);
  page.off("pageerror", onError);
  return { route, width, overflow: overflow > 1 ? overflow : 0, wide, errors };
}

const [mode, arg1, arg2] = process.argv.slice(2);
const routes = mode === "sweep" ? ROUTES : [arg1 || "/"];
const widths = mode === "shot" ? [Number(arg2) || 1440] : WIDTHS;

await mkdir(OUT, { recursive: true });
const server = await startServer();
const browser = await chromium.launch();
const context = await newContext(browser);
const page = await context.newPage();

let failed = 0;
for (const route of routes) {
  for (const width of widths) {
    const r = await visit(page, route, width);
    const bad = r.overflow || r.errors.length;
    if (bad) failed++;
    console.log(
      `${bad ? "FAIL" : "ok  "} ${route} @${width}` +
        (r.overflow ? `  overflow +${r.overflow}px  ${r.wide.join(" ")}` : "") +
        (r.errors.length ? `\n       console: ${r.errors.slice(0, 3).join(" | ")}` : ""),
    );
  }
}

await browser.close();
server.kill();
console.log(`\n${failed} failing checks. Screenshots in ${OUT}/`);
process.exit(failed ? 1 : 0);
