import {test,expect} from "@playwright/test";
import {readFile} from "node:fs/promises";

test("NOVA dashboard is explicit about illustrative data and metrics",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:/Understand the whole experience/i})).toBeVisible();
 await expect(page.getByText(/Includes 196 explicitly synthetic reference sessions/i)).toBeVisible();
 await expect(page.locator(".stats-grid .stat-card").first().locator(".stat-value")).toHaveAttribute("aria-label","196");
 await expect(page.getByRole("heading",{name:"Section discovery"})).toBeVisible();
 await expect(page.locator(".funnel-row")).toHaveCount(7);
});

test("observed-only does not invent sessions before cloud integration",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Observed aggregate"}).click();
 await expect(page.locator(".stats-grid .stat-card").first().locator(".stat-value")).toHaveAttribute("aria-label","0");
 await expect(page.getByText("Waiting for aggregate data")).toBeVisible();
});

test("NOVA product flow links to external experience",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"NOVA experience"}).click();
 await expect(page.getByRole("heading",{name:/One product, real interactions/i})).toBeVisible();
 const link=page.getByRole("link",{name:/Launch the experience/i});
 await expect(link).toHaveAttribute("href","https://wandr-3d-travel-experience.vercel.app/");
});

test("research event export produces CSV",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"AI research assistant"}).click();
 await expect(page.getByRole("heading",{name:/Ask better questions/i})).toBeVisible();
 const pending=page.waitForEvent("download");
 await page.getByRole("button",{name:/Export events/i}).click();
 const file=await pending;
 expect(file.suggestedFilename()).toBe("signal-nova-aggregated.csv");
 const csv=await readFile(await file.path(),"utf8");
 expect(csv).toContain("sessions");
 expect(csv).toContain("section_reach");
 expect(csv).not.toContain("session_id");
 expect(csv).not.toContain("created_at");
 expect(csv).not.toContain("ip_address");
});

for(const size of [{width:1440,height:900},{width:768,height:1024},{width:375,height:812},{width:320,height:720}]){
 test("responsive navigation and no page overflow at "+size.width+"px",async({page})=>{
  await page.setViewportSize(size);await page.goto("/");
  const d=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(d.scroll).toBeLessThanOrEqual(d.client+1);
  if(size.width<=900){
   await page.getByRole("button",{name:"Open navigation"}).click();
   await page.getByRole("button",{name:"AI research assistant"}).click();
   await expect(page.getByRole("heading",{name:/Ask better questions/i})).toBeVisible();
  }
 });
}
test("skip link is first keyboard target",async({page})=>{
 await page.goto("/");await page.keyboard.press("Tab");
 await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
});


test("dashboard labels use readable text sizes",async({page})=>{
 await page.goto("/");
 for(const selector of [".stat-top",".section-heading p",".funnel-row-header",".data-toolbar-left",".side-links button"]){
  const font=await page.locator(selector).first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  expect(font,selector+" should not be tiny").toBeGreaterThanOrEqual(12);
 }
});

test("mobile KPI labels remain readable without horizontal scrolling",async({page})=>{
 await page.setViewportSize({width:320,height:720});
 await page.goto("/");
 const font=await page.locator(".stat-top").first().evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
 expect(font).toBeGreaterThanOrEqual(12);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});


test("animated dashboard has a replay control without changing measured values",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Observed aggregate"}).click();
 const value=await page.locator(".stat-card").first().locator(".stat-value").getAttribute("aria-label");
 const before=await page.locator(".motion-display").elementHandle();
 await page.getByRole("button",{name:"Replay motion"}).click();
 await expect(page.getByRole("button",{name:"Replay motion"})).toBeFocused();
 await expect(page.locator(".stat-card").first().locator(".stat-value")).toHaveAttribute("aria-label",value||"0");
 await expect(page.getByRole("button",{name:"Observed aggregate"})).toHaveAttribute("aria-pressed","true");
 expect(await before?.evaluate(element=>element.isConnected)).toBe(false);
 await expect(page.locator(".trend-line")).toHaveAttribute("pathLength","1");
 const motionName=await page.locator(".trend-line").evaluate(el=>getComputedStyle(el).animationName);
 expect(motionName).toContain("signal-chart-draw");
});

test("reduced-motion preference disables all cinematic dashboard animations",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.goto("/");
 for(const selector of [".stat-card",".funnel-bar",".trend-line",".trend-point",".event-item",".page-intro"]){
  if(await page.locator(selector).count()===0)continue;
  const name=await page.locator(selector).first().evaluate(el=>getComputedStyle(el).animationName);
  expect(name,selector).toBe("none");
 }
 await expect(page.getByRole("button",{name:"Replay motion"})).toBeVisible();
 const value=await page.locator(".stat-card").first().locator(".stat-value").textContent();
 await page.getByRole("button",{name:"Replay motion"}).click();
 await expect(page.locator(".stat-card").first().locator(".stat-value")).toHaveAttribute("aria-label",value||"196");
});

test("number animations show stable accessible values and eventually reach their final number",async({page})=>{
 await page.goto("/");
 const stat=page.locator(".stat-value").first();
 await expect(stat).toHaveAttribute("aria-label","196");
 await expect(stat.locator(".sr-only")).toHaveText("196");
 await expect(stat.locator('[aria-hidden="true"]')).toHaveText("196",{timeout:5000});
});

test("observed aggregated CSV contains no individual visitor identifiers",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Observed aggregate"}).click();
 await page.getByRole("button",{name:"AI research assistant"}).click();
 const pending=page.waitForEvent("download");
 await page.getByRole("button",{name:/Export events/}).click();
 const csv=await readFile(await (await pending).path(),"utf8");
 expect(csv).not.toMatch(/session_id|created_at|ip_address|user_agent|visitor_id/i);
 expect(csv).toContain('"source"');
});
