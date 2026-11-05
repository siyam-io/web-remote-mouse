' Web Remote Mouse - Install Windows Auto-Start Shortcut
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
vbsTarget = currentDir & "\start-hidden.vbs"

Set WshShell = CreateObject("WScript.Shell")
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\RemoteMouseServer.lnk"

Set shortcut = WshShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = "wscript.exe"
shortcut.Arguments = """" & vbsTarget & """"
shortcut.WorkingDirectory = currentDir
shortcut.Description = "Web Remote Mouse Silent Background Server"
shortcut.Save

WScript.Echo "[SUCCESS] Auto-start shortcut created in Windows Startup!"

