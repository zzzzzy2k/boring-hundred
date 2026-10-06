const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const FILE = 'file:///' + path.resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const log = (...a) => console.log('  ', ...a);

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto(FILE);
  await page.waitForTimeout(400);

  console.log('\n=== 1. 视图切换 ===');
  log('默认在货架视图:', await page.locator('#viewShelf').isVisible());
  await page.locator('#tabSuggest').click();
  await page.waitForTimeout(300);
  log('切到推荐清单:', await page.locator('#viewSuggest').isVisible(), '| 货架隐藏:', !(await page.locator('#viewShelf').isVisible()));
  log('推荐条数:', await page.locator('.sug-item').count());
  log('页脚统计:', (await page.locator('#sugFoot').textContent()).trim());

  console.log('\n=== 2. 推荐清单的序号/加号结构 ===');
  const first = page.locator('.sug-item').first();
  log('首行序号:', (await first.locator('.sug-no').textContent()).trim());
  log('首行内容:', (await first.locator('.sug-text').textContent()).trim().slice(0, 24));
  log('加号可用:', await first.locator('.sug-add').isEnabled());

  console.log('\n=== 3. 单条加入货架 + 防重复 ===');
  await first.locator('.sug-add').click();
  await page.waitForTimeout(400);
  log('货架条数:', await page.locator('.card').count());
  log('该条已标记为已添加:', await first.locator('.sug-add').isDisabled());
  log('再次点击无效:', await first.locator('.sug-add').isDisabled());
  // 再加一条同样内容的，确认不重复
  const dup = await page.evaluate(() => {
    const t = document.querySelector('.sug-item .sug-text').textContent.trim();
    return t;
  });
  log('首条文本:', dup.slice(0, 20));
  log('货架里只应有一条同名:', await page.locator('.card .text', { hasText: dup.slice(0, 10) }).count());

  console.log('\n=== 4. 推荐页的属性筛选 ===');
  await page.locator('#sugFilters .attr-toggle', { hasText: '不看屏幕' }).click();
  await page.waitForTimeout(300);
  log('筛「不看屏幕」后条数:', await page.locator('.sug-item').count());
  const firstAttr = await page.locator('.sug-item').first().locator('.sug-tags .st.attr').allTextContents();
  log('首条属性标签:', firstAttr.join(' / ') || '(无)');
  // 叠加第二组筛选：地点=室外
  await page.locator('#sugFilters .attr-group').nth(0).locator('.attr-toggle', { hasText: '室外' }).click();
  await page.waitForTimeout(300);
  log('叠加「室外」后:', await page.locator('.sug-item').count());
  const firstAttrs2 = await page.locator('.sug-item').first().locator('.sug-tags .st.attr').allTextContents();
  log('交集验证（应同时含室外与不看屏幕）:', firstAttrs2.join(' / '));
  await page.locator('#sugFilters .attr-clear').click();
  await page.waitForTimeout(250);
  log('清空筛选后恢复:', await page.locator('.sug-item').count());

  console.log('\n=== 5. 推荐页搜索 ===');
  await page.locator('#sugSearch').fill('整理');
  await page.waitForTimeout(350);
  log('搜「整理」:', await page.locator('.sug-item').count(), '条');
  await page.locator('#sugSearch').fill('');
  await page.waitForTimeout(350);

  console.log('\n=== 6. 每日推荐 ===');
  await page.locator('#sugShuffle').click();
  await page.waitForTimeout(400);
  log('随机推荐后自动切回货架:', await page.locator('#viewShelf').isVisible());
  log('货架条数:', await page.locator('.card').count());

  console.log('\n=== 7. 货架的属性筛选栏 ===');
  await page.locator('#newText').fill('测试属性项');
  await page.locator('#newText').press('Enter');
  await page.waitForTimeout(300);
  const attrCard = page.locator('.card', { hasText: '测试属性项' }).first();
  await attrCard.locator('.act').first().click();  // 编辑
  await page.waitForTimeout(400);
  log('编辑器出现:', await page.locator('.edit-row').count() > 0);
  log('重复按钮:', (await page.locator('.mini-btn.toggle').textContent()).trim());
  const optCount = await page.locator('.attr-opt').count();
  log('属性选项数（应为 8）:', optCount);
  await page.locator('.attr-grp').nth(0).locator('.attr-opt', { hasText: '在家' }).click();
  await page.locator('.attr-grp').nth(2).locator('.attr-opt', { hasText: '不看屏幕' }).click();
  await page.waitForTimeout(150);
  await page.locator('.mini-btn.primary', { hasText: '保存' }).click();
  await page.waitForTimeout(400);
  log('保存后卡片显示属性:', (await attrCard.locator('.tag.attr').allTextContents()).join(' / '));
  log('未选筛选时属性栏隐藏:', !(await page.locator('#attrBar').isVisible()));

  // 再加一条「室外」属性的，好验证筛选能筛出区别
  await page.locator('#newText').fill('测试室外项');
  await page.locator('#newText').press('Enter');
  await page.waitForTimeout(300);
  const outCard = page.locator('.card', { hasText: '测试室外项' }).first();
  await outCard.locator('.act').first().click();
  await page.waitForTimeout(400);
  await page.locator('.attr-grp').nth(0).locator('.attr-opt', { hasText: '室外' }).click();
  await page.waitForTimeout(120);
  await page.locator('.mini-btn.primary', { hasText: '保存' }).click();
  await page.waitForTimeout(400);

  const totalCards = await page.locator('.card').count();
  log('全部:', totalCards);

  console.log('\n=== 8. 每日重复打卡 ===');
  await page.locator('#newText').fill('每天拉伸十分钟');
  await page.locator('#newText').press('Enter');
  await page.waitForTimeout(300);
  // 先按文本找到它（此刻它还不是 daily），编辑成每天后再改用 .card.daily 定位
  const rawCard = page.locator('.card', { hasText: '每天拉伸十分钟' }).first();
  await rawCard.locator('.act').first().click();
  await page.waitForTimeout(400);
  await page.locator('.mini-btn.toggle').click();       // 切成「每天」
  await page.waitForTimeout(150);
  log('切换后按钮:', (await page.locator('.mini-btn.toggle').textContent()).trim());
  await page.locator('.mini-btn.primary', { hasText: '保存' }).click();
  await page.waitForTimeout(400);
  log('卡片标记为 daily:', await page.locator('.card.daily').count() > 0);
  const dlCard = page.locator('.card.daily').first();
  log('显示每天标签:', (await dlCard.locator('.tag.rep').textContent()).trim());
  const beforeCheck = await page.locator('#numFinish').textContent();
  log('打卡前完成数:', beforeCheck);

  await dlCard.locator('.check').click();
  await page.waitForTimeout(400);
  log('打卡后标签:', (await dlCard.locator('.tag').allTextContents()).join(' | '));
  log('完成数:', beforeCheck, '→', await page.locator('#numFinish').textContent());
  log('备注框未弹出（重复项不该弹）:', await page.locator('#noteOverlay.show').count() === 0);

  console.log('\n=== 9. 重复项可取消打卡 ===');
  await dlCard.locator('.check').click();
  await page.waitForTimeout(400);
  log('取消后完成数:', await page.locator('#numFinish').textContent());
  log('标签回到未打卡:', (await dlCard.locator('.tag').allTextContents()).join(' | '));
  log('备注框始终未弹:', await page.locator('#noteOverlay.show').count() === 0);

  console.log('\n=== 9b. 一次性项仍然弹备注框（回归） ===');
  const onceCard = page.locator('.card:not(.daily)').first();
  await onceCard.locator('.check').click();
  await page.waitForTimeout(400);
  log('一次性项打卡弹出备注框:', await page.locator('#noteOverlay.show').count() === 1);
  await page.locator('#noteCancel').click();
  await page.waitForTimeout(300);

  console.log('\n=== 10. 跨天重置（模拟日期） ===');
  await dlCard.locator('.check').click();
  await page.waitForTimeout(300);
  log('重新打卡后:', (await dlCard.locator('.tag.streak').textContent().catch(() => '无')).trim());
  // 把 lastDone 改成昨天，验证「今天未做」
  await page.evaluate(() => {
    const k = 'boring100.v2';
    const d = JSON.parse(localStorage.getItem(k));
    const it = d.items.find(x => x.repeat === 'daily');
    if (it) {
      const y = new Date(); y.setDate(y.getDate() - 1);
      it.lastDone = y.toISOString().slice(0, 10);
      it.streak = 5;
      localStorage.setItem(k, JSON.stringify(d));
    }
  });
  await page.reload();
  await page.waitForTimeout(500);
  log('昨天打过 → 今天回到未做:', await page.locator('#numFinish').textContent());
  const dailyTags = await page.locator('.card.daily').first().locator('.tag').allTextContents();
  log('显示为:', dailyTags.join(' | '));
  log('连击归 1 而非提示断签:', !dailyTags.some(t => /断|逾期|失败/.test(t)));

  console.log('\n=== 11. CSV 往返（含新字段） ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(300);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#csvOutBtn').click()]);
  await dl.saveAs('D:/tmp-attr.csv');
  const csv = fs.readFileSync('D:/tmp-attr.csv', 'utf8');
  log('表头:', csv.split('\r\n')[0].replace(/^﻿/, ''));
  log('前两行:');
  csv.split('\r\n').slice(1, 3).forEach(l => log('| ' + l));
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(300);

  console.log('\n=== 12. 刷新持久化 ===');
  await page.reload();
  await page.waitForTimeout(500);
  log('条数:', await page.locator('.card').count());
  log('daily 项还在:', await page.locator('.card.daily').count() > 0);
  log('属性还在:', await page.locator('.tag.attr').count() > 0);

  await page.screenshot({ path: 'D:/tmp-sug.png', fullPage: true });
  await page.locator('#tabSuggest').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'D:/tmp-sug2.png' });

  console.log('\n=== 控制台错误 ===');
  console.log(errs.length ? errs.join('\n') : '  无');
  await browser.close();
})();