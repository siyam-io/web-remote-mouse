Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "     Revert PC Network to Automatic Dynamic (DHCP)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator rights." -ForegroundColor Red
    Write-Host "Please right-click unlock-pc-dhcp-ip.bat and select 'Run as administrator'." -ForegroundColor Yellow
    exit 1
}

# 1. Detect Active Interface
Write-Host "[1/2] Detecting network adapter..." -ForegroundColor Gray
$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.NextHop -and $_.NextHop -ne '0.0.0.0' } | Sort-Object RouteMetric | Select-Object -First 1

$adapter = $null
if ($route) {
    $adapter = Get-NetAdapter | Where-Object { $_.InterfaceIndex -eq $route.InterfaceIndex -and $_.Status -eq 'Up' } | Select-Object -First 1
}
if (-not $adapter) {
    $adapter = Get-NetAdapter | Where-Object { $_.Status -eq 'Up' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*Default Switch*' -and $_.InterfaceAlias -notlike '*Cloudflare*' } | Select-Object -First 1
}

if (-not $adapter) {
    Write-Host "[ERROR] Active network adapter not found!" -ForegroundColor Red
    exit 1
}

$adapterName = $adapter.Name
Write-Host "  Adapter: $adapterName ($($adapter.InterfaceDescription))" -ForegroundColor Cyan
Write-Host ""

# 2. Reset to DHCP
Write-Host "[2/2] Resetting to Automatic DHCP..." -ForegroundColor Gray
netsh interface ipv4 set address name="$adapterName" source=dhcp
netsh interface ipv4 set dns name="$adapterName" source=dhcp

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Adapter $adapterName reverted to Automatic DHCP!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
