@echo off
rem Khoi dong ung dung Quan ly task: cai thu vien, build giao dien, chay server.
pushd "%~dp0backend"

where node >nul 2>nul
if errorlevel 1 (
  echo Khong tim thay Node.js. Hay cai Node.js LTS ^(>= 20.12^) roi chay lai.
  pause
  exit /b 1
)

rem Dung tien trinh node cu dang nghe cong 6021/3000 (khong dung chuong trinh khac)
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 6021,3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; if ($p -and $p.ProcessName -eq 'node') { Stop-Process -Id $p.Id -Force } }"

if not exist node_modules (
  echo Dang cai thu vien backend...
  call npm install
)

pushd "..\frontend"
if not exist node_modules (
  echo Dang cai thu vien frontend...
  call npm install
)
echo Dang build giao dien...
call npm run build
if errorlevel 1 (
  echo Build giao dien that bai.
  pause
  exit /b 1
)
popd

echo.
echo ============================================================
echo  Mo trinh duyet:  http://127.0.0.1:6021
echo  May khac trong mang:  http://^<IP may nay^>:6021
echo  Lan dau: dang nhap admin / admin@123 ^(se bat buoc doi mat khau^)
echo  Quen mat khau admin:  npm run create-user -- ten
echo ============================================================
echo.
start "" http://127.0.0.1:6021
node server.js
popd
