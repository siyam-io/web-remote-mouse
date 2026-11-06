' Web Remote Mouse - Remove Windows Auto-Start
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Remove from Windows Startup Folder
startupFolder = WshShell.SpecialFolders("Startup")
shortcutPath = startupFolder & "\RemoteMouseServer.lnk"
If fso.FileExists(shortcutPath) Then
    On Error Resume Next
    fso.DeleteFile(shortcutPath)
    On Error GoTo 0
End If

' 2. Remove from Windows Registry Run Key
On Error Resume Next
WshShell.RegDelete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run\RemoteMouseServer"
On Error GoTo 0

WScript.Echo "[SUCCESS] Auto-start removed from Windows Registry & Startup folder."
