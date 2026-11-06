' Web Remote Mouse - Silent Background Server Starter
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Launch node server.js with hidden window and append logs
WshShell.Run "cmd.exe /c node server.js >> server.log 2>&1", 0, False
