import {test,expect} from "@playwright/test";

test("NOVA dashboard is explicit about illustrative data and metrics",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:/Understand the whole experience/i})).toBeVisible();
 await expect(page.getByText(/Includes 196 explicitly synthetic reference sessions/i)).toBeVisible();
 await expect(page.locator(".stats-grid .stat-card").first().locator(".stat-value")).toHaveText("196");
 await expect(page.getByRole("heading",{name:"Section discovery"})).toBeVisible();
 await expect(page.locator(".funnel-row")).toHaveCount(7);
});

test("observed-only does not invent sessions before cloud integration",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Observed only"}).click();
 await expect(page.locator(".stats-grid .stat-card").first().locator(".stat-value")).toHaveText("0");
 await expect(page.getByText("No observed sessions yet")).toBeVisible();
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
 expect((await pending).suggestedFilename()).toBe("signal-nova-events.csv");
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
