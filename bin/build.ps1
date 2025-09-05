#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Build the ObsidianObserver plugin package

.DESCRIPTION
    This script builds the ObsidianObserver plugin by:
    1. Installing dependencies
    2. Updating version numbers in manifest.json and package.json
    3. Building the TypeScript code to build/ directory
    4. Creating a distributable package
    5. Optionally updating plugin in vaults

.PARAMETER BuildVersion
    Version number for the build (e.g., "00.01.08"). If not provided, will auto-detect from directory name.

.PARAMETER VaultName
    Optional vault name to update with the built plugin

.PARAMETER SkipDependencies
    Skip npm install step (useful for faster rebuilds)

.PARAMETER SkipBuild
    Skip the actual build step (useful for testing)

.PARAMETER CreatePackage
    Create a distributable package after building

.EXAMPLE
    .\build.ps1                                    # Auto-detect version from git branch or directory name

.EXAMPLE
    .\build.ps1 -BuildVersion "00.01.08"          # Specify version manually

.EXAMPLE
    .\build.ps1 -VaultName TestSidian-ObsidianObserver  # Auto-detect version and update vault

.EXAMPLE
    .\build.ps1 -SkipDependencies -CreatePackage  # Skip deps, create package, auto-detect version
#>

param(
    [string]$BuildVersion,
    [string]$VaultName,
    [switch]$SkipDependencies,
    [switch]$SkipBuild,
    [switch]$CreatePackage
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Auto-determine version from git branch or current directory name if not provided
if ([string]::IsNullOrEmpty($BuildVersion)) {
    # Try to get version from git branch first
    try {
        $gitBranch = git branch --show-current 2>$null
        if ($gitBranch -and $gitBranch -match '^v(\d{2}\.\d{2}\.\d{2})$') {
            $BuildVersion = $matches[1]
            Write-Host "📝 Auto-detected version from git branch: $BuildVersion" -ForegroundColor Yellow
        } else {
            # Fall back to directory name
            $currentDir = Split-Path -Leaf (Get-Location)
            if ($currentDir -match '^v(\d{2}\.\d{2}\.\d{2})$') {
                $BuildVersion = $matches[1]
                Write-Host "📝 Auto-detected version from directory name: $BuildVersion" -ForegroundColor Yellow
            } else {
                Write-Error "Could not auto-detect version from git branch '$gitBranch' or directory name '$currentDir'. Please provide -BuildVersion parameter."
                Write-Error "Expected format: vXX.XX.XX (e.g., 'v00.01.08')"
                exit 1
            }
        }
    } catch {
        # Fall back to directory name if git command fails
        $currentDir = Split-Path -Leaf (Get-Location)
        if ($currentDir -match '^v(\d{2}\.\d{2}\.\d{2})$') {
            $BuildVersion = $matches[1]
            Write-Host "📝 Auto-detected version from directory name: $BuildVersion" -ForegroundColor Yellow
        } else {
            Write-Error "Could not auto-detect version from directory name '$currentDir'. Please provide -BuildVersion parameter."
            Write-Error "Expected directory format: vXX.XX.XX (e.g., 'v00.01.08')"
            exit 1
        }
    }
}

# Validate version format (should match pattern like "00.01.08")
if ($BuildVersion -notmatch '^\d{2}\.\d{2}\.\d{2}$') {
    Write-Error "Invalid version format. Expected format: XX.XX.XX (e.g., '00.01.08')"
    exit 1
}

# Function to increment build number
function Increment-BuildNumber {
    param([string]$PluginDir)
    
    $buildNumberPath = Join-Path $PluginDir "build-number.txt"
    
    # Read current build number
    if (Test-Path $buildNumberPath) {
        $currentBuildNumber = [int](Get-Content $buildNumberPath -Raw).Trim()
    } else {
        $currentBuildNumber = 0
    }
    
    # Increment build number
    $newBuildNumber = $currentBuildNumber + 1
    
    # Save new build number (4-digit format)
    $newBuildNumber.ToString("D4") | Set-Content $buildNumberPath
    
    return $newBuildNumber
}

# Get script directory and project paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginDir = Split-Path -Parent $ScriptDir
$ProjectRoot = Split-Path -Parent $PluginDir
$BuildDir = Join-Path $PluginDir "build"

Write-Host "🔨 Building ObsidianObserver Plugin v$BuildVersion" -ForegroundColor Cyan
Write-Host "Script Directory: $ScriptDir" -ForegroundColor Gray
Write-Host "Plugin Directory: $PluginDir" -ForegroundColor Gray
Write-Host "Project Root: $ProjectRoot" -ForegroundColor Gray
Write-Host "Build Directory: $BuildDir" -ForegroundColor Gray

# Check if we're in the right location
if (!(Test-Path (Join-Path $PluginDir "package.json"))) {
    Write-Error "package.json not found in plugin directory: $PluginDir"
    exit 1
}

# Create build directory if it doesn't exist
if (!(Test-Path $BuildDir)) {
    Write-Host "📁 Creating build directory..." -ForegroundColor Yellow
    New-Item -Path $BuildDir -ItemType Directory -Force | Out-Null
}

# Change to plugin directory
Push-Location $PluginDir

try {
    # Step 1: Increment build number and update version numbers
    $buildNumber = Increment-BuildNumber $PluginDir
    $fullVersion = "${BuildVersion}_$($buildNumber.ToString("D4"))"
    
    Write-Host "📝 Updating version numbers to $fullVersion (Build #$buildNumber)..." -ForegroundColor Yellow
    
    # Update manifest.json
    $manifestPath = Join-Path $PluginDir "manifest.json"
    if (Test-Path $manifestPath) {
        $manifest = Get-Content $manifestPath | ConvertFrom-Json
        $manifest.version = $fullVersion
        $manifest | ConvertTo-Json -Depth 10 | Set-Content $manifestPath
        Write-Host "  ✅ Updated manifest.json version to $fullVersion" -ForegroundColor Green
    } else {
        Write-Error "manifest.json not found: $manifestPath"
        exit 1
    }
    
    # Update package.json
    $packagePath = Join-Path $PluginDir "package.json"
    if (Test-Path $packagePath) {
        $package = Get-Content $packagePath | ConvertFrom-Json
        $package.version = $fullVersion
        $package | ConvertTo-Json -Depth 10 | Set-Content $packagePath
        Write-Host "  ✅ Updated package.json version to $fullVersion" -ForegroundColor Green
    } else {
        Write-Error "package.json not found: $packagePath"
        exit 1
    }

    # Update CSS file version
    $cssPath = Join-Path $PluginDir "obsidian" "snippets" "obsidianObserverEventsTable.css"
    if (Test-Path $cssPath) {
        $cssContent = Get-Content $cssPath -Raw
        $cssVersion = "v$BuildVersion"
        $cssContent = $cssContent -replace 'version: "v[^"]*"', "version: `"$cssVersion`""
        Set-Content -Path $cssPath -Value $cssContent -NoNewline
        Write-Host "  ✅ Updated CSS file version to $cssVersion" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  CSS file not found: $cssPath" -ForegroundColor Yellow
    }

    # Update EventsSummary.md and _summary.md versions in logger.ts
    $loggerPath = Join-Path $PluginDir "src" "logger.ts"
    if (Test-Path $loggerPath) {
        $loggerContent = Get-Content $loggerPath -Raw
        # Update version in both summary files
        $loggerContent = $loggerContent -replace 'version: "`${this\.getPluginVersion\(\)}"', "version: `"$fullVersion`""
        Set-Content -Path $loggerPath -Value $loggerContent -NoNewline
        Write-Host "  ✅ Updated EventsSummary.md and _summary.md versions to $fullVersion" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Logger file not found: $loggerPath" -ForegroundColor Yellow
    }

    # Step 2: Install dependencies (unless skipped)
    if (!$SkipDependencies) {
        Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install dependencies"
            exit 1
        }
        Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping dependency installation" -ForegroundColor Yellow
    }

    # Step 3: Build the plugin (unless skipped)
    if (!$SkipBuild) {
        Write-Host "🔨 Building plugin..." -ForegroundColor Yellow
        npm run build
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to build plugin"
            exit 1
        }
        Write-Host "✅ Plugin built successfully" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Skipping build step" -ForegroundColor Yellow
    }

    # Step 4: Copy build output to build directory
    Write-Host "📁 Copying build output to build directory..." -ForegroundColor Yellow
    
    # Copy main.js to build directory
    $mainJsSource = Join-Path $PluginDir "main.js"
    $mainJsDest = Join-Path $BuildDir "main.js"
    
    if (Test-Path $mainJsSource) {
        Copy-Item -Path $mainJsSource -Destination $mainJsDest -Force
        Write-Host "  📄 Copied main.js to build directory" -ForegroundColor Gray
    } else {
        Write-Error "Build output not found: $mainJsSource"
        exit 1
    }
    
    # Copy manifest.json to build directory
    $manifestSource = Join-Path $PluginDir "manifest.json"
    $manifestDest = Join-Path $BuildDir "manifest.json"
    
    if (Test-Path $manifestSource) {
        Copy-Item -Path $manifestSource -Destination $manifestDest -Force
        Write-Host "  📄 Copied manifest.json to build directory" -ForegroundColor Gray
    } else {
        Write-Error "Manifest file not found: $manifestSource"
        exit 1
    }

    # Step 5: Verify build output
    if (!(Test-Path $mainJsDest)) {
        Write-Error "Build output not found in build directory: $mainJsDest"
        exit 1
    }
    
    if (!(Test-Path $manifestDest)) {
        Write-Error "Manifest file not found in build directory: $manifestDest"
        exit 1
    }

    # Get file sizes for verification
    $mainJsSize = (Get-Item $mainJsDest).Length
    $manifestContent = Get-Content $manifestDest | ConvertFrom-Json
    
    Write-Host "📊 Build Summary:" -ForegroundColor Cyan
    Write-Host "  Build directory: $BuildDir" -ForegroundColor Gray
    Write-Host "  Main.js size: $($mainJsSize) bytes" -ForegroundColor Gray
    Write-Host "  Plugin version: $($manifestContent.version)" -ForegroundColor Gray
    Write-Host "  Plugin name: $($manifestContent.name)" -ForegroundColor Gray

    # Step 6: Create distributable package (if requested)
    if ($CreatePackage) {
        Write-Host "📦 Creating distributable package..." -ForegroundColor Yellow
        
        $version = $manifestContent.version
        $packageName = "ObsidianObserver-v$version"
        $packageDir = Join-Path $ProjectRoot "packages"
        $packagePath = Join-Path $packageDir $packageName
        
        # Create packages directory if it doesn't exist
        if (!(Test-Path $packageDir)) {
            New-Item -Path $packageDir -ItemType Directory -Force | Out-Null
        }
        
        # Remove existing package if it exists
        if (Test-Path $packagePath) {
            Remove-Item -Path $packagePath -Recurse -Force
        }
        
        # Create package directory
        New-Item -Path $packagePath -ItemType Directory -Force | Out-Null
        
        # Copy required files from build directory
        $filesToCopy = @(
            "main.js",
            "manifest.json"
        )
        
        foreach ($file in $filesToCopy) {
            $sourcePath = Join-Path $BuildDir $file
            $destPath = Join-Path $packagePath $file
            
            if (Test-Path $sourcePath) {
                Copy-Item -Path $sourcePath -Destination $destPath -Force
                Write-Host "  📄 Copied $file" -ForegroundColor Gray
            } else {
                Write-Warning "File not found: $file"
            }
        }
        
        # Create zip file
        $zipPath = "$packagePath.zip"
        if (Test-Path $zipPath) {
            Remove-Item -Path $zipPath -Force
        }
        
        Compress-Archive -Path $packagePath -DestinationPath $zipPath -Force
        
        Write-Host "✅ Package created: $zipPath" -ForegroundColor Green
        Write-Host "📦 Package contents:" -ForegroundColor Cyan
        Get-ChildItem -Path $packagePath | ForEach-Object {
            Write-Host "  📄 $($_.Name)" -ForegroundColor Gray
        }
    }

    # Step 7: Update vault if specified
    if ($VaultName) {
        # Change to the project root to run the Populate-ObsidianVault script
        Pop-Location

        Write-Host "🔄 Updating plugin in vault: $VaultName" -ForegroundColor Yellow
        
        # Prepend TestSidian- to vault name to match project naming convention
        $fullVaultName = "TestSidian-$VaultName"
        $vaultPath = Join-Path $ProjectRoot "vaults" $fullVaultName
        if (!(Test-Path $vaultPath)) {
            Write-Error "Vault not found: $vaultPath"
            exit 1
        }
        
        # Use the existing Populate-ObsidianVault script
        $populateScript = Join-Path $ProjectRoot "bin" "Populate-ObsidianVault.ps1"
        if (Test-Path $populateScript) {
            & $populateScript -VaultName $VaultName -UpdateExploreObsdianPlugin
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ Plugin updated in vault successfully" -ForegroundColor Green
            } else {
                Write-Error "Failed to update plugin in vault"
                exit 1
            }
        } else {
            Write-Error "Populate-ObsidianVault.ps1 script not found"
            exit 1
        }
    }

    Write-Host "🎉 Build completed successfully!" -ForegroundColor Green
    Write-Host "📁 Build output available in: $BuildDir" -ForegroundColor Cyan
    Write-Host "📝 Version updated to: $fullVersion (Build #$buildNumber)" -ForegroundColor Cyan

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
} finally {
    # Restore original directory
    Pop-Location
}
