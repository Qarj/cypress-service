REM This script needs to be run as the Windows service account. See README.md
REM
REM Do not do an npm install using your user account then run this script with a Windows Service
REM Account - it will create a tangle and you'll need to delete everything and start again.
REM
REM This script tends to end early when it shouldn't - e.g. npm config get registry
REM immediately ends the script.

REM Set current directory to the parent of this script directory
cd /D "%~dp0"
cd ..

mkdir logs

echo %date% %time% Starting installation > logs\cypress_install.log 2>&1

set CYPRESS_CACHE_FOLDER=C:\CYPRESS_CACHE
mkdir %CYPRESS_CACHE_FOLDER%

REM Do not show sysinternals eula - service account cannot accept it
echo Adding registry keys to stop handle64.exe eula from showing >> logs\cypress_install.log
cmd /c reg.exe ADD HKCU\Software\Sysinternals /v EulaAccepted /t REG_DWORD /d 1 /f >> logs\cypress_install.log 2>&1
cmd /c reg.exe ADD HKU\.DEFAULT\Software\Sysinternals /v EulaAccepted /t REG_DWORD /d 1 /f >> logs\cypress_install.log 2>&1

echo Getting the current npm registry >> logs\cypress_install.log
cmd /c npm config get registry >> logs\cypress_install.log 2>&1

echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log

cmd /c rmdir /S /Q node_modules >> logs\cypress_install.log 2>&1

cmd /c npm cache clean --force >> logs\cypress_install.log 2>&1

echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo Running npm install >> logs\cypress_install.log 2>&1

cmd /c npm install >> logs\cypress_install.log 2>&1

echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo Running npm run build >> logs\cypress_install.log 2>&1

cmd /c npm run build >> logs\cypress_install.log 2>&1

echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log
echo ====== >> logs\cypress_install.log

echo %date% %time% Ended installation >> logs\cypress_install.log 2>&1
