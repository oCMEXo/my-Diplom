import { expect, test, type Browser } from "@playwright/test";
import { API, createFile, createProject, register, type Auth } from "./helpers.js";
import { auditPage, DEVICES } from "./adaptive-audit.js";

type Theme = "dark" | "light";

async function auditRoutes(browser: Browser, theme: Theme, auth: Auth | null, routes: Record<string, string>) {
  const found: string[] = [];
  for (const device of DEVICES) {
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      hasTouch: device.touch,
      isMobile: device.touch && device.width < 900,
      colorScheme: theme,
    });
    await context.addInitScript(
      ({ stored, theme }) => {
        window.localStorage.setItem("collab.theme", theme);
        if (stored) window.localStorage.setItem("collab.auth", stored);
      },
      { stored: auth ? JSON.stringify({ user: auth.user, tokens: auth.tokens }) : null, theme },
    );
    const page = await context.newPage();
    for (const [name, route] of Object.entries(routes)) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(300);
      for (const problem of await page.evaluate(auditPage)) {
        found.push(`${theme} ${device.name} ${name}: ${problem.kind} ${problem.detail}`);
      }
    }
    await context.close();
  }
  return found;
}

test.describe("adaptive layout on 7 screen sizes", () => {
  test.setTimeout(240_000);

  for (const theme of ["dark", "light"] as const) {
    test(`no sideways scrolling, overlaps, small touch targets or low contrast (${theme} theme)`, async ({ browser, request }) => {
      const owner = await register(request, "Anna");
      const project = await createProject(request, owner, "Algorithms homework");
      const file = await createFile(request, owner, project.id, "src/main.py");
      await request.post(`${API}/projects/${project.id}/messages`, {
        headers: { Authorization: `Bearer ${owner.tokens.accessToken}` },
        data: { body: "I fixed the loop in main.py" },
      });

      const visitor = await auditRoutes(browser, theme, null, {
        landing: "/",
        login: "/login",
        register: "/register",
        join: `/join/${project.inviteCode}`,
        "design system": "/design-system",
      });
      const member = await auditRoutes(browser, theme, owner, {
        projects: "/",
        project: `/projects/${project.id}`,
        editor: `/projects/${project.id}/files/${file.id}`,
      });

      expect([...visitor, ...member]).toEqual([]);
    });
  }
});
