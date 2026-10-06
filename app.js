/* 小事杂货铺 —— 逻辑（从 index.html 拆出，勿直接改，改这里后跑 bundle.js 合回） */
/* ============================================================================
   小事杂货铺 —— 无聊时做的小事
   单文件应用：HTML + CSS + JS，无任何依赖，双击即可打开。
   数据存在浏览器 localStorage，可导出 CSV / XLSX / JSON 备份。
   ============================================================================ */
(function () {
  'use strict';

  var KEY = 'boring100.v2';
  var THEME_KEY = 'boring100.theme';
  var REPO_URL = 'https://github.com/zzzzzy2k/boring-hundred';
  var GH_URL = 'https://github.com/zzzzzy2k';
  var DEFAULT_GOAL = 100;

  var $ = function (id) { return document.getElementById(id); };

  /* ==================================================================
     1. 工具函数
     ================================================================== */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function parseTags(str) {
    var out = [];
    String(str == null ? '' : str).split(/[,，、;；\s]+/).forEach(function (s) {
      s = s.trim();
      if (s && out.indexOf(s) === -1) out.push(s);
    });
    return out;
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function dayDiff(dateStr) {
    if (!dateStr) return 9999;
    var a = new Date(String(dateStr).slice(0, 10) + 'T00:00:00');
    var b = new Date(today() + 'T00:00:00');
    if (isNaN(a.getTime())) return 9999;
    return Math.round((b - a) / 86400000);
  }

  /** 把各种日期写法统一成 YYYY-MM-DD；认不出来就返回 '' */
  function normDate(v) {
    v = String(v == null ? '' : v).trim();
    if (!v) return '';
    var m = v.match(/(\d{4})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})/);
    if (m) return m[1] + '-' + pad2(+m[2]) + '-' + pad2(+m[3]);
    if (/^\d{5}$/.test(v)) {                 // Excel 序列号
      var d = new Date(Date.UTC(1899, 11, 30) + (+v) * 86400000);
      if (!isNaN(d.getTime())) return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate());
    }
    var t = Date.parse(v);
    if (!isNaN(t)) { var e = new Date(t); return e.getFullYear() + '-' + pad2(e.getMonth() + 1) + '-' + pad2(e.getDate()); }
    return '';
  }

  function normBool(v) {
    v = String(v == null ? '' : v).trim().toLowerCase();
    return ['是', 'y', 'yes', 'true', '1', '√', '✓', 'x', 'done', '完成'].indexOf(v) !== -1;
  }

  /** 「重复」列的宽容解析：daily /每天 / 每日 / 是 / y 都算 */
  function normRepeat(v) {
    v = String(v == null ? '' : v).trim().toLowerCase();
    if (!v) return 'none';
    if (['daily', '每天', '每日', 'day', 'y', 'yes', 'true', '1', '是', '√'].indexOf(v) !== -1) return 'daily';
    return 'none';
  }

  /* ==================================================================
     1b. 推荐清单数据（60 条，67% 是不看屏幕的）
     ================================================================== */
