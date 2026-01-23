' VHR Dashboard Pro - Invisible Launcher
  Function GetLocalIPv4()
    On Error Resume Next
    Dim svc, adapters, adapter, ip
    Set svc = GetObject("winmgmts:{impersonationLevel=impersonate}!\\.\root\cimv2")
    If Err.Number <> 0 Then
      Err.Clear
      GetLocalIPv4 = ""
      Exit Function
    End If
    Set adapters = svc.ExecQuery("SELECT IPAddress FROM Win32_NetworkAdapterConfiguration WHERE IPEnabled = True")
    For Each adapter In adapters
      If Not IsNull(adapter.IPAddress) Then
        For Each ip In adapter.IPAddress
          If InStr(ip, ".") > 0 Then
            If Left(ip, 3) <> "169" And ip <> "127.0.0.1" Then
              GetLocalIPv4 = ip
              Exit Function
            End If
          End If
        Next
      End If
    Next
    GetLocalIPv4 = ""
  End Function

  Set WshShell = CreateObject("WScript.Shell")
  Set fso = CreateObject("Scripting.FileSystemObject")

  projectDir = "C:\\Users\\peter\\VR-Manager\\vhr-dashboard-pro-client-full-updated-new3-node-adb"
  remoteUrl = "https://www.vhr-dashboard-site.com/vhr-dashboard-pro.html"

  localIp = GetLocalIPv4()
  If localIp = "" Then
    localUrl = "http://localhost:3000/vhr-dashboard-pro.html"
  Else
    localUrl = "http://" & localIp & ":3000/vhr-dashboard-pro.html"
  End If

  ' Toujours démarrer/ouvrir la version locale en priorité
  Set objExec = WshShell.Exec("cmd /c netstat -ano | find ":3000"")
  output = objExec.StdOut.ReadAll()

  If Len(Trim(output)) = 0 Then
    WshShell.CurrentDirectory = projectDir
    WshShell.Run "cmd /c node server.js", 0, False
    WScript.Sleep 2000
  End If

  localReady = False

  On Error Resume Next
  Set httpLocal = CreateObject("MSXML2.ServerXMLHTTP")
  If Err.Number <> 0 Then
    Err.Clear
    Set httpLocal = CreateObject("MSXML2.XMLHTTP")
  End If

  If Err.Number = 0 And Not httpLocal Is Nothing Then
    httpLocal.Open "GET", localUrl, False
    httpLocal.setRequestHeader "Cache-Control", "no-cache"
    httpLocal.send
    If httpLocal.Status >= 200 And httpLocal.Status < 500 Then
      localReady = True
    End If
  End If
  On Error GoTo 0

  If localReady Then
    WshShell.Run localUrl, 1, False
    WScript.Quit
  End If

  remoteReady = False

  On Error Resume Next
  Set httpRemote = CreateObject("MSXML2.ServerXMLHTTP")
  If Err.Number <> 0 Then
    Err.Clear
    Set httpRemote = CreateObject("MSXML2.XMLHTTP")
  End If

  If Err.Number = 0 And Not httpRemote Is Nothing Then
    httpRemote.Open "GET", remoteUrl, False
    httpRemote.setRequestHeader "Cache-Control", "no-cache"
    httpRemote.send
    If httpRemote.Status >= 200 And httpRemote.Status < 400 Then
      remoteReady = True
    End If
  End If
  On Error GoTo 0

  If remoteReady Then
    WshShell.Run remoteUrl, 1, False
  Else
    WshShell.Run localUrl, 1, False
  End If
  