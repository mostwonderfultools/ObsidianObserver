# Create Release Script for ObsidianObserver
# This script uses GitHub CLI (gh) to create a release with the current branch name and version

param(
    [switch]$DryRun,
    [switch]$Verbose
)

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginDir = Split-Path -Parent $ScriptDir
$BuildDir = Join-Path $PluginDir "build"

Write-Host "🚀 Creating GitHub Release for ObsidianObserver" -ForegroundColor Green
Write-Host "Script Directory: $ScriptDir" -ForegroundColor Cyan
Write-Host "Plugin Directory: $PluginDir" -ForegroundColor Cyan
Write-Host "Build Directory: $BuildDir" -ForegroundColor Cyan

# Check if gh CLI is installed
try {
    $ghVersion = gh --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub CLI not found"
    }
    Write-Host "✅ GitHub CLI found: $($ghVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: GitHub CLI (gh) is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install GitHub CLI from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Get current branch name
try {
    $BranchName = git branch --show-current
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get branch name"
    }
    Write-Host "📝 Current branch: $BranchName" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: Failed to get current branch name" -ForegroundColor Red
    exit 1
}

# Get version from manifest.json
try {
    $ManifestPath = Join-Path $BuildDir "manifest.json"
    if (-not (Test-Path $ManifestPath)) {
        throw "manifest.json not found in build directory"
    }
    
    $Manifest = Get-Content $ManifestPath | ConvertFrom-Json
    $Version = $Manifest.version
    Write-Host "📦 Plugin version: $Version" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Error: Failed to read version from manifest.json" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# Get latest git commit message
try {
    $CommitMessageRaw = git log -1 --pretty=format:"%s%n%n%b" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get commit message"
    }
    # Ensure commit message is a single string, not an array
    $CommitMessage = $CommitMessageRaw -join "`n"
    Write-Host "📝 Latest commit message retrieved" -ForegroundColor Cyan
    if ($Verbose) {
        Write-Host "Commit message preview:" -ForegroundColor Yellow
        Write-Host $CommitMessage -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error: Failed to get latest commit message" -ForegroundColor Red
    exit 1
}

# Check if build files exist
$ManifestFile = Join-Path $BuildDir "manifest.json"
$MainJsFile = Join-Path $BuildDir "main.js"

if (-not (Test-Path $ManifestFile)) {
    Write-Host "❌ Error: manifest.json not found in build directory" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $MainJsFile)) {
    Write-Host "❌ Error: main.js not found in build directory" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build files found:" -ForegroundColor Green
Write-Host "  - manifest.json" -ForegroundColor Gray
Write-Host "  - main.js" -ForegroundColor Gray

# Create release tag name
$TagName = "v$Version"
$ReleaseName = $BranchName

Write-Host "🏷️  Release tag: $TagName" -ForegroundColor Cyan
Write-Host "📋 Release name: $ReleaseName" -ForegroundColor Cyan

# Check if tag already exists
try {
    $ExistingTag = git tag -l $TagName
    if ($ExistingTag) {
        Write-Host "⚠️  Warning: Tag $TagName already exists" -ForegroundColor Yellow
        $Response = Read-Host "Do you want to delete and recreate it? (y/N)"
        if ($Response -eq "y" -or $Response -eq "Y") {
            Write-Host "🗑️  Deleting existing tag..." -ForegroundColor Yellow
            git tag -d $TagName
            git push origin :refs/tags/$TagName
        } else {
            Write-Host "❌ Release creation cancelled" -ForegroundColor Red
            exit 1
        }
    }
} catch {
    Write-Host "⚠️  Warning: Could not check for existing tags" -ForegroundColor Yellow
}

if ($DryRun) {
    Write-Host "🔍 DRY RUN - Would execute the following command:" -ForegroundColor Yellow
    $DryRunArgs = @(
        "release", "create",
        $TagName,
        $ManifestFile,
        $MainJsFile,
        "--title", $ReleaseName,
        "--notes", $CommitMessage
    )
    Write-Host "gh $($DryRunArgs -join ' ')" -ForegroundColor Gray
    Write-Host "📝 Release notes would be:" -ForegroundColor Yellow
    Write-Host $CommitMessage -ForegroundColor Gray
    exit 0
}

# Create the release
Write-Host "🚀 Creating GitHub release..." -ForegroundColor Green
try {
    # Use PowerShell's native argument passing to avoid string escaping issues
    $Arguments = @(
        "release", "create",
        $TagName,
        $ManifestFile,
        $MainJsFile,
        "--title", $ReleaseName,
        "--notes", $CommitMessage
    )
    
    if ($Verbose) {
        Write-Host "Executing: gh $($Arguments -join ' ')" -ForegroundColor Gray
    }
    
    & gh $Arguments
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Release created successfully!" -ForegroundColor Green
        $RepoInfo = gh repo view --json owner,name -q '.owner.login + "/" + .name'
        Write-Host "🔗 Release URL: https://github.com/$RepoInfo/releases/tag/$TagName" -ForegroundColor Cyan
    } else {
        throw "GitHub CLI command failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host "❌ Error: Failed to create release" -ForegroundColor Red
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 Release creation completed successfully!" -ForegroundColor Green
