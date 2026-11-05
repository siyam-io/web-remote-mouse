' Web Remote Mouse - Silent Background Server Starter
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = currentDir

' Check if node is installed and run server.js with hidden window (0)
WshShell.Run "cmd /c node server.js", 0, False

