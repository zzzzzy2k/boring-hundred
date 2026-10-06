// 把 data-suggestions.js 里的 SUGGESTIONS 内联进 index.html，
// 保证最终产物仍是「单文件、双击即开」。
// 内联完成后 data-suggestions.js 作为可读的源数据保留，改内容后重跑本脚本。
const fs = require('fs');
const path = require('path');

const root = path.dirname(__dirname);   // 项目根目录（脚本在 tools/ 下）
const sugPath = path.join(root, 'data-suggestions.js');
const htmlPath = path.join(root, 'index.html');

const sug = fs.readFileSync(sugPath, 'utf8');
const m = sug.match(/var SUGGESTIONS\s*=\s*(\[[\s\S]*\]);/);
if (!m) {
  console.error('无法从 data-suggestions.js 提取 SUGGESTIONS');
  process.exit(1);
}
const literal = m[1];

// 语法校验 + 语义校验
const arr = eval(literal);
const GROUPS = {
  place: ['在家', '室内', '室外'],
  device: ['无需电脑', '用电脑', '用手机'],
  screen: ['不看屏幕', '要屏幕']
};
const bad = [];
arr.forEach((s, i) => {
  for (const k in (s.attrs || {})) {
    if (!GROUPS[k] || !GROUPS[k].includes(s.attrs[k])) {
      bad.push(`#${i + 1} ${s.text} -> ${k}=${s.attrs[k]}`);
    }
  }
  if (s.repeat && s.repeat !== 'daily') bad.push(`#${i + 1} ${s.text} -> repeat=${s.repeat}`);
});
if (bad.length) {
  console.error('属性值非法:\n  ' + bad.join('\n  '));
  process.exit(1);
}

let h = fs.readFileSync(htmlPath, 'utf8');
const marker = '     2. 数据层';
const idx = h.indexOf(marker);
if (idx === -1) {
  console.error('未找到「2. 数据层」标记');
  process.exit(1);
}
// 回退到该注释块的起始位置
const start = h.lastIndexOf('/* =', idx);

const block =
  '/* ==================================================================\n' +
  `     1b. 推荐清单数据（${arr.length} 条，${Math.round(arr.filter(s => s.attrs.screen === '不看屏幕').length / arr.length * 100)}% 是不看屏幕的）\n` +
  '     ================================================================== */\n' +
  'var SUGGESTIONS = ' + literal + ';\n\n';

h = h.slice(0, start) + block + h.slice(start);
fs.writeFileSync(htmlPath, h);

console.log(`已内联 ${arr.length} 条推荐，${literal.length} 字符`);
console.log('  不看屏幕占比:', Math.round(arr.filter(s => s.attrs.screen === '不看屏幕').length / arr.length * 100) + '%');
console.log('  每日重复项  :', arr.filter(s => s.repeat === 'daily').length);
console.log('  index.html  :', fs.readFileSync(htmlPath, 'utf8').split('\n').length, '行');
