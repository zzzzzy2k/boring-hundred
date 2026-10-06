const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const FILE = 'file:///' + path.resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const DL = 'D:/tmp-dl';

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win/chrome.exe' });
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  const log = (...a) => console.log('  ', ...a);

  await page.goto(FILE);
  await page.waitForTimeout(400);

  console.log('\n=== 1. 初始空态 ===');
  log('标题:', await page.title());
  log('空态文案:', (await page.locator('.empty p').first().textContent()).trim());
  log('徽章:', await page.locator('#badge').textContent());

  console.log('\n=== 2. 目标数量自定义 ===');
  await page.locator('#badge').click();
  await page.waitForTimeout(300);
  log('设置面板已开:', await page.locator('#settingsOverlay.show').count() === 1);
  await page.locator('#goalInput').fill('7');
  await page.waitForTimeout(150);
  log('改目标为 7 →徽章:', await page.locator('#badge').textContent());
  log('进度条宽度:', await page.locator('#fillCollect').evaluate(el => el.style.width));
  await page.locator('#settingsOk').click();
  await page.waitForTimeout(250);

  console.log('\n=== 3. 主题切换 ===');
  await page.locator('#themeBtn').click();
  await page.waitForTimeout(250);
  const dark1 = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  log('点击后是暗色:', dark1, '| body 背景:', await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  await page.screenshot({ path: DL + '-dark.png' });
  await page.locator('#themeBtn').click();
  await page.waitForTimeout(250);
  log('再点回亮色:', !(await page.evaluate(() => document.documentElement.classList.contains('dark'))));
  await page.locator('#themeBtn').click();
  await page.waitForTimeout(200);

  console.log('\n=== 4. 手动加数据（含引号/逗号/换行的边界内容） ===');
  const items = [
    ['去楼下走一条没走过的小路', '出门，10分钟'],
    ['煮一杯"没喝过"的茶', '在家，动手'],
    ['把书架按\n心情重排一次', '整理'],
    ['给很久没联系的朋友发消息', '社交，5分钟']
  ];
  for (const [t, g] of items) {
    await page.locator('#newText').fill(t);
    await page.locator('#newTags').fill(g);
    await page.locator('#newText').press('Enter');
    await page.waitForTimeout(120);
  }
  log('列表条数:', await page.locator('.card').count());
  log('收集进度:', await page.locator('#numCollect').textContent());
  log('页脚:', await page.locator('#footStat').textContent());

  console.log('\n=== 5. 下载 CSV 模板 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(300);
  const [tpl] = await Promise.all([page.waitForEvent('download'), page.locator('#tplBtn').click()]);
  const tplPath = DL + '-tpl.csv';
  await tpl.saveAs(tplPath);
  log('模板文件名:', tpl.suggestedFilename());
  log('模板内容:\n' + fs.readFileSync(tplPath, 'utf8').split('\r\n').map(l => '| ' + l).join('\n'));

  console.log('\n=== 6. 导出 CSV 往返验证 ===');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.locator('#csvOutBtn').click()]);
  const csvPath = DL + '-out.csv';
  await csv.saveAs(csvPath);
  const csvText = fs.readFileSync(csvPath, 'utf8');
  log('导出文件名:', csv.suggestedFilename());
  log('内容:\n' + csvText.split('\r\n').map(l => '| ' + l).join('\n'));
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(250);

  console.log('\n=== 7. 清空后用模板文件重新导入（验证 xlsx 之外的真路径） ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await page.locator('#wipeBtn').click();
  await page.waitForTimeout(400);
  log('清空后条数:', await page.locator('.card').count());

  const [imp] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.locator('#settingsBtn').click().then(() => page.waitForTimeout(250)).then(() => page.locator('#csvInBtn').click())
  ]);
  await imp.setFiles(csvPath);
  await page.waitForTimeout(600);
  log('导入确认弹窗:', await page.locator('#importOverlay.show').count() === 1);
  log('弹窗文案:', (await page.locator('#importTitle').textContent()));
  await page.locator('#importMerge').click();
  await page.waitForTimeout(500);
  log('导入后条数:', await page.locator('.card').count());
  log('设置面板已自动关闭（修 bug 验证）:', await page.locator('#settingsOverlay.show').count() === 0);
  log('首条内容:', (await page.locator('.card .text').first().textContent()).replace(/\n/g, '\\n'));

  console.log('\n=== 7b. 二次点击确认（清空后导入） ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  const [imp2] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#csvInBtn').click()]);
  await imp2.setFiles(tplPath);
  await page.waitForTimeout(600);
  log('第一次点「清空后只留」按钮文案:', (await page.locator('#importReplace').textContent()).trim());
  await page.locator('#importReplace').click();
  await page.waitForTimeout(200);
  log('武装后文案:', (await page.locator('#importReplace').textContent()).trim());
  await page.locator('#importReplace').click();
  await page.waitForTimeout(500);
  log('二次确认后条数（应为模板的 3 件）:', await page.locator('.card').count());
  log('面板已关闭:', await page.locator('#settingsOverlay.show').count() === 0 && await page.locator('#importOverlay.show').count() === 0);

  console.log('\n=== 8. 随机 / 完成 / 备注 ===');
  await page.locator('#randomBtn').click();
  await page.waitForTimeout(350);
  log('随机弹窗内容:', (await page.locator('#randomText').textContent()).slice(0, 20));
  await page.locator('#randomDone').click();
  await page.waitForTimeout(400);
  log('备注弹窗出现:', await page.locator('#noteOverlay.show').count() === 1);
  await page.locator('#noteInput').fill('试了一下，比想象中简单');
  await page.locator('#noteSave').click();
  await page.waitForTimeout(400);
  log('完成数:', await page.locator('#numFinish').textContent());
  log('备注已存:', (await page.locator('.note.has').first().textContent()).trim());

  console.log('\n=== 9. 筛选 / 搜索 / 排序 ===');
  await page.locator('.chip', { hasText: '做过' }).click();
  await page.waitForTimeout(250);
  log('筛「做过」条数:', await page.locator('.card').count());
  await page.locator('.chip', { hasText: '全部' }).click();
  await page.waitForTimeout(200);
  await page.locator('#search').fill('书架');
  await page.waitForTimeout(350);
  log('搜「书架」条数:', await page.locator('.card').count());
  await page.locator('#search').fill('');
  await page.waitForTimeout(350);

  console.log('\n=== 10. 快捷键 ===');
  await page.locator('body').click({ position: { x: 5, y: 400 } });
  await page.keyboard.press('r');
  await page.waitForTimeout(300);
  log('按 R 打开随机弹窗:', await page.locator('#randomOverlay.show').count() === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  log('Esc 关闭:', await page.locator('#randomOverlay.show').count() === 0);
  await page.keyboard.press('/');
  await page.waitForTimeout(200);
  log('按 / 聚焦搜索:', await page.evaluate(() => document.activeElement.id));

  console.log('\n=== 11. 刷新后数据持久化 ===');
  await page.reload();
  await page.waitForTimeout(500);
  log('刷新后条数:', await page.locator('.card').count());
  log('刷新后目标值:', await page.locator('#badge').textContent());
  log('刷新后主题:', await page.evaluate(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light'));

  console.log('\n=== 12. 亮色 + 移动端截图 ===');
  await page.evaluate(() => { try { localStorage.removeItem('boring100.theme'); } catch(e){} });
  await page.reload();
  await page.waitForTimeout(500);
  await page.screenshot({ path: DL + '-light.png', fullPage: true });

  const mob = await ctx.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(FILE);
  await mob.waitForTimeout(500);
  await mob.screenshot({ path: DL + '-mobile.png', fullPage: false });
  const tap = await mob.locator('.check').first().evaluate(el => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  log('移动端勾选圈视觉尺寸:', tap.w + 'x' + tap.h, '(热区被 ::before 撑到 44)');
  await mob.locator('#themeBtn').click();
  await mob.waitForTimeout(300);
  await mob.screenshot({ path: DL + '-mobile-dark.png' });

  console.log('\n=== 控制台错误 ===');
  console.log(errors.length ? errors.join('\n') : '  无');

  await browser.close();
})();