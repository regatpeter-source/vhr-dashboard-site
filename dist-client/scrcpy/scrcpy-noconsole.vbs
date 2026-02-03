Dim exePath
Dim baseDir
baseDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
exePath = baseDir & "\scrcpy-noconsole.exe"

If WScript.Arguments.Count > 0 Then
    exePath = WScript.Arguments.Item(0)
Else
    If Not CreateObject("Scripting.FileSystemObject").FileExists(exePath) Then
        exePath = baseDir & "\scrcpy.exe"
    End If
End If

strCommand = """" & exePath & """"

Dim i
For i = 1 To WScript.Arguments.Count - 1
    strCommand = strCommand & " """ & replace(WScript.Arguments.Item(i), """", """""") & """"
Next

CreateObject("Wscript.Shell").Run strCommand, 0, false
