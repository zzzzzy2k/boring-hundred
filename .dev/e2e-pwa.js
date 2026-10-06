const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const FILE = 'file:///' + path.resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const log = (...a) => console.log('  ', ...a);

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 420, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto(FILE);
  await page.waitForTimeout(400);

  // ---- 造一批数据 ----
  for (const [t, g] of [['去楼下走一条没走过的小路', '出门'], ['煮一杯茶', '在家'], ['整理书桌', '整理']]) {
    await page.locator('#newText').fill(t);
    await page.locator('#newTags').fill(g);
    await page.locator('#newText').press('Enter');
    await page.waitForTimeout(100);
  }

  console.log('\n=== 1. 备份提醒条 ===');
  log('有空数据且没备份过 → 显示:', await page.locator('#backupBar.show').count() === 1);
  log('文案:', (await page.locator('#backupText').textContent()).trim().slice(0, 30) + '...');

  console.log('\n=== 2. 导出后自动标记备份、提醒条消失 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#jsonOutBtn').click()]);
  await dl.saveAs('D:/tmp-wipe-backup.json');
  log('导出文件:', dl.suggestedFilename());
  log('localStorage 已记录备份日期:', await page.evaluate(() => localStorage.getItem('boring100.lastBackup')));
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(300);
  log('提醒条已隐藏:', await page.locator('#backupBar.show').count() === 0);

  console.log('\n=== 3. 「知道了」免打扰 ===');
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() - 10);
    localStorage.setItem('boring100.lastBackup', d.toISOString().slice(0, 10));
    localStorage.removeItem('boring100.backupSnooze');
  });
  await page.reload();
  await page.waitForTimeout(500);
  log('10 天没备份 → 提醒条出现:', await page.locator('#backupBar.show').count() === 1);
  log('文案:', (await page.locator('#backupText').textContent()).trim().slice(0, 26) + '...');
  await page.locator('#backupLater').click();
  await page.waitForTimeout(200);
  log('点「知道了」后隐藏:', await page.locator('#backupBar.show').count() === 0);
  log('免打扰标记已写入:', await page.evaluate(() => !!localStorage.getItem('boring100.backupSnooze')));
  await page.reload();
  await page.waitForTimeout(500);
  log('刷新后仍在免打扰期:', await page.locator('#backupBar.show').count() === 0);

  console.log('\n=== 4. 25 天没备份 → 语气升级 ===');
  await page.evaluate(() => {
    localStorage.removeItem('boring100.backupSnooze');
    const d = new Date(); d.setDate(d.getDate() - 25);
    localStorage.setItem('boring100.lastBackup', d.toISOString().slice(0, 10));
  });
  await page.reload();
  await page.waitForTimeout(500);
  log('文案:', (await page.locator('#backupText').textContent()).trim());
  await page.locator('#backupExportBtn').click();
  await page.waitForTimeout(300);
  log('点「导出备份」后消失:', await page.locator('#backupBar.show').count() === 0);
  log('导出日期已刷新:', await page.evaluate(() => localStorage.getItem('boring100.lastBackup')));

  console.log('\n=== 5. 清空弹窗：未勾选时按钮禁用 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await page.locator('#wipeBtn').click();
  await page.waitForTimeout(400);
  log('弹窗已开:', await page.locator('#wipeOverlay.show').count() === 1);
  log('标题含条数:', (await page.locator('#wipeTitle').textContent()).trim());
  log('「确认清空」初始禁用:', await page.locator('#wipeOk').isDisabled());
  log('危险区初始压暗:', await page.locator('#wipeDanger.idle').count() === 1);
  log('焦点在「取消」上（防误回车）:', await page.evaluate(() => document.activeElement.id));

  console.log('\n=== 6. 弹窗内「立即导出」===');
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.locator('#wipeExportBtn').click()]);
  await dl2.saveAs('D:/tmp-wipe-inline.json');
  log('已下载备份:', dl2.suggestedFilename());
  log('按钮变为已导出态:', (await page.locator('#wipeExportBtn').textContent()).trim());
  log('勾选后「确认清空」启用:', await (async () => {
    await page.locator('#wipeAck').check();
    await page.waitForTimeout(150);
    return !(await page.locator('#wipeOk').isDisabled());
  })());
  log('危险区不再压暗:', await page.locator('#wipeDanger.idle').count() === 0);

  console.log('\n=== 7. 取消不应丢数据 ===');
  await page.locator('#wipeCancel').click();
  await page.waitForTimeout(300);
  log('数据条数:', await page.locator('.card').count());
  log('清空弹窗已关:', await page.locator('#wipeOverlay.show').count() === 0);
  log('设置面板保留（取消不该抢走上下文）:', await page.locator('#settingsOverlay.show').count() === 1);
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(250);

  console.log('\n=== 8. 真正清空 + 撤销 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await page.locator('#wipeBtn').click();
  await page.waitForTimeout(350);
  await page.locator('#wipeAck').check();
  await page.waitForTimeout(120);
  await page.locator('#wipeOk').click();
  await page.waitForTimeout(400);
  log('清空后条数:', await page.locator('.card').count());
  log('空态出现:', (await page.locator('.empty p').first().textContent()).trim());
  log('设置面板已一并收掉:', await page.locator('#settingsOverlay.show').count() === 0);
  log('备份日期标记已清:', await page.evaluate(() => localStorage.getItem('boring100.lastBackup')));
  const toastText = (await page.locator('.toast').last().textContent()).trim();
  log('toast:', toastText);
  await page.locator('.toast .undo').last().click();
  await page.waitForTimeout(400);
  log('点撤销后恢复条数:', await page.locator('.card').count());

  console.log('\n=== 9. Esc 关闭清空弹窗 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await page.locator('#wipeBtn').click();
  await page.waitForTimeout(350);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  log('Esc 后清空弹窗关闭:', await page.locator('#wipeOverlay.show').count() === 0);
  log('Esc 只取消这一步，设置面板保留:', await page.locator('#settingsOverlay.show').count() === 1);
  await page.locator('#settingsClose').click();
  await page.waitForTimeout(250);

  console.log('\n=== 10. PWA 基建 ===');
  log('manifest 链接存在:', await page.locator('link[rel=manifest]').count() === 1);
  const mf = JSON.parse(fs.readFileSync('D:/Data/Study/Project/小事杂货铺/manifest.webmanifest', 'utf8'));
  log('manifest name:', mf.name, '| short_name:', mf.short_name, '| display:', mf.display);
  log('图标数量:', mf.icons.length, '| 含 maskable:', mf.icons.some(i => i.purpose === 'maskable'));
  log('apple-touch-icon 链接:', await page.locator('link[rel=apple-touch-icon]').count() === 1);
  log('theme-color 带明暗两套:', await page.locator('meta[name=theme-color]').count() === 2);
  for (const f of ['sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
                   'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png']) {
    const ok = fs.existsSync('D:/Data/Study/Project/小事杂货铺/' + f);
    log('  文件存在 ' + f + ':', ok);
  }
  log('file:// 下不注册 SW（应无报错）:', await page.evaluate(() =>
    !navigator.serviceWorker || !navigator.serviceWorker.controller));

  console.log('\n=== 11. 截图 ===');
  await page.evaluate(() => {
    localStorage.removeItem('boring100.backupSnooze');
    const d = new Date(); d.setDate(d.getDate() - 9);
    localStorage.setItem('boring100.lastBackup', d.toISOString().slice(0, 10));
  });
  await page.reload();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'D:/tmp-pwa-bar.png', fullPage: true });

  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(300);
  await page.locator('#wipeBtn').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'D:/tmp-pwa-wipe.png' });

  console.log('\n=== 控制台错误 ===');
  console.log(errs.length ? errs.join('\n') : '  无');
  await browser.close();
})();