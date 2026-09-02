@echo off
REM PixeLabs - install Ableton Live themes (Windows)
REM Copies every .ask file next to this script into Ableton's Themes folder.
setlocal enabledelayedexpansion
cd /d "%~dp0"

tasklist /NH 2>nul | findstr /I "Ableton" >nul
if not errorlevel 1 (
  echo Ableton Live looks like it is running. Close it first, then run this again.
  pause
  exit /b 1
)

REM First match wins -- probe the usual locations in order of likelihood.
set "FOUND="
for %%D in ("C:\ProgramData\Ableton\Live 12\Resources\Themes" "C:\ProgramData\Ableton\Live 12 Suite\Resources\Themes" "C:\ProgramData\Ableton\Live 12 Standard\Resources\Themes" "%ProgramFiles%\Ableton\Live 12 Suite\Resources\Themes" "%ProgramFiles%\Ableton\Live 12 Standard\Resources\Themes") do (
  if not defined FOUND if exist %%D set "FOUND=%%~D"
)

if not defined FOUND (
  echo Could not find Ableton^'s Themes folder automatically.
  echo Look for Resources\Themes inside your Ableton Live install folder
  echo and copy the .ask files there by hand.
  pause
  exit /b 1
)

echo Installing themes into:
echo   %FOUND%
echo.
set /a N=0
set /a FAILED=0
for %%F in (*.ask) do call :copyone "%%F"
for /d %%S in (*) do for %%F in ("%%S\*.ask") do call :copyone "%%F"

echo.
if %FAILED% GTR 0 (
  echo %FAILED% file^(s^) could not be copied.
  echo This folder usually needs administrator rights: right-click this script
  echo and choose "Run as administrator", then try again.
) else (
  echo Installed %N% theme^(s^).
  echo Open Live, then Preferences ^> Look/Feel ^> Theme.
)
echo.
echo Note: a Live update can replace these files. Keep your .ask files
echo and run this installer again afterwards.
pause
exit /b 0

:copyone
copy /Y %1 "%FOUND%\" >nul 2>&1
if errorlevel 1 (
  echo   FAILED  %~nx1
  set /a FAILED+=1
) else (
  echo   ok      %~nx1
  set /a N+=1
)
goto :eof
