' ============================================
' VHR Dashboard - Invisible Launcher
' Délègue toute la logique à auto-launch-dashboard.ps1
' ============================================

Dim shell, projectDir, psCommand
Set shell = CreateObject("WScript.Shell")
projectDir = "C:\Users\peter\VR-Manager"

Dim scriptPath
scriptPath = projectDir & "\scripts\auto-launch-dashboard.ps1"
psCommand = "powershell -NoProfile -ExecutionPolicy Bypass -File """ & scriptPath & """"

' Exécuter silencieusement (0 = fenêtre cachée)
shell.Run psCommand, 0, False
