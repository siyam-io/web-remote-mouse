' Web Remote Mouse - Silent Background Server Starter
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
If fso.FileExists(scriptDir & "\server.js") Then
    rootDir = scriptDir
Else
    rootDir = fso.GetParentFolderName(scriptDir)
End If

WshShell.CurrentDirectory = rootDir

nodeExe = "node.exe"
If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
    nodeExe = "C:\Program Files\nodejs\node.exe"
End If

serverJs = rootDir & "\server.js"
logFile = rootDir & "\server.log"

cmdLine = "%comspec% /c """"" & nodeExe & """ """ & serverJs & """ >> """ & logFile & """ 2>&1"""
WshShell.Run cmdLine, 0, False

