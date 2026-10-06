@echo off
setlocal
cd /d "%~dp0"
"C:\Users\zzy\.workbuddy\binaries\python\versions\3.13.12\python.exe" -X utf8 tools\push.py
if errorlevel 1 pause
endlocal
