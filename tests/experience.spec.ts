import {test,expect} from "@playwright/test";
test("product interaction changes observed KPIs",async({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:/Make sense of every interaction/i})).toBeVisible();
 await page.getByRole("button",{name:/Try the experience/i}).click();
 await page.getByRole("button",{name:/Get started/i}).click();
 await page.getByRole("button",{name:"Continue"}).click();
 await expect(page.getByRole("alert")).toContainText("valid email");
 await page.getByPlaceholder("e.g. Alex Morgan").fill("Demo Participant");
 await page.getByPlaceholder("alex@example.com").fill("demo@example.com");
 await page.getByRole("button",{name:"Continue"}).click();
 await page.getByRole("button",{name:"Save more"}).click();
 await page.getByRole("button",{name:"Continue"}).click();
 await page.getByRole("button",{name:/Complete demo/i}).click();
 await expect(page.getByRole("heading",{name:/You're all set/i})).toBeVisible();
 await page.getByRole("button",{name:/See your impact on KPIs/i}).click();
 await page.getByRole("button",{name:"Observed only"}).click();
 await expect(page.locator(".stat-card").first().locator(".stat-value")).toHaveText("1");
 await expect(page.locator(".stat-card").nth(1).locator(".stat-value")).toHaveText("100.0%");
 await expect(page.getByText(/Validation errors appeared 1 time/i)).toBeVisible();
});

test("explicit abandonment is reflected in dashboard",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:/Try the experience/i}).click();
 await page.getByRole("button",{name:/Get started/i}).click();
 await page.getByRole("button",{name:/Exit demo/i}).click();
 await page.getByRole("button",{name:/View live analytics/i}).click();
 await page.getByRole("button",{name:"Observed only"}).click();
 await expect(page.locator(".stat-card").nth(2).locator(".stat-value")).toHaveText("100.0%");
});

test("research workflow exports a CSV",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"AI research assistant"}).click();
 await expect(page.getByRole("heading",{name:/Ask better questions/i})).toBeVisible();
 const download=page.waitForEvent("download");
 await page.getByRole("button",{name:/Export events/i}).click();
 const file=await download;
 expect(file.suggestedFilename()).toBe("signal-ux-events.csv");
});

for(const size of [{width:1440,height:900},{width:768,height:1024},{width:375,height:812},{width:320,height:720}]){
 test("responsive navigation and no page overflow at "+size.width+"px",async({page})=>{
  await page.setViewportSize(size);
  await page.goto("/");
  const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);
  if(size.width<=900){
    await page.getByRole("button",{name:"Open navigation"}).click();
    await page.getByRole("button",{name:"AI research assistant"}).click();
    await expect(page.getByRole("heading",{name:/Ask better questions/i})).toBeVisible();
  }
 });
}
test("keyboard skip link goes to main content",async({page})=>{
 await page.goto("/");
 await page.keyboard.press("Tab");
 await expect(page.getByRole("link",{name:"Skip to content"})).toBeFocused();
});
