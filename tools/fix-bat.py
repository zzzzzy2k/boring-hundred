"""把 推送.bat 规范成纯 ASCII + CRLF。

.cmd 按系统代码页（zh-CN 下是 GBK）解析批处理内容：
  1. 内容含 UTF-8 中文 -> 命令被解析成乱码
  2. 行尾是 LF 而不是 CRLF -> cmd 会吞掉每行行首字符（setlocal -> local）
所以 .bat 必须纯 ASCII + CRLF，中文提示全部交给 tools/push.py 打印。

另外两个踩过的坑：
  - .bat 里不能出现中文路径（cmd 同样按 GBK 解析），用 %~dp0 定位自身目录
  - **不要写 `chcp 65001 >nul`**：在 Git Bash 里执行时，`>nul` 会被解析成一次
    真实的重定向，真的生成一个名为 nul 的空文件。改用 python -X utf8 控制台编码。
"""
import os

BAT = '''@echo off
setlocal
cd /d "%~dp0"
"C:\\Users\\zzy\\.workbuddy\\binaries\\python\\versions\\3.13.12\\python.exe" -X utf8 tools\\push.py
if errorlevel 1 pause
endlocal
'''

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, '推送.bat')

data = BAT.replace('\r\n', '\n').replace('\n', '\r\n').encode('ascii')
with open(path, 'wb') as f:
    f.write(data)

d = open(path, 'rb').read()
print('written    :', len(d), 'bytes')
print('non-ascii  :', sum(1 for b in d if b > 127))
print('CRLF lines :', d.count(b'\r\n'))
print('bare LF    :', d.count(b'\n') - d.count(b'\r\n'))
print('--- content ---')
print(d.decode('ascii'))
