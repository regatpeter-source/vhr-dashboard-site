<#
Encrypts/decrypts the `.env` shipped with the local app and tightens its permissions.
Usage (from dist-client, where the launcher lives):
  .\scripts\env-protect.ps1 -Mode encrypt -Password <secret> [-Source .env] [-Target .env.enc]
  .\scripts\env-protect.ps1 -Mode decrypt -Password <secret> [-Source .env.enc] [-Target .env]

The encrypted payload contains:
  [16 bytes salt][16 bytes IV][ciphertext]
and is safe to include in the distro. The decrypt step automatically lowers permissions on the resulting `.env`.
#>

param(
    [Parameter(Mandatory)]
    [ValidateSet('encrypt', 'decrypt')]
    [string]$Mode,

    [Parameter(Mandatory)]
    [string]$Password,

    [string]$Source = '.env',
    [string]$Target,

    [string]$AdminAccount
)

function Get-DerivedKey {
    param(
        [string]$Password,
        [byte[]]$Salt
    )
    $deriver = New-Object System.Security.Cryptography.Rfc2898DeriveBytes($Password, $Salt, 15000)
    return $deriver
}

if ($Mode -eq 'encrypt') {
    if (-not $Target) { $Target = "$Source.enc" }
    if (-not (Test-Path $Source)) { throw "Source file $Source not found" }

    $salt = New-Object byte[](16)
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($salt)
    $deriver = Get-DerivedKey -Password $Password -Salt $salt

    $aes = [System.Security.Cryptography.Aes]::Create()
    $aes.Key = $deriver.GetBytes(32)
    $aes.IV = $aes.IV

    $plaintext = [System.IO.File]::ReadAllBytes($Source)
    $memory = New-Object System.IO.MemoryStream
    $crypto = New-Object System.Security.Cryptography.CryptoStream($memory, $aes.CreateEncryptor(), [System.Security.Cryptography.CryptoStreamMode]::Write)
    $crypto.Write($plaintext, 0, $plaintext.Length)
    $crypto.FlushFinalBlock()
    $crypto.Dispose()

    $ciphertext = $memory.ToArray()
    $combined = New-Object byte[] ($salt.Length + $aes.IV.Length + $ciphertext.Length)
    [Array]::Copy($salt, 0, $combined, 0, $salt.Length)
    [Array]::Copy($aes.IV, 0, $combined, $salt.Length, $aes.IV.Length)
    [Array]::Copy($ciphertext, 0, $combined, $salt.Length + $aes.IV.Length, $ciphertext.Length)

    [System.IO.File]::WriteAllBytes($Target, $combined)
    Write-Host "Encrypted $Source -> $Target"
    return
}

if (-not $Target) { $Target = $Source -replace '\.enc$', '' }
if (-not (Test-Path $Source)) { throw "Source file $Source not found" }

$content = [System.IO.File]::ReadAllBytes($Source)
if ($content.Length -lt 32) { throw "Encrypted payload is too short" }

$salt = $content[0..15]
$iv = $content[16..31]
$ciphertext = $content[32..($content.Length - 1)]
$deriver = Get-DerivedKey -Password $Password -Salt $salt

$aes = [System.Security.Cryptography.Aes]::Create()
$aes.Key = $deriver.GetBytes(32)
$aes.IV = $iv

$memory = New-Object System.IO.MemoryStream
$crypto = New-Object System.Security.Cryptography.CryptoStream($memory, $aes.CreateDecryptor(), [System.Security.Cryptography.CryptoStreamMode]::Write)
$crypto.Write($ciphertext, 0, $ciphertext.Length)
$crypto.FlushFinalBlock()
$crypto.Dispose()

[System.IO.File]::WriteAllBytes($Target, $memory.ToArray())

Write-Host "Decrypted $Source -> $Target"

# Tighten permissions (Windows only)
try {
    icacls $Target /inheritance:r | Out-Null
    if ($AdminAccount) {
        icacls $Target /remove "$env:USERNAME" | Out-Null
    }
    if ($AdminAccount) {
        icacls $Target /grant:r "$AdminAccount:(R)" | Out-Null
    } else {
        icacls $Target /grant:r "$($env:USERNAME):(R)" | Out-Null
    }
    icacls $Target /grant:r "SYSTEM:(F)" | Out-Null
    foreach ($group in 'Users','Authenticated Users','Everyone') {
        icacls $Target /remove "$group" | Out-Null
    }
    Write-Host "Permissions locked down on $Target"
} catch {
    Write-Warning "Failed to adjust permissions: $_"
}
