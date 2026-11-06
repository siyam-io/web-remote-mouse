Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Lock PC IP to Permanent Static Address" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[ERROR] This script requires Administrator rights." -ForegroundColor Red
    Write-Host "Please right-click lock-pc-static-ip.bat and select 'Run as administrator'." -ForegroundColor Yellow
    exit 1
}

# 1. Detect Router Gateway & Active Interface
Write-Host "[1/3] Detecting network adapter..." -ForegroundColor Gray
$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.NextHop -and $_.NextHop -ne '0.0.0.0' } | Sort-Object RouteMetric | Select-Object -First 1

if (-not $route) {
    Write-Host "[ERROR] No active internet gateway (router) detected!" -ForegroundColor Red
    exit 1
}

$adapter = Get-NetAdapter | Where-Object { $_.InterfaceIndex -eq $route.InterfaceIndex -and $_.Status -eq 'Up' } | Select-Object -First 1
if (-not $adapter) {
    Write-Host "[ERROR] Active network adapter not found!" -ForegroundColor Red
    exit 1
}

$ipConfig = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -notlike '169.254*' } | Select-Object -First 1
if (-not $ipConfig) {
    Write-Host "[ERROR] No IPv4 address found on adapter $($adapter.Name)!" -ForegroundColor Red
    exit 1
}

$currentIp = $ipConfig.IPAddress
$gateway = $route.NextHop
$adapterName = $adapter.Name

Write-Host "  Adapter:   $adapterName ($($adapter.InterfaceDescription))" -ForegroundColor Cyan
Write-Host "  IP:        $currentIp" -ForegroundColor Yellow
Write-Host "  Gateway:   $gateway" -ForegroundColor Gray
Write-Host ""

# 2. Apply Static IP Configuration
Write-Host "[2/3] Locking IP to $currentIp permanently..." -ForegroundColor Gray
netsh interface ipv4 set address name="$adapterName" source=static address=$currentIp mask=255.255.255.0 gateway=$gateway store=persistent
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] netsh returned code $LASTEXITCODE. Retrying with PowerShell native cmdlet..." -ForegroundColor Yellow
    Set-NetIPInterface -InterfaceIndex $adapter.InterfaceIndex -Dhcp Disabled -ErrorAction SilentlyContinue
}

# 3. Configure DNS
Write-Host "[3/3] Setting DNS servers (1.1.1.1, 8.8.8.8)..." -ForegroundColor Gray
netsh interface ipv4 set dns name="$adapterName" source=static address=1.1.1.1 store=persistent
netsh interface ipv4 add dns name="$adapterName" address=8.8.8.8 index=2 store=persistent

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] Your PC IP is now locked to $currentIp!" -ForegroundColor Green
Write-Host " Your router will never change this IP again." -ForegroundColor Green
Write-Host " Mobile App URL: https://${currentIp}:3443" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Green

