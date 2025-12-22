<#
.SYNOPSIS
    Configure l'auto-demarrage du VHR Dashboard (serveur Node + ouverture du dashboard Pro).
.DESCRIPTION
    - Cree/Met a jour une regle pare-feu TCP 3000 (profil Prive)
    - Enregistre une tache planifiee "VHR Dashboard AutoLaunch" au logon utilisateur
    - Execute immediatement l'auto-launcher pour validation
.NOTES
    Necessite PowerShell 5+ et les droits admin pour la regle pare-feu / tache planifiee.
#>

Write-Host "[Legacy Setup AutoLaunch] Désactivé. Aucun changement réseau ou tâche planifiée n'est appliqué." 