const { chromium } = require('playwright-core');
const path = require('path');
const FILE = 'file:///' + path.resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const log = (...a) => console.log('  ', ...a);

(async () => {
  const b = await chromium.launch({ executablePath: 'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const errs = [];
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  m.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  m.on('console', c => { if (c.type() === 'error') errs.push(c.text()); });

  await m.goto(FILE);
  await m.waitForTimeout(400);
  await m.locator('#tabSuggest').click();
  await m.waitForTimeout(400);

  console.log('=== 1. 搜索交互 ===');
  log('初始 has-value:', await m.locator('#sugSearchWrap.has-value').count());
  log('初始 ✕ 可点:', await m.locator('#sugSearchWrap .search-clear').evaluate(e => getComputedStyle(e).pointerEvents !== 'none'));
  await m.locator('#sugSearch').fill('整理');
  await m.waitForTimeout(400);
  log('有内容后 has-value:', await m.locator('#sugSearchWrap.has-value').count() === 1);
  log('命中数:', (await m.locator('#sugHits').textContent()).trim());
  log('列表条数:', await m.locator('.sug-item').count());
  await m.screenshot({ path: 'D:/tmp-s-1.png' });

  console.log('\n=== 2. 点 ✕ 清空 ===');
  await m.locator('#sugSearchWrap .search-clear').click();
  await m.waitForTimeout(400);
  log('输入框已空:', (await m.locator('#sugSearch').inputValue()) === '');
  log('✕ 已隐藏:', !(await m.locator('#sugSearchWrap .search-clear').evaluate(e => getComputedStyle(e).pointerEvents !== 'none')));
  log('列表恢复 60 条:', await m.locator('.sug-item').count());
  log('命中数已清:', (await m.locator('#sugHits').textContent()).trim() === '');

  console.log('\n=== 3. Esc 清空 ===');
  await m.locator('#sugSearch').fill('屏幕');
  await m.waitForTimeout(300);
  await m.locator('#sugSearch').press('Escape');
  await m.waitForTimeout(350);
  log('Esc 后已空:', (await m.locator('#sugSearch').inputValue()) === '');
  log('弹窗未被误关:', await m.locator('#tabSuggest.active').count() === 1);

  console.log('\n=== 4. focus 态 ===');
  await m.locator('#sugSearch').focus();
  await m.locator('#sugSearch').fill('走');
  await m.waitForTimeout(350);
  const f = await m.evaluate(() => {
    const i = document.querySelector('#sugSearch');
    const cs = getComputedStyle(i);
    return { border: cs.borderTopColor, shadow: cs.boxShadow !== 'none' };
  });
  log('focus 有描边:', f.border, '| 有光晕:', f.shadow);
  await m.screenshot({ path: 'D:/tmp-s-2.png' });

  console.log('\n=== 5. 无结果 ===');
  await m.locator('#sugSearch').fill('zzzz不存在');
  await m.waitForTimeout(350);
  log('空态出现:', await m.locator('.sug-list .empty').count() === 1);
  log('命中数:', (await m.locator('#sugHits').textContent()).trim());
  await m.screenshot({ path: 'D:/tmp-s-3.png' });

  console.log('\n=== 6. 大卡按钮 ===');
  await m.locator('#sugSearchWrap .search-clear').click();
  await m.waitForTimeout(350);
  const before = (await m.locator('#sugHeroText').textContent()).trim();
  await m.locator('#sugHeroSkip').click();
  await m.waitForTimeout(350);
  const after = (await m.locator('#sugHeroText').textContent()).trim();
  log('换一条生效:', before !== after);
  log('徽章:', (await m.locator('#sugHeroIdx').textContent()).trim());
  await m.locator('#sugHeroAdd').click();
  await m.waitForTimeout(450);
  log('加进货架后自动跳下一条:', (await m.locator('#sugHeroText').textContent()).trim() !== after);
  log('主按钮文案:', (await m.locator('#sugHeroAdd').textContent()).trim());
  await m.screenshot({ path: 'D:/tmp-s-4.png' });

  console.log('\n=== 7. 货架搜索框也一致 ===');
  await m.locator('#tabShelf').click();
  await m.waitForTimeout(350);
  const sh = await m.evaluate(() => {
    const i = document.querySelector('#search');
    const cs = getComputedStyle(i);
    return { h: Math.round(i.getBoundingClientRect().height), radius: cs.borderRadius };
  });
  log('货架搜索框:', JSON.stringify(sh));
  await m.locator('#search').fill('a');
  await m.waitForTimeout(300);
  log('✕ 出现:', await m.locator('#search').locator('xpath=..').locator('.search-clear').evaluate(e => getComputedStyle(e).pointerEvents !== 'none'));
  await m.locator('#search').locator('xpath=..').locator('.search-clear').click();
  await m.waitForTimeout(300);
  log('清空生效:', (await m.locator('#search').inputValue()) === '');

  console.log('\n=== 控制台错误 ===');
  console.log(errs.length ? errs.join('\n') : '  无');
  await b.close();
})();
