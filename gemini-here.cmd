@echo off
if "%GEMINI_API_KEY%"=="" (
  echo GEMINI_API_KEY is not set. Set it before running Gemini.
  exit /b 1
)
gemini %*
