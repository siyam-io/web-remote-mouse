' Web Remote Mouse - Install Windows Auto-Start
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
vbsTarget = currentDir & "\start-hidden.vbs"
winDir = WshShell.ExpandEnvironmentStrings("%SystemRoot%")
wscriptExe = winDir & "\System32\wscript.exe"

' 1. Register in Windows Startup Folder
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\RemoteMouseServer.lnk"

Set shortcut = WshShell.CreateShortcut(shortcutPath)
shortcut.TargetPath = wscriptExe
shortcut.Arguments = """" & vbsTarget & """"
shortcut.WorkingDirectory = currentDir
shortcut.Description = "Web Remote Mouse Silent Background Server"
shortcut.Save

' 2. Register in Windows Registry Run Key (Guaranteed boot launch)
regKey = "HKCU\Software\Microsoft\Windows\CurrentVersion\Run\RemoteMouseServer"
regVal = """" & wscriptExe & """ """ & vbsTarget & """"
WshShell.RegWrite regKey, regVal, "REG_SZ"

WScript.Echo "[SUCCESS] Registered in Windows Registry Run & Startup folder."
