#!/usr/bin/env pwsh
# Auto-commit and push script for VR-Manager
# Usage: ./auto-commit.ps1 "Commit message"

param(
    [string]$message = "Auto-update: changes from development",
    [string]$branch = "main"
)

$projectDir = Get-Location

Write-Host "[AUTO-COMMIT] Auto-Commit & Push" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "Project: $projectDir"
Write-Host ""

# Check if there are changes
$status = git status --porcelain
if (-not $status) {
    Write-Host "[OK] Aucune modification detectee - Rien a commiter" -ForegroundColor Yellow
    exit 0
}

Write-Host "[CHANGES] Changements detectes:"
Write-Host $status
Write-Host ""

# Add all changes
Write-Host "[GIT] Ajout des fichiers modifies..." -ForegroundColor Cyan
git add -A

# Commit
Write-Host "[GIT] Creation du commit..." -ForegroundColor Cyan
git commit -m "$message"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Erreur lors du commit" -ForegroundColor Red
    exit 1
}

# Push
Write-Host "[GIT] Push vers GitHub..." -ForegroundColor Cyan
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Erreur lors du push" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[SUCCESS] Commit et push reussis!" -ForegroundColor Green
Write-Host "[INFO] Render va redeploy automatiquement dans 1-2 minutes" -ForegroundColor Green
