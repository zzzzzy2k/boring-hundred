/**
 * 把 index.html 拆成 index.html + app.css + app.js。
 *
 * 拆分时index.html 仍然是完整可用的单文件（双击能开）；
 * app.css / app.js 是**冗余副本**，供二次开发时阅读与修改用。
 * 改完要合并回去就跑 `node tools/bundle.js`（反向操作）。
 *
 * 拆分点：最后一个 <style> 块与最后一个 <script> 块。
 */
const fs = require('fs');
const path = require('path');

const root = path.dirname(__dirname);
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// ---- CSS ----
const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)];
if (styles.length === 0) { console.error('没找到 <style> 块'); process.exit(1); }
const css = styles[styles.length - 1][1];

// ---- JS：取最后一个（主）script 块 ----
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (scripts.length === 0) { console.error('没找到 <script> 块'); process.exit(1); }
const js = scripts[scripts.length - 1][1];

// ---- 写 app.css / app.js ---- */
fs.writeFileSync(path.join(root, 'app.css'),
  `/* 小事杂货铺 —— 样式（从 index.html 拆出，勿直接改，改这里后跑 bundle.js 合回） */\n${css.trim()}\n`);

fs.writeFileSync(path.join(root, 'app.js'),
  `/* 小事杂货铺 —— 逻辑（从 index.html 拆出，勿直接改，改这里后跑 bundle.js 合回） */\n${js.trim()}\n`);

console.log('app.css:', css.split('\n').length, '行');
console.log('app.js :', js.split('\n').length, '行');
console.log('index.html 保持单文件完整，双击仍可用。');
console.log('反向合并：node tools/bundle.js');
