Dim exePath
exePath = "scrcpy.exe"

If WScript.Arguments.Count > 0 Then
    exePath = WScript.Arguments.Item(0)
End If

strCommand = "cmd /c """ & exePath & """"

Dim i
For i = 1 To WScript.Arguments.Count - 1
    strCommand = strCommand & " """ & replace(WScript.Arguments.Item(i), """", """"""") & """"
Next

CreateObject("Wscript.Shell").Run strCommand, 0, false
