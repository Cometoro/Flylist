const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const project = path.resolve(__dirname, "..");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

function serveFile(request, response) {
  const urlPath = new URL(request.url, "http://127.0.0.1").pathname;
  const relativePath = urlPath === "/" ? "index.html" : decodeURIComponent(urlPath.slice(1));
  const filePath = path.resolve(project, relativePath);
  if (!filePath.startsWith(project) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(filePath).pipe(response);
}

async function main() {
  const server = http.createServer(serveFile);
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    headless: true
  });
  const errors = [];
  const results = {};

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on("console", message => {
      if (message.type() === "error") errors.push(`console: ${message.text()}`);
    });
    page.on("pageerror", error => errors.push(`pageerror: ${error.message}`));

    await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
    results.stats = (await page.locator("#stats").innerText()).trim();

    await page.locator('[data-category="업데이트"]').click();
    await page.locator(".song-card").first().waitFor();
    results.updateSummary = (await page.locator("#updateSummary").innerText()).replace(/\s+/g, " ").trim();
    results.updateCards = await page.locator("#songList .song-card").count();
    results.newBadges = await page.locator('.update-kind-badge[data-kind="new"]').count();
    results.modifiedBadges = await page.locator('.update-kind-badge[data-kind="modified"]').count();
    results.desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    await page.screenshot({ path: path.join(__dirname, "smoke-desktop.png"), fullPage: false });

    await page.locator("#songList .favorite").first().click();
    await page.locator('#categoryTabs [data-category="즐겨찾기"]').click();
    await page.locator("#favoriteSongList .group-toggle").first().click();
    await page.locator("#favoriteSongList .song-card").first().waitFor();
    results.favoriteUpdateBadgeCount = await page.locator("#favoriteSongList .update-kind-badge").count();
    await page.locator("#favoritesBack").click();

    await page.locator("#searchInput").fill("원오크");
    await page.waitForTimeout(180);
    results.aliasSearchCount = await page.locator("#songList .song-card").count();
    results.aliasSearchArtists = await page.locator("#songList .song-artist").allInnerTexts();

    await page.locator("#searchInput").fill("스파클");
    await page.waitForTimeout(180);
    results.searchMatchCount = await page.locator("#songList .search-match").count();
    results.sparkleCategory = await page.locator("#songList .song-card").first().getAttribute("data-accent");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#clearSearch").click();
    await page.locator('[data-view-mode="list"]').click();
    results.mobileUpdateBadgeOverflow = await page.locator("#songList .song-card").evaluateAll(cards => cards.slice(0, 40).some(card => {
      const badge = card.querySelector(".update-kind-badge");
      if (!badge) return false;
      return badge.getBoundingClientRect().right > card.getBoundingClientRect().right - 6;
    }));
    await page.locator('#categoryTabs [data-category="J-POP"]').click();
    await page.locator("#songList .song-card").first().waitFor();
    results.mobileListMode = await page.locator("#songList").evaluate(element => element.classList.contains("is-list-view"));
    results.mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    results.mobileIndexButton = await page.locator("#mainView [data-open-index]").evaluate(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        display: style.display,
        position: style.position,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(window.innerWidth - rect.right),
        bottom: Math.round(window.innerHeight - rect.bottom)
      };
    });
    await page.locator("#mainView [data-open-index]").click();
    const voundyIndex = page.locator("#indexDrawerNav .section-index-item", { hasText: "Vaundy" }).first();
    const voundyTarget = await voundyIndex.getAttribute("data-target");
    await voundyIndex.click();
    await page.waitForTimeout(350);
    results.quickJump = {
      label: (await page.locator("#mainView .index-button-label").innerText()).trim(),
      targetTop: await page.locator(`#${voundyTarget}`).evaluate(element => Math.round(element.getBoundingClientRect().top))
    };
    await page.screenshot({ path: path.join(__dirname, "smoke-mobile.png"), fullPage: false });
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }

  const assertions = {
    stats: results.stats.includes("1,181곡") || results.stats.includes("1181곡"),
    updateSummary: results.updateSummary.includes("총 251곡")
      && results.updateSummary.includes("신규 250곡")
      && results.updateSummary.includes("수정 1곡"),
    updateCards: results.updateCards === 251,
    updateBadges: results.newBadges === 250 && results.modifiedBadges === 1,
    favoriteUpdateBadges: results.favoriteUpdateBadgeCount === 0,
    desktopOverflow: results.desktopOverflow === false,
    aliasSearch: results.aliasSearchCount >= 15
      && results.aliasSearchArtists.every(artist => artist.includes("ONE OK ROCK")),
    searchHighlight: results.searchMatchCount > 0,
    sparkleCategory: results.sparkleCategory === "애니메이션",
    mobileListMode: results.mobileListMode === true,
    mobileUpdateBadgeOverflow: results.mobileUpdateBadgeOverflow === false,
    mobileOverflow: results.mobileOverflow === false,
    mobileIndexButton: results.mobileIndexButton.display !== "none"
      && results.mobileIndexButton.position === "fixed"
      && results.mobileIndexButton.height >= 44
      && results.mobileIndexButton.right >= 0
      && results.mobileIndexButton.bottom >= 0,
    quickJump: results.quickJump.label === "Vaundy"
      && results.quickJump.targetTop >= 0
      && results.quickJump.targetTop <= 32
  };

  console.log(JSON.stringify({ results, assertions, errors }, null, 2));
  if (errors.length || Object.values(assertions).some(value => !value)) process.exitCode = 1;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
