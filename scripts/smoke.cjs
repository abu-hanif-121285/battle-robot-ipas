const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--no-sandbox', '--window-size=1600,900'],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console.error] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  console.log('=== 1) Main menu ===');
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/shot-menu.png' });

  console.log('=== 2) Hero select ===');
  await page.goto('http://127.0.0.1:3000/heroes?diff=normal', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shot-heroes.png' });

  console.log('=== 3) Battle boot ===');
  await page.goto('http://127.0.0.1:3000/battle?hero=blaze&diff=normal', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000); // engine boots, quiz opens at ~900ms
  await page.screenshot({ path: '/tmp/shot-battle-quiz.png' });

  const quizVisible = await page.locator('text=KNOWLEDGE BATTLE').first().isVisible().catch(() => false);
  console.log('quiz overlay visible:', quizVisible);

  if (quizVisible) {
    const optionButtons = page.locator('.grid.sm\\:grid-cols-2 > button');
    const n = await optionButtons.count();
    console.log('option buttons found:', n);
    if (n > 0) {
      await optionButtons.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: '/tmp/shot-quiz-reveal.png' });
      const lanjut = page.locator('text=LANJUTKAN PERTARUNGAN');
      if (await lanjut.isVisible().catch(() => false)) {
        await lanjut.click();
        console.log('quiz answered & closed');
      }
    }
  }
  await page.waitForTimeout(3000);

  await page.keyboard.press(' ');
  await page.keyboard.press('q');
  await page.waitForTimeout(600);
  await page.keyboard.down('d');
  await page.waitForTimeout(1500);
  await page.keyboard.up('d');
  await page.screenshot({ path: '/tmp/shot-battle-hud.png' });

  const hudText = await page.locator('body').innerText();
  console.log('HUD contains CYBER:', hudText.includes('CYBER'), '| TITAN:', hudText.includes('TITAN'), '| GOLD text:', hudText.includes('GOLD'));

  console.log('=== 4) Teacher dashboard login ===');
  await page.goto('http://127.0.0.1:3000/teacher', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder="guru@robotlegends.id"]', 'guru@robotlegends.id');
  await page.fill('input[placeholder="••••••••"]', 'guru123');
  await page.click('text=MASUK DASHBOARD');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shot-teacher.png' });
  const teacherText = await page.locator('body').innerText();
  console.log('teacher dashboard loaded:', teacherText.includes('OVERVIEW') && teacherText.includes('BANK SOAL'));

  console.log('=== ERRORS ===');
  if (errors.length === 0) console.log('NONE ✓');
  else errors.slice(0, 20).forEach((e) => console.log(e));

  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('SMOKE FAILED:', e); process.exit(1); });
