' Web Remote Mouse - Remove Windows Auto-Start Shortcut
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\RemoteMouseServer.lnk"

If fso.FileExists(shortcutPath) Then
  fso.DeleteFile(shortcutPath)
  WScript.Echo "[SUCCESS] Auto-start shortcut removed from Windows Startup!"
Else
  WScript.Echo "[INFO] Auto-start shortcut was not found."
End If

