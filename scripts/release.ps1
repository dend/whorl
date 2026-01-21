#
# Release script for Whorl
# Usage: .\scripts\release.ps1 1.0.0
#

param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$Version
)

$ErrorActionPreference = "Stop"

# Validate version format
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Version must be in format X.Y.Z (e.g., 1.0.0)"
    exit 1
}

# Get project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Push-Location $ProjectRoot

try {
    # Check for uncommitted changes
    $status = git status --porcelain
    if ($status) {
        Write-Error "You have uncommitted changes. Please commit or stash them first."
        exit 1
    }

    # Check if tag already exists
    $tagExists = git rev-parse $Version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Error "Tag $Version already exists"
        exit 1
    }

    # Update version in manifest.json
    Write-Host "Updating manifest.json to version $Version..."
    $manifest = Get-Content "manifest.json" -Raw
    $manifest = $manifest -replace '"version":\s*"[^"]*"', "`"version`": `"$Version`""
    Set-Content "manifest.json" $manifest -NoNewline

    # Verify the change
    $manifestObj = Get-Content "manifest.json" | ConvertFrom-Json
    if ($manifestObj.version -ne $Version) {
        Write-Error "Failed to update manifest.json"
        git checkout manifest.json
        exit 1
    }

    Write-Host "Updated manifest.json to version $Version"

    # Commit the change
    git add manifest.json
    git commit -m "Bump version to $Version"

    # Create and push tag
    Write-Host "Creating tag $Version..."
    git tag $Version

    Write-Host "Pushing to origin..."
    git push origin main
    git push origin $Version

    Write-Host ""
    Write-Host "Release $Version created successfully!"
    Write-Host "GitHub Actions will now build and publish the release."

    # Get repo URL for display
    $remoteUrl = git remote get-url origin
    if ($remoteUrl -match 'github\.com[:/](.+?)(\.git)?$') {
        $repoPath = $Matches[1] -replace '\.git$', ''
        Write-Host "View the release at: https://github.com/$repoPath/releases/tag/$Version"
    }
}
finally {
    Pop-Location
}
