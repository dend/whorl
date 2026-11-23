Add-Type -AssemblyName System.Drawing

$srcPath = Join-Path $PSScriptRoot "..\src\icon-96.png"
$src = [System.Drawing.Image]::FromFile($srcPath)

# Create 16px icon
$dest16 = New-Object System.Drawing.Bitmap(16, 16)
$g16 = [System.Drawing.Graphics]::FromImage($dest16)
$g16.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g16.DrawImage($src, 0, 0, 16, 16)
$dest16Path = Join-Path $PSScriptRoot "..\src\icon-16.png"
$dest16.Save($dest16Path, [System.Drawing.Imaging.ImageFormat]::Png)
$g16.Dispose()
$dest16.Dispose()

# Create 32px icon
$dest32 = New-Object System.Drawing.Bitmap(32, 32)
$g32 = [System.Drawing.Graphics]::FromImage($dest32)
$g32.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g32.DrawImage($src, 0, 0, 32, 32)
$dest32Path = Join-Path $PSScriptRoot "..\src\icon-32.png"
$dest32.Save($dest32Path, [System.Drawing.Imaging.ImageFormat]::Png)
$g32.Dispose()
$dest32.Dispose()

$src.Dispose()

Write-Host "Created icon-16.png and icon-32.png"
