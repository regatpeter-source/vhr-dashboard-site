$root = 'C:\Users\peter\VR-Manager\vhr-dashboard-pro-client-full-updated-new3-node-adb'
$dist = Join-Path $root 'dist'
$dest = Join-Path $dist 'release'
New-Item -ItemType Directory -Path $dest -Force | Out-Null
Copy-Item (Join-Path $dist 'VHR Dashboard Setup 1.0.1.exe') -Destination $dest -Force
Copy-Item (Join-Path $dist 'VHR Dashboard Setup 1.0.1.exe.blockmap') -Destination $dest -Force
Write-Host 'release saved'
