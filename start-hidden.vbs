' Web Remote Mouse - Silent Background Server Starter
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

nodeExe = "node.exe"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = "C:\Program Files\nodejs\node.exe"
End If

serverJs = currentDir & "\server.js"
logFile = currentDir & "\server.log"

' Launch via cmd with proper quote wrapping and log redirection
cmdLine = "%comspec% /c """"" & nodeExe & """ """ & serverJs & """ >> """ & logFile & """ 2>&1"""
WshShell.Run cmdLine, 0, False
