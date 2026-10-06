/**
 * 把 app.css / app.js 合回 index.html（split.js 的反向操作）。
 *
 * 为什么要拆又合：
 *   index.html 2960 行，编辑器里滚动和跳转都很痛苦，
 *   但拆成外部文件后就**不能再双击打开了**（file:// 下部分浏览器限制外链脚本），
 *   而「双击即开」是这个项目的核心承诺。
 *   所以：拆分只为了方便读代码，实际交付物永远是单文件。
 *
 * 用法：node tools/bundle.js
 */
const fs = require('fs');
const path = require('path');

const root = path.dirname(__dirname);
const htmlPath = path.join(root, 'index.html');
const cssPath = path.join(root, 'app.css');
const jsPath = path.join(root, 'app.js');

if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) {
  console.error('app.css 或 app.js 不存在，先跑 split.js');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');
let js = fs.readFileSync(jsPath, 'utf8');

// 去掉拆分时加的头部注释
css = css.replace(/^\/\*[\s\S]*?\*\/\s*/, '');
js = js.replace(/^\/\*[\s\S]*?\*\/\s*/, '');

// 替换最后一个 <style>…</style>
const styles = [...html.matchAll(/<style>[\s\S]*?<\/style>/g)];
if (!styles.length) { console.error('index.html 里没有 <style> 块'); process.exit(1); }
const lastStyle = styles[styles.length - 1];
html = html.slice(0, lastStyle.index)
  + '<style>\n' + css.trim() + '\n</style>'
  + html.slice(lastStyle.index + lastStyle[0].length);

// 替换最后一个 <script>…</script>
const scripts = [...html.matchAll(/<script>[\s\S]*?<\/script>/g)];
if (!scripts.length) { console.error('index.html 里没有 <script> 块'); process.exit(1); }
const lastScript = scripts[scripts.length - 1];
html = html.slice(0, lastScript.index)
  + '<script>\n' + js.trim() + '\n</script>'
  + html.slice(lastScript.index + lastScript[0].length);

fs.writeFileSync(htmlPath, html);

// 校验
const check = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
const main = check[check.length - 1][1];
try {
  new Function(main);
  console.log('index.html 合并完成：', html.split('\n').length, '行，JS 语法 OK');
} catch (e) {
  console.error('JS 语法错误：', e.message);
  process.exit(1);
}
