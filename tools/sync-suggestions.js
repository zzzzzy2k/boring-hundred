/**
 * 从 .preview/方案对比.html 提取清洗后的 60 条推荐，
 * 替换掉 app.js 顶部的 SUGGESTIONS 数组。
 *
 * 之所以走脚本而不是手抄：预览页和主项目共用同一份数据，
 * 手抄必然会出现两边不一致的情况。
 *
 * 用法：node tools/sync-suggestions.js
 */
const fs = require('fs');
const path = require('path');

const root = path.dirname(__dirname);
const prevPath = path.join(root, '.preview', '方案对比.html');
const jsPath = path.join(root, 'app.js');

if (!fs.existsSync(prevPath)) {
  console.error('找不到 .preview/方案对比.html');
  process.exit(1);
}

const html = fs.readFileSync(prevPath, 'utf8');

// ---- 提取预览页的 DATA 数组 ----
const m = html.match(/var DATA = (\[[\s\S]*?\n\]);/);
if (!m) { console.error('未提取到 DATA'); process.exit(1); }
const old = eval(m[1]);

// ---- 转换成主项目的 SUGGESTIONS 结构 ----
// 预览页用扁平字段 p/d/s，主项目用嵌套 attrs；tags 里已去掉了与属性重复的
const GROUPS = { p: 'place', d: 'device', s: 'screen' };
const list = old.map(x => {
  const o = { text: x.t, tags: x.g.slice() };
  if (x.r) o.repeat = 'daily';
  o.attrs = {};
  for (const k in GROUPS) {
    if (x[k]) o.attrs[GROUPS[k]] = x[k];
  }
  return o;
});

// ---- 校验 ----
const VALID = {
  place: ['在家', '室内', '室外'],
  device: ['无需电脑', '用电脑', '用手机'],
  screen: ['不看屏幕', '要屏幕']
};
const bad = [];
list.forEach((s, i) => {
  for (const k in s.attrs) {
    if (!VALID[k] || !VALID[k].includes(s.attrs[k])) bad.push(`#${i + 1} ${s.text} → ${k}=${s.attrs[k]}`);
  }
  if (s.repeat && s.repeat !== 'daily') bad.push(`#${i + 1} ${s.text} → repeat=${s.repeat}`);
  if (s.tags.length > 2) bad.push(`#${i + 1} 标签超过 2 个：${s.tags.join(',')}`);
  // 标签不该再出现与属性语义重复的词
  const overlap = s.tags.filter(t => Object.values(s.attrs).includes(t));
  if (overlap.length) bad.push(`#${i + 1} 标签与属性重复：${overlap.join(',')}`);
});
const seen = new Set();
list.forEach((s, i) => {
  if (seen.has(s.text)) bad.push(`#${i + 1} 重复条目：${s.text}`);
  seen.add(s.text);
});
if (bad.length) {
  console.error('数据校验未通过：\n  ' + bad.join('\n  '));
  process.exit(1);
}

// ---- 序列化（手写格式化，不用 JSON.stringify：它会把数组拆成多行） ----
function fmt(list) {
  const lines = list.map(s => {
    const parts = [`text: ${JSON.stringify(s.text)}`];
    parts.push(`tags: [${s.tags.map(t => JSON.stringify(t)).join(', ')}]`);
    if (s.repeat) parts.push(`repeat: 'daily'`);
    const a = [];
    if (s.attrs.place) a.push(`place: ${JSON.stringify(s.attrs.place)}`);
    if (s.attrs.device) a.push(`device: ${JSON.stringify(s.attrs.device)}`);
    if (s.attrs.screen) a.push(`screen: ${JSON.stringify(s.attrs.screen)}`);
    parts.push(`attrs: { ${a.join(', ')} }`);
    return '  { ' + parts.join(', ') + ' }';
  });
  return '[\n' + lines.join(',\n') + '\n]';
}

const block = fmt(list);

// ---- 替换 app.js 里的 SUGGESTIONS ----
let js = fs.readFileSync(jsPath, 'utf8');
const re = /var SUGGESTIONS = \[[\s\S]*?\n\];/;
if (!re.test(js)) { console.error('app.js 里没找到 SUGGESTIONS'); process.exit(1); }
js = js.replace(re, 'var SUGGESTIONS = ' + block + ';');
fs.writeFileSync(jsPath, js);

// ---- 回写 index.html（app.js 只是副本，交付物是单文件） ----
const idxPath = path.join(root, 'index.html');
let h = fs.readFileSync(idxPath, 'utf8');
if (!re.test(h)) { console.error('index.html 里没找到 SUGGESTIONS'); process.exit(1); }
h = h.replace(re, 'var SUGGESTIONS = ' + block + ';');
fs.writeFileSync(idxPath, h);

console.log(`已同步 ${list.length} 条推荐到 app.js 与 index.html`);
console.log('  不看屏幕占比:', Math.round(list.filter(s => s.attrs.screen === '不看屏幕').length / list.length * 100) + '%');
console.log('  每日重复项  :', list.filter(s => s.repeat === 'daily').length);
console.log('  标签≤2 的   :', list.filter(s => s.tags.length <= 2).length + '/' + list.length);
