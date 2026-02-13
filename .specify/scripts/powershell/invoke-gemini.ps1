#!/usr/bin/env pwsh
# Wrapper to run Gemini CLI inside Spec Kit workflows with the local API key
param(
    [Parameter(Mandatory=$true,Position=0)]
    [string]$Prompt
)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$env:GEMINI_API_KEY = (Get-Content (Join-Path $repoRoot '.env') -Raw).Trim() -replace '^GEMINI_API_KEY=(.+)$','$1'
& gemini --prompt $Prompt