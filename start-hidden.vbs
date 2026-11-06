' Web Remote Mouse - Silent Background Server Starter
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = currentDir

' Launch node server.js with hidden window
WshShell.Run "cmd.exe /c node server.js", 0, False
