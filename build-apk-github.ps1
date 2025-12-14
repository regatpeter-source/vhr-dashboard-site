#!/usr/bin/env pwsh
# 🚀 Script de Compilation APK via GitHub Actions
# Ce script déclenche la compilation sur GitHub (Ubuntu Linux)
# car Windows Gradle a une incompatibilité système

param(
    [ValidateSet('debug', 'release')]
    [string]$BuildType = 'debug',
    
    [switch]$Wait = $false,
    [switch]$Browser = $true
)

Write-Host "
╔════════════════════════════════════════════════════════════════╗
║     📱 Compilateur APK - GitHub Actions Ubuntu Linux           ║
╚════════════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "  Build Type: $BuildType"
Write-Host "  Repository: regatpeter-source/vhr-dashboard-site"
Write-Host "  Workflow: .github/workflows/android-build.yml"
Write-Host ""

# Vérifier si git est disponible
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ ERREUR: Git n'est pas installé ou pas dans PATH" -ForegroundColor Red
    Write-Host "   Installez Git depuis: https://git-scm.com/download/win" -ForegroundColor Red
    exit 1
}

# Vérifier si nous sommes dans un repo git
if (-not (Test-Path .git)) {
    Write-Host "❌ ERREUR: Pas dans un repository git" -ForegroundColor Red
    Write-Host "   Naviguez vers le dossier du projet" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Repository git détecté" -ForegroundColor Green

# Récupérer l'URL du remote
$RemoteUrl = git config --get remote.origin.url
Write-Host "   URL: $RemoteUrl" -ForegroundColor Green

# Parser le repo name
$RepoMatch = $RemoteUrl -match 'github\.com[:/]([^/]+)/([^/]+)'
if ($RepoMatch) {
    $Owner = $matches[1]
    $Repo = $matches[2] -replace '\.git$', ''
    Write-Host "   Owner: $Owner / Repo: $Repo" -ForegroundColor Green
} else {
    Write-Host "⚠️  Impossible de parser le repository" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 Déclenchement de la compilation..." -ForegroundColor Cyan

# Vérifier s'il y a des changements à committer
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Host "⚠️  Vous avez des changements non committes:" -ForegroundColor Yellow
    Write-Host $GitStatus
    Write-Host ""
    Write-Host "Les changements doivent être committes pour déclencher la compilation." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "  1. Committer les changements:"
    Write-Host "     git add ."
    Write-Host "     git commit -m 'Build: Trigger APK compilation'"
    Write-Host "     git push origin main"
    Write-Host ""
    Write-Host "  2. Ou utiliser workflow_dispatch (manuel):"
    Write-Host "     https://github.com/$Owner/$Repo/actions"
    Write-Host ""
    $Response = Read-Host "Voulez-vous committer et pousser maintenant? (o/n)"
    if ($Response -eq 'o') {
        Write-Host ""
        Write-Host "📤 Committing changements..." -ForegroundColor Cyan
        git add .
        git commit -m "build: Trigger Android APK compilation via GitHub Actions"
        
        Write-Host "📤 Pushing vers GitHub..." -ForegroundColor Cyan
        git push origin main
        
        Write-Host "✅ Changements poussés!" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "❌ Compilation annulée" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Pas de changements non committes" -ForegroundColor Green
    Write-Host ""
    Write-Host "La prochaine modification dans tts-receiver-app/ déclenchera la compilation" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📊 Où voir le résultat:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  1. GitHub Actions (Logs détaillés):"
Write-Host "     https://github.com/$Owner/$Repo/actions" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. Artifacts (APK générée):"
Write-Host "     https://github.com/$Owner/$Repo/actions" -ForegroundColor Cyan
Write-Host "     → Cliquer sur le workflow en cours"
Write-Host "     → Télécharger l'artifact"
Write-Host ""
Write-Host "  3. Releases (APK publiée):"
Write-Host "     https://github.com/$Owner/$Repo/releases" -ForegroundColor Cyan
Write-Host ""

Write-Host "⏱️  Timing:" -ForegroundColor Yellow
Write-Host "  • Démarrage: ~1-2 minutes"
Write-Host "  • Durée: ~10-15 minutes"
Write-Host "  • Total: ~15-20 minutes pour la première build (+ rapide après)"
Write-Host ""

Write-Host "💡 Tips:" -ForegroundColor Yellow
Write-Host "  • Gradle cache = Builds plus rapides"
Write-Host "  • Vous pouvez vous connecter et attendre"
Write-Host "  • Ou revenir vérifier plus tard"
Write-Host ""

if ($Browser) {
    Write-Host "🌐 Ouverture du navigateur..." -ForegroundColor Cyan
    Start-Process "https://github.com/$Owner/$Repo/actions"
    Start-Sleep -Seconds 1
}

Write-Host "✅ Configuration complète!" -ForegroundColor Green
Write-Host ""
Write-Host "Prochaines étapes:" -ForegroundColor Cyan
Write-Host "  1. Attendre que le workflow se termine (~15-20 min)"
Write-Host "  2. Télécharger l'APK depuis Artifacts ou Releases"
Write-Host "  3. Installer sur votre Meta Quest"
Write-Host ""

Write-Host "📝 Notes:" -ForegroundColor Gray
Write-Host "  • Compilation locale Windows = Impossible (Gradle bug)"
Write-Host "  • GitHub Actions Ubuntu = Fonctionne parfaitement ✅"
Write-Host "  • Idéal pour le développement et la production"
Write-Host ""