var SUGGESTIONS = [
  /* ---------- 室内 · 不看屏幕 ---------- */
  { text: '把手机放远一点，静静听十分钟窗外的动静', tags: ['发呆', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '做一道从没做过的菜，哪怕只是一碗面', tags: ['动手', '出门'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '收拾一个抽屉，只收这一处，其他都不动', tags: ['整理', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '找出三件想扔但舍不得的东西，认真想想留不留', tags: ['整理'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把床单被套换下来洗', tags: ['动手', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '给绿植浇水，顺便擦一擦叶子', tags: ['动手', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' }, repeat: 'daily' },
  { text: '站 stretching 拉伸十分钟，对着墙也行', tags: ['运动', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' }, repeat: 'daily' },
  { text: '闭眼躺十分钟，什么都不做', tags: ['发呆', '休息'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把手机里的截图文件夹清一清', tags: ['整理', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '整理一次相册，删掉 20 张重复的', tags: ['整理', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '给书架重排一次——不看价格，只看眼缘', tags: ['整理', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把充电线、钥匙、常用小物固定到一个位置', tags: ['整理', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '挑一张/album 封面，摆到看得见的地方', tags: ['整理', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '写三行今天发生的事，写完就算数', tags: ['记录', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '泡一壶茶，慢慢喝完一整杯', tags: ['发呆', '放松'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把明天的第一件事写下来，想清楚了再睡', tags: ['记录', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },

  /* ---------- 室内 · 用电脑 ---------- */
  { text: '把浏览器书签栏彻底整理一遍', tags: ['整理', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '把下载文件夹清空，建立一个「待整理」文件夹', tags: ['整理', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '写一个特别没用但很快乐的小工具', tags: ['动手', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '把电脑桌面壁纸换掉', tags: ['5分钟', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '看一部你收藏了但一直没看的电影', tags: ['放松', '30分钟'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '把硬盘里从没打开过的文件夹都看一眼', tags: ['整理', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '给某个开源项目写个README（哪怕是自己的）', tags: ['动手', '用电脑'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },

  /* ---------- 室内 · 用手机 ---------- */
  { text: '关掉所有推送通知，安静待一小时', tags: ['休息', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '把常用 App 按「用得上的/用不上的」分两堆', tags: ['整理', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '把首页的 App 数量减到一屏以内', tags: ['整理', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '关掉短视频 App 的推荐推送', tags: ['休息', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },

  /* ---------- 室外 ---------- */
  { text: '去一条没走过的小路走走，不带目的地', tags: ['出门', '散步'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '去公园坐半小时，什么都不干', tags: ['发呆', '室外'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '抬头看看天，数一下云', tags: ['发呆', '5分钟'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '绕着小区走一圈，走平时没走的那半圈', tags: ['出门', '运动'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '去便利店买一样没吃过的东西', tags: ['出门', '10分钟'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '找一家没去过的店，点没点过的菜', tags: ['出门', '探索'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '在附近走一走，认三条没见过的街', tags: ['出门', '探索'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '去菜市场逛一圈，不买也行', tags: ['出门', '30分钟'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '找一家咖啡馆坐着，看别人，自己发呆', tags: ['发呆', '休息'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '给某个路口拍张照，攒一个「我走过的路口」系列', tags: ['记录', '用手机'], attrs: { place: '室外', device: '用手机', screen: '要屏幕' } },

  /* ---------- 室内 · 稍微走动的 ---------- */
  { text: '做 20 个深蹲，或者扶着桌子压腿一分钟', tags: ['运动', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' }, repeat: 'daily' },
  { text: '靠墙站三分钟，把腰挺直', tags: ['运动', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' }, repeat: 'daily' },
  { text: '爬六层楼，当健身', tags: ['运动', '10分钟'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } },
  { text: '开窗通风十分钟，让房间换口气', tags: ['5分钟', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把鞋子全部拿出来重新摆一遍', tags: ['整理', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '给房间换一个香薰或者换一束花', tags: ['5分钟', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把脏衣服立刻洗了，不要攒', tags: ['动手', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '擦一遍门把手和开关面板', tags: ['整理', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '给一个很久没联系的人发条消息', tags: ['社交', '5分钟'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '把冰箱里过期的东西清出来', tags: ['整理', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },

  /* ---------- 需要动脑但不出门 ---------- */
  { text: '翻相册找一张自己十年前的照片，看了别删', tags: ['记录', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '列出「今年做的 10 件还不错的事」', tags: ['记录', '30分钟'], attrs: { place: '在家', device: '用电脑', screen: '要屏幕' } },
  { text: '把一个拖了很久的小决定做了', tags: ['整理', '5分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '学一个新动作：比如徒手撑、开后空、拍出片', tags: ['探索', '30分钟'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '把一个想联系但怕尴尬的人先约了', tags: ['社交', '5分钟'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '去菜市场或超市，只买够今天吃的，不多买', tags: ['出门', '30分钟'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '煮一壶茶或者咖啡，认认真真等它出味', tags: ['动手', '放松'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '睡前把明天的衣服挑好放在门口', tags: ['5分钟', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },

  /* ---------- 室内 · 动脑 ---------- */
  { text: '给自己出一道题并解出来（数独、字谜都行）', tags: ['探索', '10分钟'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把手机里想看的文章存下来，然后真的看一篇', tags: ['整理', '用手机'], attrs: { place: '在家', device: '用手机', screen: '要屏幕' } },
  { text: '去一次楼下的超市，只买三样东西', tags: ['出门', '10分钟'], attrs: { place: '室内', device: '无需电脑', screen: '不看屏幕' } },
  { text: '把一个抽屉装满「以后可能用得上」的东西', tags: ['整理', '在家'], attrs: { place: '在家', device: '无需电脑', screen: '不看屏幕' } },
  { text: '下楼取快递，顺便走一圈回来', tags: ['出门', '10分钟'], attrs: { place: '室外', device: '无需电脑', screen: '不看屏幕' } }
];

/* ==================================================================
     2. 数据层
     ================================================================== */

  /* ------------------------------------------------------------------
     属性体系：固定的几组筛选维度，与自由标签分开
     ------------------------------------------------------------------
     为什么不做成标签：4 个维度 × 3~5 个选项 = 十几个标签，
     筛选栏会爆炸，而且用户会分不清「在家」是标签还是属性。
     分成两层后：属性是固定的几个按钮，标签是用户自己写的。
     ------------------------------------------------------------------ */
  var ATTR_GROUPS = [
    { key: 'place', label: '地点', options: ['在家', '室内', '室外'] },
    { key: 'device', label: '设备', options: ['无需电脑', '用电脑', '用手机'] },
    { key: 'screen', label: '屏幕', options: ['不看屏幕', '要屏幕'] }
  ];

  function allAttrKeys() {
    var out = [];
    ATTR_GROUPS.forEach(function (g) { out.push(g.key); });
    return out;
  }

  function validAttr(key, val) {
    for (var i = 0; i < ATTR_GROUPS.length; i++) {
      if (ATTR_GROUPS[i].key === key) return ATTR_GROUPS[i].options.indexOf(val) !== -1;
    }
    return false;
  }

  function normalizeAttrs(x) {
    var out = {};
    if (!x || typeof x !== 'object') return out;
    allAttrKeys().forEach(function (k) {
      if (validAttr(k, x[k])) out[k] = x[k];
    });
    return out;
  }

  function normalize(arr) {
    if (!Array.isArray(arr)) return null;
    return arr.filter(function (x) { return x && typeof x.text === 'string' && x.text.trim(); })
      .map(function (x) {
        return {
          id: x.id || uid(),
          text: String(x.text).trim(),
          tags: Array.isArray(x.tags) ? x.tags.map(String).filter(Boolean) : [],
          attrs: normalizeAttrs(x.attrs),
          done: !!x.done,
          note: typeof x.note === 'string' ? x.note : '',
          doneDate: normDate(x.doneDate),
          // 重复项：repeat 为 'daily' 时每天重置；lastDone 存最近一次打卡日期
          repeat: x.repeat === 'daily' ? 'daily' : 'none',
          lastDone: normDate(x.lastDone),
          streak: Math.max(0, parseInt(x.streak, 10) || 0),
          best: Math.max(0, parseInt(x.best, 10) || 0),
          createdAt: Number(x.createdAt) || Date.now()
        };
      });
  }

  function load() {
    var empty = { items: [], goal: DEFAULT_GOAL };
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return empty;
      var d = JSON.parse(raw);
      var list = Array.isArray(d) ? normalize(d) : normalize(d.items);   // 兼容早期纯数组格式
      if (!list) return empty;
      var g = (!Array.isArray(d) && +d.goal >= 1) ? Math.floor(d.goal) : DEFAULT_GOAL;
      return { items: list, goal: g };
    } catch (e) {
      return empty;
    }
  }

  var loaded = load();
  var items = loaded.items;
  var goal = loaded.goal;

  // 上次导出备份的日期。iOS Safari 与 PWA 都会在长期不访问时清掉localStorage，
  // 所以要用「多久没备份」来提醒用户，而不是假设数据永远在
  var BACKUP_KEY = 'boring100.lastBackup';
  var SNOOZE_KEY = 'boring100.backupSnooze';
  var REMIND_DAYS = 7;          // 超过这个天数就在页面上提醒
  var REMIND_DAYS_WARN = 14;    // 到这个天数语气要更重

  function lastBackupDays() {
    try {
      var s = localStorage.getItem(BACKUP_KEY);
      if (!s) return null;                 // 从没导出过
      var a = new Date(s + 'T00:00:00');
      var b = new Date(today() + 'T00:00:00');
      if (isNaN(a.getTime())) return null;
      return Math.round((b - a) / 86400000);
    } catch (e) { return null; }
  }

  function markBackedUp() {
    try { localStorage.setItem(BACKUP_KEY, today()); } catch (e) {}
  }

  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify({ v: 2, goal: goal, items: items })); }
      catch (e) { toast('保存失败，可能是浏览器存储满了'); }
    }, 120);
  }

  var ui = { filter: 'all', tag: null, search: '', sort: 'new', attrs: {}, view: 'shelf', sugSearch: '', attrPanelOpen: false };
  var editingId = null, randomId = null, noteId = null, delId = null, lastFocus = null;
  var pendingImport = null;
  var replaceArmed = false, replaceTimer = null;   // 「清空后导入」的二次确认状态

  /* ==================================================================
     3. Toast
     ================================================================== */
  function toast(msg, undoFn) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + esc(msg) + '</span>';
    if (undoFn) {
      var u = document.createElement('button');
      u.className = 'undo';
      u.textContent = '撤销';
      u.onclick = function () { undoFn(); dismiss(); };
      el.appendChild(u);
    }
    $('toastWrap').appendChild(el);
    var timer = setTimeout(dismiss, undoFn ? 5200 : 2800);
    function dismiss() {
      clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.remove(); }, 220);
    }
  }

  /* ==================================================================
     4. 计算
     ================================================================== */
  function find(id) {
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  function doneCount() { return items.filter(function (i) { return doneToday(i); }).length; }
  function dailyCount() { return items.filter(isDaily).length; }
  function countTag(t) {
    var n = 0;
    items.forEach(function (i) { if (i.tags.indexOf(t) !== -1) n++; });
    return n;
  }
  function allTags() {
    var map = {};
    items.forEach(function (i) { i.tags.forEach(function (t) { map[t] = (map[t] || 0) + 1; }); });
    return Object.keys(map).sort(function (a, b) { return map[b] - map[a] || a.localeCompare(b, 'zh'); });
  }

  /* ------------------------------------------------------------------
     每日重复项
     ------------------------------------------------------------------
     设计原则：**不制造逾期压力**。
       - 每天自动回到「未做」是自然语义，不需要额外提示
       - 断签后连击归 1，但**不显示任何「断了」「逾期」字样**
       - 已打卡显示「已连续 N 天」，这是正反馈而非负反馈
     实现上不真的重置数据（避免「昨天做了今天就消失」的历史丢失），
     而是用 lastDone 与今天比较来动态推导显示状态。
     ------------------------------------------------------------------ */
  function isDaily(it) { return it.repeat === 'daily'; }

  /** 今天是否已打卡 */
  function doneToday(it) {
    return isDaily(it) ? it.lastDone === today() : !!it.done;
  }

  /** 今天算第几天（首次为 1） */
  function dayIndex(it) {
    if (!isDaily(it) || !it.lastDone) return 0;
    return Math.max(1, dayDiff(it.lastDone) + 1);
  }

  /** 连击：昨天或今天打过卡才延续，否则从1 重新开始 */
  function currentStreak(it) {
    if (!isDaily(it) || !it.lastDone) return 0;
    var d = dayDiff(it.lastDone);
    if (d > 1) return 1;                    // 断签：归 1，不提示
    return Math.max(1, it.streak || 1);
  }

  function toggleDaily(id) {
    var it = find(id);
    if (!it) return;
    var t = today();
    if (it.lastDone === t) {
      // 今天已经打过，撤销
      it.lastDone = '';
      it.streak = 0;
      toast('已取消今天的打卡');
    } else {
      var gap = dayDiff(it.lastDone);       // 距上次多少天
      it.streak = (it.lastDone && gap <= 1) ? (it.streak || 1) + 1 : 1;
      it.lastDone = t;
      it.best = Math.max(it.best || 0, it.streak);
      if (it.streak > 1) toast('已连续 ' + it.streak + ' 天');
    }
    save();
    render();
  }

  function visibleItems() {
    var q = ui.search.trim().toLowerCase();
    var attrs = ui.attrs || {};
    var list = items.filter(function (i) {
      // 「待做 / 做过」对重复项按今天是否打卡来判断
      if (ui.filter === 'todo' && doneToday(i)) return false;
      if (ui.filter === 'done' && !doneToday(i)) return false;
      if (ui.tag && i.tags.indexOf(ui.tag) === -1) return false;

      // 属性筛选：同一维度内多选取交集，不同维度间取并集
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (!attrs[k]) continue;
        if ((i.attrs || {})[k] !== attrs[k]) return false;
      }

      if (q) {
        var hay = (i.text + ' ' + i.tags.join(' ') + ' ' + i.note).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    list.sort(function (a, b) {
      // 重复项且今天已打卡的，优先排到后面，别挡在最上面
      var ad = doneToday(a) ? 1 : 0, bd = doneToday(b) ? 1 : 0;
      switch (ui.sort) {
        case 'old':  return a.createdAt - b.createdAt;
        case 'todo': return (ad - bd) || (b.createdAt - a.createdAt);
        case 'done': return (bd - ad) || (b.createdAt - a.createdAt);
        default:     return (ad - bd) || (b.createdAt - a.createdAt);
      }
    });
    return list;
  }

  /* ==================================================================
     5. 渲染
     ================================================================== */
  function render() {
    renderStats(); renderFilters(); renderAttrBar();
    renderQuickTags(); renderBackupBar(); renderList();
    // 推荐清单页开着时同步刷新（新增/删除都会影响「已添加」标记）
    if (ui.view === 'suggest' && !$('viewSuggest').hidden) {
      renderSugFilters(); renderSugList();
    }
  }

  function renderAttrBar() {
    var host = $('attrBar');
    if (!host) return;
    host.innerHTML = '';

    var anyOn = ATTR_GROUPS.some(function (g) { return ui.attrs && ui.attrs[g.key]; });
    // 同步筛选按钮的高亮状态
    var btn = $('attrBtn');
    if (btn) {
      btn.classList.toggle('on', anyOn);
      btn.setAttribute('aria-pressed', anyOn ? 'true' : 'false');
    }

    if (!anyOn && !ui.attrPanelOpen) { host.style.display = 'none'; return; }
    host.style.display = '';

    ATTR_GROUPS.forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'attr-group';

      var lab = document.createElement('span');
      lab.className = 'glabel';
      lab.textContent = g.label;
      row.appendChild(lab);

      g.options.forEach(function (opt) {
        var b = document.createElement('button');
        b.className = 'attr-toggle' + (ui.attrs[g.key] === opt ? ' on' : '');
        b.type = 'button';
        b.textContent = opt;
        b.setAttribute('aria-pressed', ui.attrs[g.key] === opt ? 'true' : 'false');
        b.onclick = function () {
          ui.attrs[g.key] = (ui.attrs[g.key] === opt) ? '' : opt;
          render();
        };
        row.appendChild(b);
      });

      host.appendChild(row);
    });

    var clr = document.createElement('button');
    clr.className = 'attr-clear';
    clr.type = 'button';
    clr.textContent = '清空属性筛选';
    clr.onclick = function () {
      ui.attrs = {};
      ui.attrPanelOpen = false;
      render();
    };
    host.appendChild(clr);
  }

  function renderStats() {
    var total = items.length, done = doneCount();
    var text = total + ' / ' + goal;
    $('badge').textContent = text;
    $('numCollect').textContent = text;
    $('numFinish').textContent = done + ' 件';
    $('fillCollect').style.width = Math.min(100, total / goal * 100) + '%';
    $('fillFinish').style.width = (total ? done / total * 100 : 0) + '%';
    $('footStat').textContent = total + ' 件小事，' + done + ' 件做过';
    $('goalInput').value = goal;
  }

  function renderFilters() {
    var wrap = $('filters');
    wrap.innerHTML = '';
    var total = items.length, done = doneCount();
    wrap.appendChild(chip('全部', 'all', null, total, ui.filter === 'all' && !ui.tag));
    wrap.appendChild(chip('待做', 'todo', null, total - done, ui.filter === 'todo' && !ui.tag));
    wrap.appendChild(chip('做过', 'done', null, done, ui.filter === 'done' && !ui.tag));
    allTags().forEach(function (t) {
      wrap.appendChild(chip(t, 'tag', t, countTag(t), ui.tag === t));
    });
  }

  function chip(label, kind, tagVal, count, active) {
    var b = document.createElement('button');
    b.className = 'chip' + (active ? ' active' : '');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', active ? 'true' : 'false');
    b.innerHTML = esc(label) + (count ? '<span class="cnt">' + count + '</span>' : '');
    b.onclick = function () {
      if (kind === 'tag') ui.tag = (ui.tag === tagVal) ? null : tagVal;
      else { ui.filter = kind; ui.tag = null; }
      render();
    };
    return b;
  }

  function renderQuickTags() {
    var wrap = $('quickTags');
    var tags = allTags().slice(0, 8);
    wrap.innerHTML = '';
    if (tags.length === 0) return;
    var lab = document.createElement('span');
    lab.className = 'qt-label';
    lab.textContent = '常用';
    wrap.appendChild(lab);
    tags.forEach(function (t) {
      var b = document.createElement('button');
      b.className = 'qt';
      b.type = 'button';
      b.textContent = '+ ' + t;
      b.onclick = function () {
        var input = $('newTags');
        var cur = parseTags(input.value);
        if (cur.indexOf(t) === -1) cur.push(t);
        input.value = cur.join('，');
        input.focus();
      };
      wrap.appendChild(b);
    });
  }

  function renderList() {
    var list = $('list');
    list.innerHTML = '';
    var shown = visibleItems();
    $('listCount').textContent = shown.length === items.length
      ? '共 ' + items.length + ' 件'
      : '筛出 ' + shown.length + ' / ' + items.length + ' 件';

    if (shown.length === 0) {
      var li = document.createElement('li');
      li.className = 'empty';
      if (items.length === 0) {
        li.innerHTML = '<span class="emoji">🧺</span><p>货架还是空的。</p>' +
          '<p class="small">在上面写下第一件小事吧 —— 不用完整，先记下来再说。</p>';
        var b = document.createElement('button');
        b.className = 'btn accent';
        b.textContent = '📋 下载表格模板批量填写';
        b.onclick = downloadTemplate;
        li.appendChild(b);
      } else {
        li.innerHTML = '<span class="emoji">🔍</span><p>没找到符合条件的小事。</p>' +
          '<p class="small">换个筛选条件或清空搜索试试。</p>';
      }
      list.appendChild(li);
      return;
    }

    var frag = document.createDocumentFragment();
    shown.forEach(function (it) { frag.appendChild(cardEl(it)); });
    list.appendChild(frag);
  }

  function cardEl(it) {
    var li = document.createElement('li');
    var done = doneToday(it);
    li.className = 'card' + (done ? ' done' : '') + (isDaily(it) ? ' daily' : '');

    var check = document.createElement('button');
    check.className = 'check';
    check.type = 'button';
    check.textContent = isDaily(it) ? '✓' : '✓';
    check.setAttribute('aria-label', (done ? '取消打卡：' : '打卡：') + it.text);
    check.setAttribute('aria-pressed', done ? 'true' : 'false');
    check.onclick = function () { toggleDone(it.id); };
    li.appendChild(check);

    var body = document.createElement('div');
    body.className = 'body';

    if (editingId === it.id) {
      body.appendChild(editorEl(it));
    } else {
      var text = document.createElement('div');
      text.className = 'text';
      text.textContent = it.text;
      body.appendChild(text);

      var meta = document.createElement('div');
      meta.className = 'meta';

      // 重复项的标签：循环图标 + 打卡状态
      if (isDaily(it)) {
        var rep = document.createElement('span');
        rep.className = 'tag rep';
        rep.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 2l4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="M7 22l-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>每天';
        rep.title = '每天重复 · 点左侧圆圈打卡';
        meta.appendChild(rep);

        if (done) {
          var sk = document.createElement('span');
          sk.className = 'tag streak';
          sk.textContent = '已连续 ' + currentStreak(it) + ' 天';
          meta.appendChild(sk);
        } else if (it.lastDone) {
          var idx = document.createElement('span');
          idx.className = 'tag';
          idx.textContent = '今天第 ' + dayIndex(it) + ' 天';
          meta.appendChild(idx);
        }
      }

      it.tags.forEach(function (t) {
        var s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        meta.appendChild(s);
      });

      // 属性用不同颜色区分，让「属性」和「标签」在视觉上分得开
      allAttrKeys().forEach(function (k) {
        if (!it.attrs || !it.attrs[k]) return;
        var a = document.createElement('span');
        a.className = 'tag attr';
        a.textContent = it.attrs[k];
        meta.appendChild(a);
      });

      if (!isDaily(it) && it.done) {
        var d = dayDiff(it.doneDate);
        var st = document.createElement('span');
        st.className = 'tag stat';
        st.textContent = d <= 0 ? '今天做的' : d + ' 天前做的';
        meta.appendChild(st);
      }
      if (meta.childNodes.length) body.appendChild(meta);

      // 重复项不弹备注框，改成一行轻量的自由记录
      if (isDaily(it)) {
        var dnote = document.createElement('div');
        dnote.className = 'note ' + (it.note ? 'has' : 'ph');
        dnote.textContent = it.note ? it.note : '＋ 今天想说点什么';
        dnote.onclick = function () { openNote(it.id); };
        body.appendChild(dnote);
      } else if (it.done) {
        var note = document.createElement('div');
        note.className = 'note ' + (it.note ? 'has' : 'ph');
        note.textContent = it.note ? it.note : '＋ 记点什么';
        note.onclick = function () { openNote(it.id); };
        body.appendChild(note);
      }
    }
    li.appendChild(body);

    var acts = document.createElement('div');
    acts.className = 'acts';

    var edit = document.createElement('button');
    edit.className = 'act';
    edit.type = 'button';
    edit.title = '编辑';
    edit.setAttribute('aria-label', '编辑：' + it.text);
    edit.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"></path></svg>';
    edit.onclick = function () { editingId = (editingId === it.id) ? null : it.id; render(); };

    var del = document.createElement('button');
    del.className = 'act del';
    del.type = 'button';
    del.title = '删除';
    del.setAttribute('aria-label', '删除：' + it.text);
    del.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"></path></svg>';
    del.onclick = function () { askDelete(it.id); };

    acts.appendChild(edit);
    acts.appendChild(del);
    li.appendChild(acts);
    return li;
  }

  function editorEl(it) {
    var wrap = document.createElement('div');
    wrap.className = 'edit-row';

    var ta = document.createElement('textarea');
    ta.rows = 2; ta.value = it.text;
    ta.setAttribute('aria-label', '编辑内容');

    var tg = document.createElement('input');
    tg.type = 'text'; tg.value = it.tags.join('，');
    tg.placeholder = '标签，逗号分隔';
    tg.setAttribute('aria-label', '编辑标签');

    // 重复设置
    var repWrap = document.createElement('div');
    repWrap.className = 'edit-line';
    var repLab = document.createElement('span');
    repLab.className = 'edit-label';
    repLab.textContent = '重复';
    repWrap.appendChild(repLab);

    var repBtn = document.createElement('button');
    repBtn.type = 'button';
    repBtn.className = 'mini-btn toggle' + (isDaily(it) ? ' on' : '');
    repBtn.textContent = isDaily(it) ? '每天' : '不重复';
    repBtn.onclick = function () {
      isDaily(it) ? (it.repeat = 'none') : (it.repeat = 'daily');
      repBtn.textContent = isDaily(it) ? '每天' : '不重复';
      repBtn.classList.toggle('on', isDaily(it));
    };
    repWrap.appendChild(repBtn);
    var repTip = document.createElement('span');
    repTip.className = 'edit-hint';
    repTip.textContent = isDaily(it) ? '每天自动回到未做' : '';
    repBtn.addEventListener('click', function () { repTip.textContent = isDaily(it) ? '每天自动回到未做' : ''; });

    // 属性选择：每组只能选一个（点已选的取消）
    var draftAttrs = {};
    allAttrKeys().forEach(function (k) { draftAttrs[k] = (it.attrs || {})[k] || ''; });

    var attrWrap = document.createElement('div');
    attrWrap.className = 'edit-line';
    var attrLab = document.createElement('span');
    attrLab.className = 'edit-label';
    attrLab.textContent = '属性';
    attrWrap.appendChild(attrLab);

    var attrBox = document.createElement('div');
    attrBox.className = 'attr-picker';
    ATTR_GROUPS.forEach(function (g) {
      var grp = document.createElement('div');
      grp.className = 'attr-grp';
      g.options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'attr-opt' + (draftAttrs[g.key] === opt ? ' on' : '');
        b.textContent = opt;
        b.onclick = function () {
          draftAttrs[g.key] = (draftAttrs[g.key] === opt) ? '' : opt;
          Array.prototype.forEach.call(grp.children, function (c) {
            c.classList.toggle('on', c.textContent === draftAttrs[g.key]);
          });
        };
        grp.appendChild(b);
      });
      attrBox.appendChild(grp);
    });
    attrWrap.appendChild(attrBox);

    var cancel = document.createElement('button');
    cancel.className = 'mini-btn'; cancel.type = 'button'; cancel.textContent = '取消';
    cancel.onclick = function () { editingId = null; render(); };

    var ok = document.createElement('button');
    ok.className = 'mini-btn primary'; ok.type = 'button'; ok.textContent = '保存';
    ok.onclick = function () {
      var t = ta.value.trim();
      if (!t) { ta.focus(); return; }
      it.text = t;
      it.tags = parseTags(tg.value);
      it.attrs = {};
      allAttrKeys().forEach(function (k) { if (draftAttrs[k]) it.attrs[k] = draftAttrs[k]; });
      // 从「每天」改回「不重复」时，清掉打卡记录，否则会显示成「今天第 N 天」
      if (it.repeat !== 'daily') { it.lastDone = ''; it.streak = 0; }
      editingId = null;
      save(); render();
    };

    function esc2() { editingId = null; render(); }
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { esc2(); return; }
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ok.click(); }
    });
    tg.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { esc2(); return; }
      if (e.key === 'Enter') { e.preventDefault(); ok.click(); }
    });

    var row = document.createElement('div');
    row.className = 'edit-actions';
    row.appendChild(cancel);
    row.appendChild(ok);
    wrap.appendChild(ta);
    wrap.appendChild(tg);
    wrap.appendChild(repWrap);
    wrap.appendChild(attrWrap);
    wrap.appendChild(row);
    setTimeout(function () { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 30);
    return wrap;
  }

  /* ==================================================================
     6. 操作
     ================================================================== */
  function toggleDone(id) {
    var it = find(id);
    if (!it) return;
    // 重复项走打卡逻辑，不弹备注框（每天打卡不需要写感受）
    if (isDaily(it)) { toggleDaily(id); return; }
    if (it.done) {
      it.done = false; it.doneDate = '';
      save(); render();
    } else {
      it.done = true; it.doneDate = today();
      save(); render();
      openNote(id);
    }
  }

  function addItem() {
    var ta = $('newText'), ti = $('newTags');
    var text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    items.unshift({
      id: uid(), text: text, tags: parseTags(ti.value),
      done: false, note: '', doneDate: '', createdAt: Date.now()
    });
    ta.value = ''; ti.value = '';
    autoGrow(ta);
    save(); render();
    ta.focus();
  }

  function askDelete(id) {
    var it = find(id);
    if (!it) return;
    delId = id;
    $('delText').textContent = '「' + it.text + '」';
    openModal($('delOverlay'), function () { $('delCancel').focus(); });
  }

  function doDelete() {
    if (!delId) return;
    var idx = -1;
    for (var k = 0; k < items.length; k++) if (items[k].id === delId) { idx = k; break; }
    if (idx === -1) return;
    var removed = items.splice(idx, 1)[0];
    if (editingId === delId) editingId = null;
    save(); render();
    closeModal($('delOverlay'));
    delId = null;
    toast('已删除「' + (removed.text.length > 12 ? removed.text.slice(0, 12) + '…' : removed.text) + '」', function () {
      items.splice(idx, 0, removed);
      save(); render();
    });
  }

  function pickRandom() {
    var pool = items.filter(function (i) { return !i.done; });
    if (pool.length === 0) {
      pool = items.slice();
      if (pool.length === 0) { toast('货架还空着，先添加几件吧'); $('newText').focus(); return; }
      toast('全都做过了，那就重温一件');
    }
    // 加权：没做过的 3 倍权重；做过的按距今天数衰减
    var bag = [];
    pool.forEach(function (i) {
      var w = i.done ? Math.max(1, 30 - dayDiff(i.doneDate)) : 3;
      for (var k = 0; k < w; k++) bag.push(i);
    });
    randomId = bag[Math.floor(Math.random() * bag.length)].id;

    var pick = find(randomId);
    $('randomText').textContent = pick.text;
    var meta = $('randomMeta');
    meta.innerHTML = '';
    pick.tags.forEach(function (t) {
      var s = document.createElement('span');
      s.className = 'tag'; s.textContent = t;
      meta.appendChild(s);
    });
    openModal($('randomOverlay'), function () { $('randomDone').focus(); });
  }

  /* ==================================================================
     7. Modal
     ================================================================== */
  function openModal(overlay, focusFn) {
    lastFocus = document.activeElement;
    overlay.classList.add('show');
    if (focusFn) setTimeout(focusFn, 40);
  }
  function closeModal(overlay) {
    overlay.classList.remove('show');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }
  function openNote(id) {
    var it = find(id);
    if (!it) return;
    noteId = id;
    $('noteItemText').textContent = it.text;
    $('noteInput').value = it.note || '';
    openModal($('noteOverlay'), function () { $('noteInput').focus(); });
  }
  function closeNote() { closeModal($('noteOverlay')); noteId = null; }

  function openSettings() {
    $('goalInput').value = goal;
    syncSeg();
    openModal($('settingsOverlay'), function () { $('goalInput').focus(); });
  }

  function applyGoal() {
    var v = parseInt($('goalInput').value, 10);
    if (!isFinite(v) || v < 1) v = DEFAULT_GOAL;
    goal = Math.min(9999, v);
    $('goalInput').value = goal;
    save(); renderStats();
  }

  /* ==================================================================
     8. 主题
     ================================================================== */
  function currentTheme() {
    try { return localStorage.getItem(THEME_KEY) || 'auto'; } catch (e) { return 'auto'; }
  }

  function applyTheme(t) {
    var dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    try {
      if (t === 'auto') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
    paintThemeBtn();
    syncSeg();
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#171512' : '#f7f5f0';
  }

  var SUN = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
  var MOON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>';
  var AUTO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 3v18"></path><path d="M12 7a5 5 0 0 1 0 10"></path></svg>';

  function paintThemeBtn() {
    var t = currentTheme();
    var dark = document.documentElement.classList.contains('dark');
    var label = t === 'auto'
      ? '主题：跟随系统（点击切到' + (dark ? '亮色' : '暗色') + '）'
      : (t === 'dark' ? '主题：暗色（点击切到亮色）' : '主题：亮色（点击切到暗色）');
    $('themeBtn').innerHTML = t === 'auto' ? AUTO : (dark ? MOON : SUN);
    $('themeBtn').title = label;
    $('themeBtn').setAttribute('aria-label', label);
  }

  function syncSeg() {
    var t = currentTheme();
    Array.prototype.forEach.call($('themeSeg').children, function (b) {
      b.classList.toggle('on', b.dataset.theme === t);
    });
  }

  /* ==================================================================
     10. CSV 读写（手写解析器，支持引号包裹 / 内嵌逗号 / 内嵌换行 / BOM）
     ================================================================== */
  var CSV_HEAD = ['内容', '标签', '重复', '已完成', '完成日期', '备注', '地点', '设备', '屏幕', 'ID'];

  function csvCell(v) {
    v = String(v == null ? '' : v);
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  /** RFC 4180 标准解析 */
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    var rows = [], row = [], field = '', i = 0, quoted = false;
    while (i < text.length) {
      var c = text[i];
      if (quoted) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { quoted = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r') { i++; continue; }
      if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
      field += c; i++;
    }
    if (field.length || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ''; });
    });
  }

  /** 表头 -> 列下标。兼容中英文列名，也兼容用户调整了列顺序 */
  function mapHeader(row) {
    var idx = {};
    row.forEach(function (h, i) { idx[String(h).trim().toLowerCase()] = i; });
    function pick(names, fallback) {
      for (var n = 0; n < names.length; n++) if (idx[names[n]] !== undefined) return idx[names[n]];
      return fallback;
    }
    return {
      text: pick(['内容', '事项', '小事', 'text', 'item', 'title'], 0),
      tags: pick(['标签', 'tags', 'tag'], 1),
      repeat: pick(['重复', 'repeat'], 2),
      done: pick(['已完成', '完成', 'done', 'finished'], 3),
      date: pick(['完成日期', '日期', 'done date', 'date'], 4),
      note: pick(['备注', '感受', 'note', 'notes', 'remark'], 5),
      place: pick(['地点', 'place'], 6),
      device: pick(['设备', 'device'], 7),
      screen: pick(['屏幕', 'screen'], 8),
      id:   pick(['id', '编号'], 9)
    };
  }

  function rowsToItems(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return [];
    var m = mapHeader(rows[0]);
    function cell(row, i) {
      var v = row[i];
      return v == null ? '' : String(v);
    }
    var out = [];
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r] || [];
      var text = cell(row, m.text).trim();
      if (!text) continue;

      var repeat = normRepeat(cell(row, m.repeat));
      // 重复项的「已完成」直接当作今天的打卡（导入即算今天做过了）
      var done = normBool(cell(row, m.done));

      var attrs = {};
      [['place', m.place], ['device', m.device], ['screen', m.screen]].forEach(function (p) {
        var v = cell(row, p[1]).trim();
        if (validAttr(p[0], v)) attrs[p[0]] = v;
      });

      out.push({
        id: cell(row, m.id).trim() || uid(),
        text: text,
        tags: parseTags(cell(row, m.tags)),
        attrs: attrs,
        done: repeat === 'daily' ? false : done,
        note: cell(row, m.note).trim(),
        doneDate: (repeat === 'daily' || !done) ? '' : normDate(cell(row, m.date)),
        repeat: repeat,
        lastDone: '',
        streak: 0,
        best: 0,
        createdAt: Date.now() + r      // 行号小的视为更早添加
      });
    }
    return out;
  }

  function itemsToCSV() {
    var lines = [CSV_HEAD.map(csvCell).join(',')];
    items.forEach(function (i) {
      lines.push([
        i.text,
        i.tags.join('，'),
        isDaily(i) ? '每天' : '',
        isDaily(i) ? (doneToday(i) ? '是' : '') : (i.done ? '是' : ''),
        i.doneDate || '',
        i.note,
        (i.attrs || {}).place || '',
        (i.attrs || {}).device || '',
        (i.attrs || {}).screen || '',
        i.id
      ].map(csvCell).join(','));
    });
    return '\uFEFF' + lines.join('\r\n');   // BOM 让 Excel 正确识别 UTF-8
  }

  /* ==================================================================
     10. XLSX 读取（浏览器原生 DecompressionStream 解 zip，零依赖）
     ================================================================== */
  var CAN_XLSX = typeof DecompressionStream === 'function';

  function unzip(buf, wantName) {
    var dv = new DataView(buf);
    var eocd = -1;
    for (var i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return Promise.reject(new Error('不是有效的 xlsx（zip 结构找不到）'));

    var count = dv.getUint16(eocd + 10, true);
    var dec = new TextDecoder('utf-8');
    var p = dv.getUint32(eocd + 16, true);

    for (var n = 0; n < count; n++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var method = dv.getUint16(p + 10, true);
      var compSize = dv.getUint32(p + 20, true);
      var nameLen = dv.getUint16(p + 28, true);
      var extraLen = dv.getUint16(p + 30, true);
      var cmtLen = dv.getUint16(p + 32, true);
      var localOff = dv.getUint32(p + 42, true);
      var name = dec.decode(new Uint8Array(buf, p + 46, nameLen));
      p += 46 + nameLen + extraLen + cmtLen;

      if (name !== wantName) continue;

      var dataStart = localOff + 30 + dv.getUint16(localOff + 26, true) + dv.getUint16(localOff + 28, true);
      var raw = buf.slice(dataStart, dataStart + compSize);
      if (method === 0) return Promise.resolve(dec.decode(raw));
      if (method !== 8) return Promise.reject(new Error('xlsx 用了不支持的压缩方式'));

      return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw')))
        .arrayBuffer()
        .then(function (ab) { return dec.decode(new Uint8Array(ab)); });
    }
    return Promise.reject(new Error('xlsx 里找不到 ' + wantName));
  }

  function unescapeXml(s) {
    return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(+n); })
      .replace(/&amp;/g, '&');
  }

  function parseSharedStrings(xml) {
    var out = [], m;
    var siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
    var tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
    while ((m = siRe.exec(xml))) {
      var txt = '', t;
      tRe.lastIndex = 0;
      while ((t = tRe.exec(m[1]))) txt += t[1];
      out.push(unescapeXml(txt));
    }
    return out;
  }

  function colIndex(ref) {
    var m = String(ref).match(/^([A-Z]+)/);
    if (!m) return 0;
    var s = m[1], n = 0;
    for (var i = 0; i < s.length; i++) n = n * 26 + (s.charCodeAt(i) - 64);
    return n - 1;
  }

  function parseSheet(xml, shared) {
    var rows = [], rm;
    var rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
    var cellRe = /<c\b([^>]*)\/>|<c\b([^>]*)>([\s\S]*?)<\/c>/g;
    while ((rm = rowRe.exec(xml))) {
      var cells = [], cm;
      cellRe.lastIndex = 0;
      while ((cm = cellRe.exec(rm[1]))) {
        var attrs = cm[1] || cm[2] || '';
        var inner = cm[3] || '';
        var ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
        var type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
        var idx = ref ? colIndex(ref) : cells.length;

        var val = '';
        if (type === 'inlineStr') {
          var tRe = /<t\b[^>]*>([\s\S]*?)<\/t>/g, t;
          while ((t = tRe.exec(inner))) val += t[1];
          val = unescapeXml(val);
        } else {
          var v = (inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/) || [])[1];
          if (v !== undefined) {
            val = unescapeXml(v);
            if (type === 's') val = shared[+v] || '';
          }
        }
        while (cells.length < idx) cells.push('');
        cells[idx] = val;
      }
      rows.push(cells);
    }
    return rows;
  }

  function readXLSX(ab) {
    var buf = ab instanceof ArrayBuffer ? ab : ab.buffer;
    return unzip(buf, 'xl/sharedStrings.xml')
      .catch(function () { return '<si></si>'; })       // openpyxl 等工具写出的文件可能没有共享字符串表
      .then(function (ssXml) {
        return unzip(buf, 'xl/worksheets/sheet1.xml').then(function (sheetXml) {
          var rows = parseSheet(sheetXml, parseSharedStrings(ssXml));
          if (rows.length < 2) throw new Error('这个 xlsx 里只有表头，没有数据行');
          // 交给同一个 rowsToItems 处理（它会按表头定位各列），
          // 表头不像模板时先补一行标准表头，保证列映射一致
          var m = mapHeader(rows[0]);
          var headText = String(rows[0][m.text] == null ? '' : rows[0][m.text]).trim().toLowerCase();
          var known = ['内容', '事项', '小事', 'text', 'title', 'item'];
          if (known.indexOf(headText) === -1) rows.unshift(CSV_HEAD.slice());
          return rowsToItems(rows);
        });
      });
  }

  /* ==================================================================
     11. 导入 / 导出 / 模板
     ================================================================== */
  function download(filename, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function downloadTemplate() {
    // 示例行刻意覆盖各种情况：一次性/已完成/每日重复/带属性，
    // 用户照着抄就知道每一列该怎么填
    var rows = [
      CSV_HEAD,
      ['去楼下走一条没走过的小路', '出门，10分钟', '', '', '', '', '室外', '无需电脑', '不看屏幕', ''],
      ['把相册里第 100 张照片删掉', '整理，在家', '', '是', today(), '比想象中爽', '在家', '用手机', '要屏幕', ''],
      ['拉伸十分钟', '运动', '每天', '', '', '', '在家', '无需电脑', '不看屏幕', ''],
      ['给一个很久没联系的朋友发条消息', '社交，5分钟', '', '', '', '', '', '', '', '']
    ];
    var csv = '\uFEFF' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    download('小事杂货铺-模板.csv', csv, 'text/csv;charset=utf-8');
    toast('模板已下载，填完直接导入');
  }

  function exportCSV() {
    if (items.length === 0) { toast('还没有数据可以导出'); return; }
    download('小事杂货铺-' + today() + '.csv', itemsToCSV(), 'text/csv;charset=utf-8');
    markBackedUp();
    renderBackupBar();
    toast('已导出 CSV（' + items.length + ' 件），Excel 可直接打开');
  }

  function exportJSON() {
    var payload = JSON.stringify({ app: 'boring-hundred', version: 2, exportedAt: today(), goal: goal, items: items }, null, 2);
    download('小事杂货铺-备份-' + today() + '.json', payload, 'application/json');
    markBackedUp();
    renderBackupBar();
    toast('完整备份已导出');
  }

  function afterParse(incoming) {
    if (incoming.length === 0) {
      toast('文件里没读到有效数据，检查一下「内容」那一列是不是标题行');
      return;
    }
    pendingImport = incoming;
    var seen = {}, dup = 0;
    items.forEach(function (i) { seen[i.text.trim()] = true; });
    incoming.forEach(function (i) { if (seen[i.text.trim()]) dup++; });
    $('importTitle').textContent = '读到 ' + incoming.length + ' 件小事';
    $('importDetail').textContent = dup
      ? '其中 ' + dup + ' 件内容和货架上现有的重复，合并时会自动跳过。'
      : '全部都是新的。';
    replaceArmed = false;
    clearTimeout(replaceTimer);
    var rb = $('importReplace');
    rb.textContent = '清空后只留这次的';
    rb.classList.add('ghost');
    rb.classList.remove('danger');
    openModal($('importOverlay'), function () { $('importMerge').focus(); });
  }

  function closeImportFlow() {
    pendingImport = null;
    closeModal($('importOverlay'));
    // 导入通常是从设置面板里发起的，收尾时把设置面板也一并关掉，
    // 否则它会继续盖在界面上挡住操作
    if ($('settingsOverlay').classList.contains('show')) closeModal($('settingsOverlay'));
  }

  function applyIncoming(incoming, mode) {
    var msg;
    if (mode === 'replace') {
      items = incoming;
      editingId = null;
      msg = '已导入 ' + items.length + ' 件';
    } else {
      var seen = {}, added = 0, dup = 0;
      items.forEach(function (i) { seen[i.text.trim()] = true; });
      incoming.forEach(function (i) {
        if (seen[i.text.trim()]) { dup++; return; }
        seen[i.text.trim()] = true;
        items.push(i);
        added++;
      });
      msg = '合并了 ' + added + ' 件' + (dup ? '，跳过 ' + dup + ' 件重复' : '');
    }
    save();
    render();
    closeImportFlow();
    toast(msg);
  }

  function handleFile(file) {
    // 一次性读整个文件：先看头 4 字节判断类型（xlsx 是 zip，magic 为 "PK"），
    // 同一份 ArrayBuffer 复用给 CSV/xlsx 两条路径，避免二次读盘
    file.arrayBuffer().then(function (ab) {
      var d = new Uint8Array(ab, 0, Math.min(4, ab.byteLength));
      var isZip = d[0] === 0x50 && d[1] === 0x4B;          // "PK"

      if (isZip) {
        if (!CAN_XLSX) { toast('这个浏览器不支持直读 xlsx，请另存为 CSV 再导入'); return; }
        readXLSX(ab).then(afterParse).catch(function (e) { toast('xlsx 读取失败：' + e.message); });
        return;
      }

      var text;
      try {
        text = new TextDecoder('utf-8').decode(ab);
      } catch (e) {
        return;                                   // 不是文本，交给下面的兜底提示
      }
      // 有些 Windows 导出的 CSV 是 GBK，UTF-8 解出乱码时带U+FFFD 就退一档
      if (text.indexOf('\uFFFD') !== -1) {
        try { text = new TextDecoder('gbk').decode(ab); } catch (e2) {}
      }
      afterParse(rowsToItems(parseCSV(text)));
    }).catch(function () { toast('文件读取失败'); });
  }

  /* ==================================================================
     12. 备份提醒
     ================================================================== */
  function renderBackupBar() {
    var bar = $('backupBar');
    var text = $('backupText');
    if (!bar) return;

    // 在最近一次「知道了」的免打扰期内，就先别打扰
    try {
      var until = +localStorage.getItem(SNOOZE_KEY) || 0;
      if (Date.now() < until) { bar.classList.remove('show'); return; }
    } catch (e) {}

    if (items.length === 0) { bar.classList.remove('show'); return; }

    var d = lastBackupDays();

    if (d === null) {
      text.innerHTML = '<b>还没导出过备份。</b>' +
        '这些小事只存在这台浏览器里，清缓存或换设备就没了，导一份留着？';
      bar.classList.add('show');
      return;
    }
    if (d < REMIND_DAYS) { bar.classList.remove('show'); return; }

    text.innerHTML = d >= REMIND_DAYS_WARN
      ? '<b>距上次备份已经 ' + d + ' 天了。</b>数据可能因为清理缓存丢失，建议现在导一份。'
      : '距上次备份 <b>' + d + ' 天</b>了，导一份备份更安心。';
    bar.classList.add('show');
  }

  /* ==================================================================
     12b. 推荐清单
     ================================================================== */

  /**货架里已有相同文本的事项（忽略大小写与空格） */
  function inShelf(text) {
    var key = normText(text);
    return items.some(function (i) { return normText(i.text) === key; });
  }

  function normText(s) {
    return String(s || '').replace(/\s+/g, '').toLowerCase();
  }

  function visibleSuggestions() {
    var q = ui.sugSearch.trim().toLowerCase();
    return SUGGESTIONS.filter(function (s) {
      if (q && (s.text + ' ' + s.tags.join(' ')).toLowerCase().indexOf(q) === -1) return false;
      for (var k in ui.attrs) {
        if (!Object.prototype.hasOwnProperty.call(ui.attrs, k)) continue;
        if (!ui.attrs[k]) continue;
        if ((s.attrs || {})[k] !== ui.attrs[k]) return false;
      }
      return true;
    });
  }

  function renderSugFilters() {
    var wrap = $('sugFilters');
    if (!wrap) return;
    wrap.innerHTML = '';

    ATTR_GROUPS.forEach(function (g) {
      var row = document.createElement('div');
      row.className = 'attr-group';

      var lab = document.createElement('span');
      lab.className = 'glabel';
      lab.textContent = g.label;
      row.appendChild(lab);

      g.options.forEach(function (opt) {
        var b = document.createElement('button');
        b.className = 'attr-toggle' + (ui.attrs[g.key] === opt ? ' on' : '');
        b.type = 'button';
        b.textContent = opt;
        b.onclick = function () {
          ui.attrs[g.key] = (ui.attrs[g.key] === opt) ? '' : opt;
          renderSugFilters();
          renderSugList();
        };
        row.appendChild(b);
      });
      wrap.appendChild(row);
    });

    if (ATTR_GROUPS.some(function (g) { return ui.attrs[g.key]; })) {
      var clr = document.createElement('button');
      clr.className = 'attr-clear';
      clr.type = 'button';
      clr.textContent = '清空筛选';
      clr.onclick = function () { ui.attrs = {}; renderSugFilters(); renderSugList(); };
      wrap.appendChild(clr);
    }
  }

  function renderSugList() {
    var list = $('sugList');
    if (!list) return;
    list.innerHTML = '';

    var shown = visibleSuggestions();
    var foot = $('sugFoot');

    if (shown.length === 0) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.innerHTML = '<span class="emoji">🔍</span><p>没有匹配的推荐。</p>' +
        '<p class="small">换个条件，或者直接在上方「我的货架」里写一条自己的。</p>';
      list.appendChild(li);
      if (foot) foot.textContent = '';
      return;
    }

    var frag = document.createDocumentFragment();
    shown.forEach(function (s, idx) {
      var added = inShelf(s.text);

      var li = document.createElement('li');
      li.className = 'sug-item' + (added ? ' added' : '');

      var no = document.createElement('span');
      no.className = 'sug-no';
      no.textContent = (idx + 1) + '.';
      li.appendChild(no);

      var body = document.createElement('div');
      body.className = 'sug-text';
      body.appendChild(document.createTextNode(s.text));

      var tags = document.createElement('div');
      tags.className = 'sug-tags';
      (s.tags || []).forEach(function (t) {
        var x = document.createElement('span');
        x.className = 'st';
        x.textContent = t;
        tags.appendChild(x);
      });
      if (s.repeat === 'daily') {
        var d = document.createElement('span');
        d.className = 'st daily';
        d.textContent = '每天';
        d.title = '加入后会变成每日重复项';
        tags.appendChild(d);
      }
      allAttrKeys().forEach(function (k) {
        if (!s.attrs || !s.attrs[k]) return;
        var a = document.createElement('span');
        a.className = 'st attr';
        a.textContent = s.attrs[k];
        tags.appendChild(a);
      });
      if (tags.childNodes.length) body.appendChild(tags);
      li.appendChild(body);

      var add = document.createElement('button');
      add.className = 'sug-add' + (added ? ' done-yes' : '');
      add.type = 'button';
      add.textContent = added ? '✓' : '+';
      add.disabled = added;
      add.title = added ? '货架里已经有了' : '加入我的货架';
      add.setAttribute('aria-label', (added ? '已在货架：' : '加入我的货架：') + s.text);
      add.onclick = function () { addFromSuggest(s); };
      li.appendChild(add);

      frag.appendChild(li);
    });
    list.appendChild(frag);

    if (foot) {
      var n = SUGGESTIONS.length;
      var left = SUGGESTIONS.filter(function (s) { return !inShelf(s.text); }).length;
      foot.textContent = '共 ' + n + ' 条推荐，还有 ' + left + ' 条没加过';
    }
  }

  function makeItemFromSuggestion(s) {
    return {
      id: uid(),
      text: s.text,
      tags: (s.tags || []).slice(),
      attrs: normalizeAttrs(s.attrs),
      done: false,
      note: '',
      doneDate: '',
      repeat: s.repeat === 'daily' ? 'daily' : 'none',
      lastDone: '',
      streak: 0,
      best: 0,
      createdAt: Date.now()
    };
  }

  function addFromSuggest(s) {
    if (inShelf(s.text)) { toast('货架里已经有这条了'); return; }
    var it = makeItemFromSuggestion(s);
    items.unshift(it);
    save();
    render();
    renderSugList();
    toast('已加入货架' + (it.repeat === 'daily' ? '（每天重复）' : ''), function () {
      var i = items.indexOf(it);
      if (i !== -1) items.splice(i, 1);
      save(); render(); renderSugList();
    });
  }

  /** 从推荐清单随机挑一件（跳过货架里已有的） */
  function addRandomSuggestion() {
    var pool = SUGGESTIONS.filter(function (s) { return !inShelf(s.text); });
    if (pool.length === 0) { toast('推荐清单都加过了'); return; }
    addFromSuggest(pool[Math.floor(Math.random() * pool.length)]);
    switchView('shelf');
  }

  /** 把当前筛选出的、还没加过的，全加进来 */
  function addAllVisible() {
    var todo = visibleSuggestions().filter(function (s) { return !inShelf(s.text); });
    if (todo.length === 0) { toast('筛选结果都已经加过了'); return; }
    if (todo.length > 12) {
      // 一次加太多容易变成任务轰炸，先给个提醒但仍可继续
      if (!window.confirm('要把 ' + todo.length + ' 条都加进货架吗？\n加多了反而不好挑。')) return;
    }
    var added = todo.map(function (s) { return makeItemFromSuggestion(s); });
    items = added.concat(items);          // 保持筛选列表的顺序
    save();
    render();
    renderSugList();
    toast('加了 ' + added.length + ' 件', function () {   // 可一键撤销
      var set = {};
      added.forEach(function (a) { set[a.id] = true; });
      items = items.filter(function (i) { return !set[i.id]; });
      save(); render(); renderSugList();
    });
  }

  function switchView(v) {
    ui.view = v;
    $('viewShelf').hidden = (v !== 'shelf');
    $('viewSuggest').hidden = (v !== 'suggest');
    $('tabShelf').classList.toggle('active', v === 'shelf');
    $('tabSuggest').classList.toggle('active', v === 'suggest');
    $('tabShelf').setAttribute('aria-selected', v === 'shelf' ? 'true' : 'false');
    $('tabSuggest').setAttribute('aria-selected', v === 'suggest' ? 'true' : 'false');
    if (v === 'suggest') { renderSugFilters(); renderSugList(); }
  }

  /* ==================================================================
     13. 清空数据
     ================================================================== */
  function openWipe() {
    if (items.length === 0) { toast('本来就是空的，没什么可清'); return; }
    $('wipeCount').textContent = items.length;
    $('wipeAck').checked = false;
    $('wipeOk').disabled = true;            // 必须先勾选确认，危险按钮默认不可点
    $('wipeDanger').classList.add('idle');
    $('wipeExportBtn').textContent = '立即导出';
    openModal($('wipeOverlay'), function () {
      // 焦点放在「取消」上，防止误按回车直接清空
      $('wipeCancel').focus();
    });
  }

  /* keepSettings=true 表示用户只是「取消这一步」，保留设置面板；
   清空成功或点遮罩/Esc 时收掉设置面板（数据没了，面板没意义） */
function closeWipe(keepSettings) {
    closeModal($('wipeOverlay'));
    $('wipeAck').checked = false;
    $('wipeOk').disabled = true;
    $('wipeDanger').classList.add('idle');
    if (!keepSettings && $('settingsOverlay').classList.contains('show')) {
      closeModal($('settingsOverlay'));
    }
  }

  function doWipe() {
    if (!$('wipeAck').checked) return;       // 双保险
    var backup = items.slice();
    var n = backup.length;

    items = [];
    editingId = null;
    randomId = null;
    ui.filter = 'all'; ui.tag = null; ui.search = '';
    $('search').value = '';

    // 清掉「已备份时间」，因为数据已经没了；顺便清掉免打扰标记
    try {
      localStorage.removeItem(BACKUP_KEY);
      localStorage.removeItem('boring100.backupSnooze');
    } catch (e) {}

    save();
    render();
    renderBackupBar();
    closeWipe(false);      // 清空成功：设置面板一并收掉

    toast('已清空 ' + n + ' 件小事', function () {   // 给一次反悔机会
      items = backup;
      try { localStorage.removeItem('boring100.backupSnooze'); } catch (e2) {}
      save();
      render();
      renderBackupBar();
      toast('已恢复 ' + n + ' 件');
    });
  }

  /* ==================================================================
     14. 事件绑定
     ================================================================== */
  var newText = $('newText');
  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }
  newText.addEventListener('input', function () { autoGrow(newText); });
  newText.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addItem(); }
  });
  $('newTags').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  });
  $('addBtn').onclick = addItem;

  var searchTimer = null;
  $('search').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    var v = e.target.value;
    searchTimer = setTimeout(function () { ui.search = v; renderList(); }, 140);
  });

  $('randomBtn').onclick = pickRandom;
  $('randomAgain').onclick = pickRandom;
  $('randomClose').onclick = function () { closeModal($('randomOverlay')); };
  $('randomDone').onclick = function () {
    if (!randomId) return;
    var it = find(randomId);
    if (it && !it.done) { it.done = true; it.doneDate = today(); save(); render(); }
    closeModal($('randomOverlay'));
    openNote(randomId);
  };

  $('noteSave').onclick = function () {
    var it = find(noteId);
    if (it) { it.note = $('noteInput').value.trim(); save(); render(); }
    closeNote();
  };
  $('noteCancel').onclick = closeNote;
  $('delOk').onclick = doDelete;
  $('delCancel').onclick = function () { closeModal($('delOverlay')); delId = null; };

  $('settingsBtn').onclick = openSettings;
  $('settingsClose').onclick = function () { closeModal($('settingsOverlay')); };
  $('settingsOk').onclick = function () { applyGoal(); closeModal($('settingsOverlay')); };
  $('badge').onclick = openSettings;
  $('goalInput').addEventListener('input', applyGoal);
  $('goalInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') applyGoal(); });

  $('themeBtn').onclick = function () {
    var t = currentTheme();
    var dark = document.documentElement.classList.contains('dark');
    // auto 模式先按当前实际外观的反面走，再在亮/暗之间循环
    var next = t === 'auto' ? (dark ? 'light' : 'dark') : (t === 'dark' ? 'light' : 'dark');
    applyTheme(next);
  };
  $('themeSeg').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-theme]');
    if (b) applyTheme(b.dataset.theme);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (currentTheme() === 'auto') applyTheme('auto');
  });

  $('tabShelf').onclick = function () { switchView('shelf'); };
  $('tabSuggest').onclick = function () { switchView('suggest'); };
  $('sugShuffle').onclick = addRandomSuggestion;
  $('sugAddAll').onclick = addAllVisible;

  $('attrBtn').onclick = function () {
    // 已经有筛选条件时，再点一下收起（而不是清空）
    var anyOn = ATTR_GROUPS.some(function (g) { return ui.attrs[g.key]; });
    if (anyOn) { ui.attrs = {}; ui.attrPanelOpen = false; }
    else ui.attrPanelOpen = !ui.attrPanelOpen;
    render();
  };

  var sugTimer = null;
  $('sugSearch').addEventListener('input', function (e) {
    clearTimeout(sugTimer);
    var v = e.target.value;
    sugTimer = setTimeout(function () { ui.sugSearch = v; renderSugList(); }, 140);
  });

  $('tplBtn').onclick = downloadTemplate;
  $('csvOutBtn').onclick = exportCSV;
  $('jsonOutBtn').onclick = exportJSON;
  $('wipeBtn').onclick = openWipe;

  // 清空确认弹窗
  $('wipeCancel').onclick = function () { closeWipe(true); };   // 取消：保留设置面板
  $('wipeExportBtn').onclick = function () {
    exportJSON();                             // 顺手导一份，清空后仍可恢复
    $('wipeExportBtn').textContent = '已导出 ✓';
    setTimeout(function () { $('wipeExportBtn').textContent = '再导一份'; }, 1600);
  };
  $('wipeAck').onchange = function (e) {
    $('wipeOk').disabled = !e.target.checked;
    $('wipeDanger').classList.toggle('idle', !e.target.checked);
  };
  $('wipeOk').onclick = doWipe;

  // 备份提醒条
  $('backupExportBtn').onclick = function () {
    exportJSON();
    $('backupBar').classList.remove('show');
  };
  $('backupLater').onclick = function () {
    $('backupBar').classList.remove('show');
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 7 * 86400000)); } catch (e) {}
  };

  function hiddenFile(accept, handler) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = accept;
    inp.className = 'hidden-file';
    inp.onchange = function () {
      if (inp.files && inp.files[0]) handler(inp.files[0]);
      inp.value = '';
    };
    document.body.appendChild(inp);
    return inp;
  }

  var csvIn = hiddenFile(
    '.csv,text/csv,application/vnd.ms-excel,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    handleFile
  );
  $('csvInBtn').onclick = function () { csvIn.click(); };

  $('jsonInBtn').onclick = function () {
    hiddenFile('.json,application/json', function (f) {
      f.arrayBuffer().then(function (ab) {
        var d;
        try { d = JSON.parse(new TextDecoder('utf-8').decode(ab)); }
        catch (e) { toast('这个文件不是有效的 JSON'); return; }
        var list = normalize(Array.isArray(d) ? d : d.items);
        if (!list) { toast('备份文件里没找到小事列表'); return; }
        if (!Array.isArray(d) && +d.goal >= 1) { goal = Math.min(9999, Math.floor(d.goal)); }
        afterParse(list);
      }).catch(function () { toast('文件读取失败'); });
    }).click();
  };

  $('importMerge').onclick = function () { if (pendingImport) applyIncoming(pendingImport, 'merge'); };
  // 「清空后只留这次的」是破坏性操作，做成二次点击确认，
  // 不用window.confirm——原生弹窗样式不统一，而且会把页面卡住
  $('importReplace').onclick = function () {
    if (!pendingImport) return;
    if (!replaceArmed) {
      replaceArmed = true;
      this.textContent = '再点一次，确认清空 ' + items.length + ' 件';
      this.classList.remove('ghost');
      this.classList.add('danger');
      clearTimeout(replaceTimer);
      replaceTimer = setTimeout(function () {
        replaceArmed = false;
        $('importReplace').textContent = '清空后只留这次的';
        $('importReplace').classList.add('ghost');
        $('importReplace').classList.remove('danger');
      }, 4000);
      return;
    }
    clearTimeout(replaceTimer);
    applyIncoming(pendingImport, 'replace');
  };

  $('importCancel').onclick = closeImportFlow;

  ['randomOverlay', 'noteOverlay', 'delOverlay', 'settingsOverlay', 'importOverlay', 'wipeOverlay'].forEach(function (id) {
    $(id).addEventListener('click', function (e) {
      if (e.target !== this) return;
      if (id === 'noteOverlay') closeNote();
      else if (id === 'wipeOverlay') closeWipe(false);
      else {
        if (id === 'importOverlay') pendingImport = null;
        if (id === 'delOverlay') delId = null;
        closeModal($(id));
      }
    });
  });

  $('sort').onchange = function (e) { ui.sort = e.target.value; renderList(); };

  var toolbar = $('toolbar');
  var onScroll = function () { toolbar.classList.toggle('stuck', window.scrollY > 60); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // 顺序 = 视觉层级的从低到高，Esc 时从最上面那层开始关。
  // 之前把 settingsOverlay 排在了 wipeOverlay 前面，导致叠在设置面板之上的
  // 清空弹窗永远轮不到关闭（settings 先被关掉，循环就 break 了）。
  var OVERLAYS = ['randomOverlay', 'noteOverlay', 'delOverlay', 'importOverlay', 'settingsOverlay', 'wipeOverlay'];
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    var open = document.querySelector('.overlay.show');

    if (e.key === 'Escape') {
      if (open) {
        // 从数组末尾往前找，命中的是最上层面板
        for (var n = OVERLAYS.length - 1; n >= 0; n--) {
          var id = OVERLAYS[n];
          if (!$(id).classList.contains('show')) continue;
          if (id === 'noteOverlay') closeNote();
          else if (id === 'wipeOverlay') closeWipe(true);   // Esc 只是取消这一步，保留设置面板
          else {
            if (id === 'importOverlay') pendingImport = null;
            if (id === 'delOverlay') delId = null;
            closeModal($(id));
          }
          break;
        }
        return;
      }
      if (editingId) { editingId = null; render(); return; }
      if (typing) e.target.blur();
      return;
    }

    if (typing || open || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') { e.preventDefault(); $('search').focus(); }
    else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      // 在推荐页按 R 是「随机抽一条推荐」，别去抽货架
      if (ui.view === 'suggest') addRandomSuggestion();
      else pickRandom();
    }
    else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); newText.focus(); }
  });

  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var d = load();
    items = d.items;
    goal = d.goal;
    render();
  });

  /* ==================================================================
     15. 启动
     ================================================================== */
  $('ghLink').href = GH_URL;
  $('footRepo').href = REPO_URL;
  paintThemeBtn();
  syncSeg();
  render();
  autoGrow(newText);
  if (items.length === 0) setTimeout(function () { newText.focus(); }, 200);

  // 支持 ?action=random（PWA 快捷方式「随机一件」的入口）
  try {
    if (new URLSearchParams(location.search).get('action') === 'random') {
      setTimeout(pickRandom, 400);
    }
  } catch (e) {}

  /* ---------------- Service Worker（离线可用 / 可安装） ---------------- */
  var deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    $('installBtn').hidden = false;$('pwaHint').textContent =
      '可以装到桌面：点上面的「安装到桌面」按钮。装好后断网也能用，图标和启动画面与普通 App 一样。';
  });

  $('installBtn').onclick = function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function () {
      deferredPrompt = null;
      $('installBtn').hidden = true;
    });
  };

  $('updateBtn').onclick = function () {
    if (!navigator.serviceWorker) { toast('这个浏览器不支持离线缓存'); return; }
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (!reg) { toast('还没有缓存，先刷新一次页面'); return; }
      reg.update().then(function () { toast('已检查更新，如有新版本刷新后生效'); });
    });
  };

  // file:// 打开时不支持 Service Worker，静默跳过即可（本地双击依然能正常用）
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) {
        // 有新版本就显示「检查更新」
        reg.addEventListener('updatefound', function () {
          var sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', function () {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              $('updateBtn').hidden = false;
            }
          });
        });
      }).catch(function () {
        // 静态托管环境下拿不到 sw.js，忽略即可，不影响主功能
      });
    });
  }

  // 注：刻意不做 beforeunload 拦截。
  // 浏览器只在「有未保存改动」时才允许弹这个框，localStorage 是即时写入的，
  // 所以几乎必然触发，等于每次关页面都被拦，体验很差。
  // 数据丢失风险改由页面上的备份提醒条 + 关页面即导出这两道机制来兜。

})();
