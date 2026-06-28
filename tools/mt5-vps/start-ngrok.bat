@echo off
cd /d C:\mt5-api
for /f "tokens=1,* delims==" %%a in (.env) do (
  if "%%a"=="NGROK_AUTHTOKEN" set NGROK_AUTHTOKEN=%%b
)
if not "%NGROK_AUTHTOKEN%"=="" C:\ngrok\ngrok.exe config add-authtoken %NGROK_AUTHTOKEN%
C:\ngrok\ngrok.exe http 8000
