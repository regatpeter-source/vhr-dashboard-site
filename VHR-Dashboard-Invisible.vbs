' ============================================
' VHR Dashboard - Invisible Launcher
' Lance le serveur complètement en arrière-plan
' ============================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = "C:\Users\peter\VR-Manager"
dashboardUrl = "http://localhost:3000/vhr-dashboard-pro.html"

' Vérifier si le serveur est déjà en cours d'exécution
Set objExec = WshShell.Exec("cmd /c netstat -ano | find "":3000""")
output = objExec.StdOut.ReadAll()

If Len(Trim(output)) = 0 Then
    ' Le serveur n'est pas en cours, le lancer en mode invisible
    WshShell.CurrentDirectory = projectDir
    WshShell.Run "cmd /c node server.js", 0, False
    
    ' Attendre 2 secondes que le serveur démarre
    WScript.Sleep 2000
End If

' Ouvrir le dashboard dans le navigateur
WshShell.Run dashboardUrl, 1, False
