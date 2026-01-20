#
# Package Thunderbird @Mention extension as XPI
# Usage: .\scripts\package.ps1
#

$ErrorActionPreference = "Stop"

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Read version from manifest.json
$Manifest = Get-Content "$ProjectRoot\manifest.json" | ConvertFrom-Json
$Version = $Manifest.version
$XpiName = "thunderbird-at-mention-$Version.xpi"

# Create dist directory
$DistDir = Join-Path $ProjectRoot "dist"
if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

# Remove old XPI if exists
$XpiPath = Join-Path $DistDir $XpiName
if (Test-Path $XpiPath) {
    Remove-Item $XpiPath
}

# Create temporary directory for packaging
$TempDir = Join-Path $env:TEMP "tb-at-mention-pkg"
if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy extension files (flat structure)
Copy-Item "$ProjectRoot\manifest.json" $TempDir
Copy-Item "$ProjectRoot\background.js" $TempDir
Copy-Item "$ProjectRoot\compose-script.js" $TempDir
Copy-Item "$ProjectRoot\compose-styles.css" $TempDir
Copy-Item "$ProjectRoot\icon-48.png" $TempDir
Copy-Item "$ProjectRoot\icon-96.png" $TempDir

# Create XPI (zip archive)
$ZipPath = "$XpiPath.zip"
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath -Force
Move-Item -Force $ZipPath $XpiPath

# Cleanup temp directory
Remove-Item -Recurse -Force $TempDir

Write-Host ""
Write-Host "Created: $XpiPath"
Write-Host ""

# Show contents
Write-Host "Package contents:"
Add-Type -Assembly "System.IO.Compression.FileSystem"
$zip = [IO.Compression.ZipFile]::OpenRead($XpiPath)
$zip.Entries | ForEach-Object {
    Write-Host ("  {0,-40} {1,10}" -f $_.FullName, $_.Length)
}
$zip.Dispose()
