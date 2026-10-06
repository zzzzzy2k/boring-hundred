const { chromium } = require('playwright-core');
const fs = require('fs');
const FILE = 'file:///' + require('path').resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const XLSX_BUF = fs.readFileSync('D:/tmp-dl-test.xlsx');
const log = (...a) => console.log('  ', ...a);

async function pickFile(page, name, buf, mime) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#csvInBtn').click()]);
  await fc.setFiles({ name, mimeType: mime, buffer: buf });
  await page.waitForTimeout(900);
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe' });
  const page = await (await browser.newContext()).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto(FILE);
  await page.waitForTimeout(400);

  console.log('\n=== XLSX 直读导入 ===');
  log('DecompressionStream 可用:', await page.evaluate(() => typeof DecompressionStream === 'function'));
  log('初始条数:', await page.locator('.card').count());

  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await pickFile(page, 'test.xlsx', XLSX_BUF,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  log('导入弹窗出现:', await page.locator('#importOverlay.show').count() === 1);
  log('弹窗标题:', (await page.locator('#importTitle').textContent()));
  await page.locator('#importMerge').click();
  await page.waitForTimeout(600);

  log('导入后条数（应为 4）:', await page.locator('.card').count());
  (await page.locator('.card .text').allTextContents()).forEach(t => log('  •', t));
  log('已完成数（应为 1）:', await page.locator('#numFinish').textContent());
  const note = await page.locator('.note.has').first().textContent().catch(() => null);
  log('备注读出:', note ? note.trim() : '(无)');
  const dateTag = await page.locator('.tag.stat').first().textContent().catch(() => null);
  log('完成日期（应识别 2026/10/5）:', dateTag ? dateTag.trim() : '(无)');
  log('标签读出:', (await page.locator('.tag').allTextContents()).slice(0, 6).join(' / '));
  log('设置面板已自动关闭:', await page.locator('#settingsOverlay.show').count() === 0);

  console.log('\n=== 异常输入容错 ===');
  await page.locator('#settingsBtn').click();
  await page.waitForTimeout(250);
  await pickFile(page, 'empty.csv', Buffer.from(''), 'text/csv');
  log('空文件 →', (await page.locator('.toast').last().textContent()).trim());
  await pickFile(page, 'headeronly.csv', Buffer.from('\uFEFF内容,标签,已完成,完成日期,备注,ID\r\n'), 'text/csv');
  log('只有表头 →', (await page.locator('.toast').last().textContent()).trim());
  await pickFile(page, 'junk.csv', Buffer.from('\x00\x01\x02binary'), 'text/csv');
  log('乱文件 →', (await page.locator('.toast').last().textContent()).trim());
  await pickFile(page, 'fake.xlsx', Buffer.from('PK\x03\x04not really a zip'), 'application/octet-stream');
  log('假 xlsx →', (await page.locator('.toast').last().textContent()).trim());
  await pickFile(page, 'gbk.csv', Buffer.from([0xfe, 0xff].concat(
    Array.from(Buffer.from('内容,标签\r\n测试中文一条,在家\r\n', 'utf16le')))), 'text/csv');
  log('数据未被动过:', await page.locator('.card').count());

  console.log('\n=== 控制台错误 ===');
  console.log(errs.length ? errs.join('\n') : '  无');
  await browser.close();
})();