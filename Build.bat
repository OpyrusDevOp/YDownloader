@echo off
setlocal enabledelayedexpansion

REM Exit on any error
echo Building project...

REM Define paths
set "PROJECT_ROOT=%cd%"
set "BUILD_DIR=%PROJECT_ROOT%\build"
set "CLIENT_DIR=%PROJECT_ROOT%\src\client"
set "API_DIR=%PROJECT_ROOT%\src\Api"

REM Clean previous build
echo Cleaning previous build...
if exist "%BUILD_DIR%" (
    rd /s /q "%BUILD_DIR%"
)

REM Create necessary directories
echo Creating build directories...
mkdir "%BUILD_DIR%\downloads"

REM Build client
echo Building client...
cd "%CLIENT_DIR%"
call npm ci
if %ERRORLEVEL% neq 0 (
    echo Error: npm ci failed
    exit /b 1
)

call npm run build
if %ERRORLEVEL% neq 0 (
    echo Error: npm build failed
    exit /b 1
)

REM Copy files to build directory
echo Copying files to build directory...
xcopy /E /I /Y dist "%BUILD_DIR%\dist"
copy "%API_DIR%\main.py" "%BUILD_DIR%\"

echo Build completed successfully!

REM Validate build
if not exist "%BUILD_DIR%\main.py" (
    echo Build validation failed! Missing main.py
    exit /b 1
)

if not exist "%BUILD_DIR%\dist" (
    echo Build validation failed! Missing dist directory
    exit /b 1
)

if not exist "%BUILD_DIR%\downloads" (
    echo Build validation failed! Missing downloads directory
    exit /b 1
)

echo Build validation passed ✓

REM Return to the original directory
cd "%PROJECT_ROOT%"