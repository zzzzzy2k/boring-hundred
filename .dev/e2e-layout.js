const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const FILE = 'file:///' + path.resolve('D:/Data/Study/Project/小事杂货铺/index.html').replace(/\\/g, '/');
const log = (...a) => console.log('  ', ...a);
const EXEC = process.env.CHROME_PATH ||
  'C:/Users/zzy/AppData/Local/ms-playwright/chromium-1228/chrome-win64/chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: EXEC });
  const errs = [];

  // ============ 桌面宽屏：分栏 ============
  const d = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage();
  d.on('pageerror', e => errs.push('[桌面] ' + e.message));
  d.on('console', m => { if (m.type() === 'error') errs.push('[桌面] ' + m.text()); });
  await d.goto(FILE);
  await d.waitForTimeout(400);

  console.log('\n=== 桌面宽屏（1280px）===');
  log('tab 隐藏:', !(await d.locator('.view-tabs').isVisible()));
  log('大卡隐藏:', !(await d.locator('#sugHero').isVisible()));
  log('货架栏可见:', await d.locator('#viewShelf').isVisible());
  log('推荐栏可见:', await d.locator('#viewSuggest').isVisible());
  const box1 = await d.locator('#viewShelf').boundingBox();
  const box2 = await d.locator('#viewSuggest').boundingBox();
  log('两栏左右并排:', box1.x < box2.x && Math.abs(box1.y - box2.y) < 20 ? '是' : `否(x ${Math.round(box1.x)} vs ${Math.round(box2.x)})`);
  log('伪元素标题:', await d.locator('#viewShelf').evaluate(e => getComputedStyle(e, '::before').content));
  log('推荐条数:', await d.locator('.sug-item').count());
  log('序号已去掉:', await d.locator('.sug-no').count() === 0);
  log('属性用小圆点:', await d.locator('.sug-item').first().locator('.sug-attrs .sa').count(), '个');
  log('标签数:', await d.locator('.sug-item').first().locator('.sug-tags .st').count(), '个');
  log('左侧色条（不看屏幕）:', await d.locator('.sug-item.nos').count(), '条');
  await d.screenshot({ path: 'D:/tmp-w1.png' });

  console.log('\n--- 分栏联动 ---');
  await d.locator('#dSug, .sug-add').first().waitFor({ timeout: 3000 }).catch(() => {});
  const firstAdd = d.locator('.sug-add').first();
  await firstAdd.click();
  await d.waitForTimeout(300);
  log('右栏加后变灰:', await d.locator('.sug-item').first().evaluate(e => e.classList.contains('added')));
  log('左栏卡片数:', await d.locator('#list .card').count());
  log('徽章同步:', await d.locator('#badge').textContent());
  await d.screenshot({ path: 'D:/tmp-w2.png' });

  console.log('\n--- 断点切换（1280 → 800）---');
  await d.setViewportSize({ width: 800, height: 900 });
  await d.waitForTimeout(400);
  log('tab 重新出现:', await d.locator('.view-tabs').isVisible());
  log('只显示一栏:', (await d.locator('#viewShelf').isVisible()) !== (await d.locator('#viewSuggest').isVisible()));
  log('大卡重新出现:', await d.locator('#sugHero').isVisible() ? '' : '');
  await d.setViewportSize({ width: 800, height: 900 });
  await d.locator('#tabSuggest').click();
  await d.waitForTimeout(300);
  log('切到推荐后大卡可见:', await d.locator('#sugHero').isVisible());
  await d.screenshot({ path: 'D:/tmp-w3.png' });

  console.log('\n--- 各档宽度：空间利用率 ---');
  for (const w of [1280, 1440, 1920, 2560]) {
    await d.setViewportSize({ width: w, height: 950 });
    await d.waitForTimeout(350);
    const m2 = await d.evaluate(() => {
      const app = document.querySelector('.app');
      const panes = [...document.querySelectorAll('.pane')].map(x => Math.round(x.getBoundingClientRect().width));
      const sug = document.querySelector('.sug-list');
      const cs = sug ? getComputedStyle(sug) : null;
      // 算推荐卡在第一行能放几张
      let perRow = 0;
      if (sug) {
        const first = sug.querySelector('.sug-item');
        if (first) {
          const t = first.getBoundingClientRect().top;
          perRow = [...sug.querySelectorAll('.sug-item')]
            .filter(x => Math.abs(x.getBoundingClientRect().top - t) < 4).length;
        }
      }
      return {
        app宽: Math.round(app.getBoundingClientRect().width),
        留白: window.innerWidth - Math.round(app.getBoundingClientRect().width),
        两栏: panes.join(' : '),
        推荐布局: cs ? cs.gridTemplateColumns : '-',
        每行条数: perRow
      };
    });
    log(`${w}px → app ${m2.app宽} / 留白 ${m2.留白} / 两栏 ${m2.两栏} / 推荐每行 ${m2.每行条数} 条`);
  }

  // ============ 移动窄屏：大卡轮换 ============
  const m = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  m.on('pageerror', e => errs.push('[移动] ' + e.message));
  m.on('console', e => { if (e.type() === 'error') errs.push('[移动] ' + e.text()); });
  await m.goto(FILE);
  await m.waitForTimeout(400);

  console.log('\n=== 移动窄屏（390px）===');
  log('tab 可见:', await m.locator('.view-tabs').isVisible());
  await m.locator('#tabSuggest').click();
  await m.waitForTimeout(300);
  log('大卡可见:', await m.locator('#sugHero').isVisible());
  const heroTxt = await m.locator('#sugHeroText').textContent();
  const heroIdx = await m.locator('#sugHeroIdx').textContent();
  log('大卡内容:', heroTxt);
  log('大卡索引:', heroIdx);
  await m.screenshot({ path: 'D:/tmp-m1.png' });

  console.log('\n--- 换一条只跳没加过的 ---');
  await m.locator('#sugHeroAdd').click();
  await m.waitForTimeout(350);
  const afterAdd = await m.locator('#sugHeroText').textContent();
  log('加完自动跳下一条:', heroTxt !== afterAdd);
  log('  ', heroTxt.slice(0, 12), '→', afterAdd.slice(0, 12));
  log('新索引:', await m.locator('#sugHeroIdx').textContent());
  log('新条目未被加过:', !(await m.locator('.sug-item.added').filter({ hasText: afterAdd.slice(0, 10) }).count()));

  console.log('\n--- 换一条按钮 ---');
  const t1 = await m.locator('#sugHeroText').textContent();
  await m.locator('#sugHeroSkip').click();
  await m.waitForTimeout(250);
  log('换一条有效:', t1 !== (await m.locator('#sugHeroText').textContent()));

  console.log('\n--- 属性筛选 ---');
  const before = await m.locator('.sug-item').count();
  await m.locator('#sugFilters .attr-toggle', { hasText: '要屏幕' }).click();
  await m.waitForTimeout(300);
  log(`筛「要屏幕」: ${before} → ${await m.locator('.sug-item').count()}`);
  await m.locator('#sugFilters .attr-clear').click();
  await m.waitForTimeout(250);
  log('清空后恢复:', await m.locator('.sug-item').count());

  console.log('\n--- 搜索 ---');
  await m.locator('#sugSearch').fill('整理');
  await m.waitForTimeout(350);
  log('搜「整理」:', await m.locator('.sug-item').count(), '条');
  await m.locator('#sugSearch').fill('');
  await m.waitForTimeout(350);

  console.log('\n--- 批量添加 ---');
  await m.locator('#sugFilters .attr-toggle', { hasText: '不看屏幕' }).click();
  await m.waitForTimeout(250);
  const n = await m.locator('.sug-item').count();
  m.on('dialog', x => x.accept());
  await m.locator('#sugAddAll').click();
  await m.waitForTimeout(500);
  log(`筛选出 ${n} 条 → 批量加入后货架: ${await m.locator('#list .card').count()} 件`);
  log('toast 提供撤销:', (await m.locator('.toast .undo').count()) > 0);
  await m.locator('.toast .undo').last().click();
  await m.waitForTimeout(400);
  log('撤销后货架:', await m.locator('#list .card').count(), '件');

  await m.screenshot({ path: 'D:/tmp-m2.png' });

  console.log('\n=== 控制台错误 ===');
  console.log(errs.length ? errs.join('\n') : '  无');
  await browser.close();
})();