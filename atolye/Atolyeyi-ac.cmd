@echo off
rem Hemdem Atolyesi: sunucuyu baslatir ve tarayicida acar. Kapatmak icin bu pencereyi kapat.
cd /d "%~dp0"
start "" http://127.0.0.1:8797
node sunucu.js
