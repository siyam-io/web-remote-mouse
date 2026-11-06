' Web Remote Mouse - Silent Background Server Starter
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Find node.exe executable path
nodeExe = "node"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = "C:\Program Files\nodejs\node.exe"
ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
    nodeExe = "C:\Program Files (x86)\nodejs\node.exe"
End If

' Ensure controller.exe exists
controllerExe = currentDir & "\bin\controller.exe"
If Not fso.FileExists(controllerExe) Then
    WshShell.Run "cmd.exe /c call start.bat", 0, True
End If

' Launch node server.js completely hidden (window 0, async)
WshShell.Run """" & nodeExe & """ """ & currentDir & "\server.js""", 0, False
