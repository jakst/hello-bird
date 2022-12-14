import { Protocol } from "puppeteer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { cache } from "../cache";
import { env } from "../env";
import { loadCookies, saveCookies } from "./cookies";

async function run() {
  let cookies: Protocol.Network.CookieParam[] = [];

  await cache.connect();

  try {
    cookies = await loadCookies();
  } catch {}

  if (!cookies.length) {
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
      headless: false,
      channel: "chrome",
    });

    const page = await browser.newPage();

    await page.goto("https://shoppinglist.google.com/", {
      waitUntil: "networkidle2",
    });

    await page.type('input[type="email"]', env.EMAIL);
    await page.keyboard.press("Enter");

    await page.waitForSelector('input[type="password"]', { visible: true });

    await page.type('input[type="password"]', env.PASSWORD);
    await page.keyboard.press("Enter");

    await page.waitForNavigation({ waitUntil: "networkidle2" });
    await page.waitForXPath('//*[contains(text(), "Min inköpslista")]');

    cookies = await page.cookies();
    await saveCookies(cookies);
    await browser.close();
  }

  const res = await fetch("https://hello-bird-production.up.railway.app/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookies }),
  });

  await cache.disconnect();

  if (res.ok) console.log(res.status, "Uploaded auth credentials successfully");
  else console.log("Failed to upload credentials", await res.text());
}

run();
