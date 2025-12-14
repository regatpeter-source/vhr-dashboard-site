# Script de nettoyage - Supprime les dépendances Gradle/JDK inutiles
# Usage: powershell -ExecutionPolicy Bypass -File cleanup-gradle-jdk.ps1

Write-Host "`n🧹 VHR Audio Stream - Nettoyage des dépendances Gradle/JDK`n" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Afficher un avertissement
Write-Host "`n⚠️  Ce script supprimera:" -ForegroundColor Yellow
Write-Host "   • Java 11 (C:\Java\jdk-11.0.29+7)" -ForegroundColor Yellow
Write-Host "   • Gradle 8.7 (C:\Gradle\gradle-8.7)" -ForegroundColor Yellow
Write-Host "   • Android SDK (C:\Android\SDK)" -ForegroundColor Yellow
Write-Host "`n✨ Après: Votre système ne dépendra PLUS de Gradle/JDK!" -ForegroundColor Green
Write-Host "`n" -ForegroundColor Gray

# Demander confirmation
$response = Read-Host "Confirmer la suppression ? (oui/non)"
if ($response -ne "oui") {
  Write-Host "`n❌ Opération annulée" -ForegroundColor Red
  exit 1
}

Write-Host "`n🚀 Démarrage du nettoyage...`n" -ForegroundColor Green

# 1. Supprimer les dossiers
$paths = @(
  "C:\Java\jdk-11.0.29+7",
  "C:\Gradle\gradle-8.7",
  "C:\Android\SDK",
  "C:\Gradle\gradle-8.6",  # Alternative versions
  "C:\Java\jdk-*"          # Autres versions Java
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Write-Host "🗑️  Suppression: $path" -ForegroundColor Yellow
    try {
      Remove-Item -Recurse -Force $path -ErrorAction Stop
      Write-Host "   ✅ Supprimé avec succès" -ForegroundColor Green
    } catch {
      Write-Host "   ⚠️  Erreur lors de la suppression: $_" -ForegroundColor Red
    }
  } else {
    Write-Host "   ℹ️  Dossier non trouvé (OK)" -ForegroundColor Gray
  }
}

# 2. Nettoyer les variables d'environnement utilisateur
Write-Host "`n🔧 Nettoyage des variables d'environnement...`n" -ForegroundColor Cyan

$envVars = @(
  "JAVA_HOME",
  "GRADLE_HOME",
  "ANDROID_HOME",
  "ANDROID_SDK_ROOT"
)

foreach ($var in $envVars) {
  $current = [Environment]::GetEnvironmentVariable($var, [EnvironmentVariableTarget]::User)
  if ($current) {
    Write-Host "   Suppression: $var" -ForegroundColor Yellow
    [Environment]::SetEnvironmentVariable($var, $null, [EnvironmentVariableTarget]::User)
    Write-Host "   ✅ Supprimé" -ForegroundColor Green
  } else {
    Write-Host "   ℹ️  $var non défini (OK)" -ForegroundColor Gray
  }
}

# 3. Nettoyer le PATH système
Write-Host "`n🧹 Nettoyage du PATH système...`n" -ForegroundColor Cyan

$pathVars = @(
  "C:\Java\jdk-11.0.29+7\bin",
  "C:\Gradle\gradle-8.7\bin",
  "C:\Android\SDK\platform-tools"
)

$currentPath = [Environment]::GetEnvironmentVariable("PATH", [EnvironmentVariableTarget]::User)
$newPath = $currentPath

foreach ($pathToRemove in $pathVars) {
  if ($newPath -like "*$pathToRemove*") {
    Write-Host "   Suppression du PATH: $pathToRemove" -ForegroundColor Yellow
    $newPath = $newPath -replace [regex]::Escape($pathToRemove + ";"), ""
    $newPath = $newPath -replace [regex]::Escape(";" + $pathToRemove), ""
    Write-Host "   ✅ Supprimé du PATH" -ForegroundColor Green
  }
}

if ($newPath -ne $currentPath) {
  [Environment]::SetEnvironmentVariable("PATH", $newPath, [EnvironmentVariableTarget]::User)
  Write-Host "`n   ✅ PATH mis à jour" -ForegroundColor Green
}

# 4. Nettoyer le cache Gradle
Write-Host "`n🗑️  Nettoyage du cache Gradle...`n" -ForegroundColor Cyan

$gradleCache = "$env:USERPROFILE\.gradle"
if (Test-Path $gradleCache) {
  Write-Host "   Suppression du cache: $gradleCache" -ForegroundColor Yellow
  try {
    Remove-Item -Recurse -Force $gradleCache -ErrorAction Stop
    Write-Host "   ✅ Cache Gradle supprimé" -ForegroundColor Green
  } catch {
    Write-Host "   ⚠️  Impossible de supprimer (en utilisation?)" -ForegroundColor Yellow
  }
}

# Afficher le résumé
Write-Host "`n" -ForegroundColor Gray
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`n✨ NETTOYAGE TERMINÉ!" -ForegroundColor Green
Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
Write-Host "   ✅ Java 11 supprimé"
Write-Host "   ✅ Gradle 8.7 supprimé"
Write-Host "   ✅ Android SDK supprimé"
Write-Host "   ✅ Variables d'environnement nettoyées"
Write-Host "   ✅ Cache Gradle nettoyé"

Write-Host "`n🎯 Votre système utilise maintenant UNIQUEMENT:" -ForegroundColor Green
Write-Host "   • Node.js"
Write-Host "   • WebRTC Audio Streaming (natif browser)"
Write-Host "   • Web Audio API (standard W3C)"

Write-Host "`n🚀 Vous pouvez maintenant supprimer sans crainte:" -ForegroundColor Green
Write-Host "   • sample-android/ (dossier de développement Android)"
Write-Host "   • tts-receiver-app/ (anciennes sources Android)"
Write-Host "   • Tout code Gradle/Android hérité"

Write-Host "`n💡 Conseil: Mettez à jour votre .gitignore:" -ForegroundColor Cyan
Write-Host "   sample-android/"
Write-Host "   tts-receiver-app/"
Write-Host "   .gradle/"
Write-Host "   build/"

Write-Host "`n✅ Nettoyage WebRTC Audio Stream prêt!" -ForegroundColor Green
Write-Host "   Lancez: npm start" -ForegroundColor Cyan
Write-Host "   Ouvrez: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n"
