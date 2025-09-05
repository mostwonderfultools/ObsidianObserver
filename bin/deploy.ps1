#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy ObsidianObserver plugin to an existing vault

.DESCRIPTION
    This script deploys the ObsidianObserver plugin to an existing Obsidian vault.
    It creates the necessary directory structure, copies plugin files, and enables the plugin.

.PARAMETER VaultPath
    Required path to the Obsidian vault where the plugin should be deployed

.PARAMETER SkipDeploy
    Skip deployment of plugin files (useful for testing or when files are already up to date)

.PARAMETER VerboseOutput
    Enable verbose output

.PARAMETER RemoveObsidianObserver
    Remove all ObsidianObserver artifacts from the vault (plugin, debug folder, CSS files)

.EXAMPLE
    .\deploy.ps1 -VaultPath "C:\Users\username\Documents\MyVault"

.EXAMPLE
    .\deploy.ps1 -VaultPath "C:\Users\username\Documents\MyVault" -SkipDeploy -VerboseOutput

.EXAMPLE
    .\deploy.ps1 -VaultPath "C:\Users\username\Documents\MyVault" -RemoveObsidianObserver
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$VaultPath,
    [switch]$SkipDeploy,
    [switch]$VerboseOutput,
    [switch]$RemoveObsidianObserver
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Gray = "Gray"

# Function to print colored output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Function to get plugin version from manifest.json
function Get-PluginVersion {
    try {
        $ScriptDir = Split-Path -Parent $PSCommandPath
        $PluginDir = Split-Path -Parent $ScriptDir
        $manifestPath = Join-Path $PluginDir "manifest.json"
        
        if (Test-Path $manifestPath) {
            try {
                $manifest = Get-Content $manifestPath | ConvertFrom-Json
                return $manifest.version
            } catch {
                Write-ColorOutput "Warning: Could not read version from manifest.json" $Yellow
                return "unknown"
            }
        } else {
            Write-ColorOutput "Warning: manifest.json not found" $Yellow
            return "unknown"
        }
    } catch {
        Write-ColorOutput "Warning: Could not determine script path" $Yellow
        return "unknown"
    }
}

# Function to validate vault path
function Test-VaultPath {
    param([string]$Path)
    
    if (!(Test-Path $Path)) {
        Write-ColorOutput "Error: Vault path does not exist: $Path" $Red
        return $false
    }
    
    # Check if it looks like an Obsidian vault (has .obsidian folder or markdown files)
    $hasObsidianFolder = Test-Path (Join-Path $Path ".obsidian")
    $hasMarkdownFiles = Get-ChildItem -Path $Path -Filter "*.md" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    
    if (!$hasObsidianFolder -and !$hasMarkdownFiles) {
        Write-ColorOutput "Warning: Path does not appear to be an Obsidian vault (no .obsidian folder or markdown files found)" $Yellow
        Write-ColorOutput "Continuing anyway..." $Yellow
    }
    
    return $true
}

# Function to create Obsidian directory structure
function New-ObsidianStructure {
    param([string]$VaultPath)
    
    $obsidianPath = Join-Path $VaultPath ".obsidian"
    $pluginsPath = Join-Path $obsidianPath "plugins"
    $snippetsPath = Join-Path $obsidianPath "snippets"
    
    # Create .obsidian directory if it doesn't exist
    if (!(Test-Path $obsidianPath)) {
        Write-ColorOutput "📁 Creating .obsidian directory..." $Yellow
        New-Item -Path $obsidianPath -ItemType Directory -Force | Out-Null
    }
    
    # Create plugins directory if it doesn't exist
    if (!(Test-Path $pluginsPath)) {
        Write-ColorOutput "📁 Creating plugins directory..." $Yellow
        New-Item -Path $pluginsPath -ItemType Directory -Force | Out-Null
    }
    
    # Create snippets directory if it doesn't exist
    if (!(Test-Path $snippetsPath)) {
        Write-ColorOutput "📁 Creating snippets directory..." $Yellow
        New-Item -Path $snippetsPath -ItemType Directory -Force | Out-Null
    }
}

# Function to deploy plugin files
function Deploy-PluginFiles {
    param([string]$VaultPath, [string]$PluginName, [bool]$SkipDeploy = $false)
    
    $pluginDir = Join-Path $VaultPath ".obsidian" "plugins" $PluginName
    
    # Resolve to absolute path
    $pluginDir = [System.IO.Path]::GetFullPath($pluginDir)
    
    # Create plugin directory
    if (!(Test-Path $pluginDir)) {
        Write-ColorOutput "📁 Creating plugin directory: $PluginName" $Yellow
        New-Item -Path $pluginDir -ItemType Directory -Force | Out-Null
    }
    
    # Get script directory and project paths
    $ScriptDir = Split-Path -Parent $PSCommandPath
    $ProjectDir = Split-Path -Parent $ScriptDir
    $BuildDir = Join-Path $ProjectDir "build"
    
    # Define source files
    $sourceFiles = @{
        "main.js" = Join-Path $BuildDir "main.js"
        "manifest.json" = Join-Path $BuildDir "manifest.json"
    }
    
    # Copy files
    foreach ($file in $sourceFiles.Keys) {
        $sourcePath = $sourceFiles[$file]
        $destPath = "$pluginDir/$file"
        
        if (Test-Path $sourcePath) {
            if (!$SkipDeploy) {
                Copy-Item -Path $sourcePath -Destination $destPath -Force
                Write-ColorOutput "  📄 Deployed $file" $Gray
            } else {
                Write-ColorOutput "  ⏭️  Skipped $file (use -SkipDeploy to skip deployment)" $Yellow
            }
        } else {
            Write-ColorOutput "  ❌ Source file not found: $sourcePath" $Red
            return $false
        }
    }
    
    return $true
}

# Function to deploy CSS snippets
function Deploy-CssSnippets {
    param([string]$VaultPath, [bool]$SkipDeploy = $false)
    
    $snippetsPath = Join-Path $VaultPath ".obsidian" "snippets"
    
    # Define CSS files to deploy
    $cssFiles = @("obsidianObserverEventsTable.css")
    
    # Get script directory and project paths
    $ScriptDir = Split-Path -Parent $PSCommandPath
    $ProjectDir = Split-Path -Parent $ScriptDir
    
    foreach ($cssFile in $cssFiles) {
        $cssSourcePath = Join-Path $ProjectDir "obsidian" "snippets" $cssFile
        $cssDestPath = Join-Path $snippetsPath $cssFile
        
        if (Test-Path $cssSourcePath) {
            if (!$SkipDeploy) {
                Copy-Item -Path $cssSourcePath -Destination $cssDestPath -Force
                Write-ColorOutput "  📄 Deployed CSS snippet: $cssFile" $Gray
            } else {
                Write-ColorOutput "  ⏭️  Skipped CSS snippet: $cssFile (use -SkipDeploy to skip deployment)" $Yellow
            }
        } else {
            Write-ColorOutput "  ❌ CSS source file not found: $cssSourcePath" $Red
        }
    }
}

# Function to update app.json
function Update-AppJson {
    param([string]$VaultPath, [string]$PluginName)
    
    $appJsonPath = Join-Path $VaultPath ".obsidian" "app.json"
    
    Write-ColorOutput "  🔍 Updating app.json at: $appJsonPath" $Gray
    
    # Read existing app.json or create new one
    if (Test-Path $appJsonPath) {
        try {
            $appConfig = Get-Content $appJsonPath | ConvertFrom-Json
            Write-ColorOutput "  📖 Read existing app.json" $Gray
        } catch {
            Write-ColorOutput "Warning: Could not parse existing app.json, creating new one" $Yellow
            $appConfig = [PSCustomObject]@{
                plugins = @{}
            }
        }
    } else {
        Write-ColorOutput "  📝 Creating new app.json" $Gray
        $appConfig = [PSCustomObject]@{
            plugins = @{}
        }
    }
    
    # Ensure plugins property exists
    if (!$appConfig.plugins) {
        $appConfig.plugins = @{}
    }
    
    # Handle case where plugins might be read-only or have different structure
    try {
        # Check if plugins property is writable
        if ($appConfig.plugins -eq $null) {
            $appConfig.plugins = @{}
        }
        
        # Try to enable the plugin with multiple fallback approaches
        $pluginEnabled = $false
        
        # Method 1: Direct property assignment
        try {
            $appConfig.plugins.$PluginName = $true
            $pluginEnabled = $true
            Write-ColorOutput "  ✅ Plugin enabled via direct property assignment" $Gray
        } catch {
            Write-ColorOutput "  ⚠️  Direct property assignment failed: $($_.Exception.Message)" $Yellow
            
            # Method 2: Try using Add-Member if it's a PSCustomObject
            try {
                if ($appConfig.plugins -is [PSCustomObject]) {
                    $appConfig.plugins | Add-Member -Name $PluginName -Value $true -MemberType NoteProperty -Force
                    $pluginEnabled = $true
                    Write-ColorOutput "  ✅ Plugin enabled via Add-Member" $Gray
                }
            } catch {
                Write-ColorOutput "  ⚠️  Add-Member approach failed: $($_.Exception.Message)" $Yellow
                
                # Method 3: Create new object with plugin enabled
                try {
                    $newPlugins = @{}
                    if ($appConfig.plugins) {
                        $appConfig.plugins.PSObject.Properties | ForEach-Object {
                            $newPlugins[$_.Name] = $_.Value
                        }
                    }
                    $newPlugins[$PluginName] = $true
                    $appConfig.plugins = $newPlugins
                    $pluginEnabled = $true
                    Write-ColorOutput "  ✅ Plugin enabled via object recreation" $Gray
                } catch {
                    Write-ColorOutput "  ⚠️  Object recreation failed: $($_.Exception.Message)" $Yellow
                }
            }
        }
        
        if ($pluginEnabled) {
            # Save app.json
            try {
                $appConfig | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
                Write-ColorOutput "  📄 Updated app.json to enable plugin" $Gray
            } catch {
                Write-ColorOutput "  ⚠️  Could not save app.json: $($_.Exception.Message)" $Yellow
                Write-ColorOutput "  💡 Plugin files deployed but may need manual enabling in Obsidian settings" $Yellow
            }
        } else {
            Write-ColorOutput "  ⚠️  All methods to enable plugin failed" $Yellow
            Write-ColorOutput "  💡 Plugin files deployed but may need manual enabling in Obsidian settings" $Yellow
        }
    } catch {
        Write-ColorOutput "  ⚠️  Could not update app.json: $($_.Exception.Message)" $Yellow
        Write-ColorOutput "  💡 Plugin files deployed but may need manual enabling in Obsidian settings" $Yellow
    }
}

# Function to remove ObsidianObserver artifacts
function Remove-ObsidianObserver {
    param([string]$VaultPath)
    
    Write-ColorOutput "🗑️  Removing ObsidianObserver artifacts..." $Yellow
    
    # Remove plugin directory
    $pluginDir = Join-Path $VaultPath ".obsidian" "plugins" "obsidian-observer"
    if (Test-Path $pluginDir) {
        Remove-Item -Path $pluginDir -Recurse -Force
        Write-ColorOutput "  🗑️  Removed plugin directory: $pluginDir" $Gray
    } else {
        Write-ColorOutput "  ⚠️  Plugin directory not found: $pluginDir" $Yellow
    }
    
    # Remove _debug folder
    $debugDir = Join-Path $VaultPath "_debug"
    if (Test-Path $debugDir) {
        Remove-Item -Path $debugDir -Recurse -Force
        Write-ColorOutput "  🗑️  Removed _debug folder: $debugDir" $Gray
    } else {
        Write-ColorOutput "  ⚠️  _debug folder not found: $debugDir" $Yellow
    }
    
    # Remove CSS files
    $cssFiles = @("obsidianObserverEventsTable.css")
    $snippetsPath = Join-Path $VaultPath ".obsidian" "snippets"
    
    foreach ($cssFile in $cssFiles) {
        $cssPath = Join-Path $snippetsPath $cssFile
        if (Test-Path $cssPath) {
            Remove-Item -Path $cssPath -Force
            Write-ColorOutput "  🗑️  Removed CSS file: $cssFile" $Gray
        } else {
            Write-ColorOutput "  ⚠️  CSS file not found: $cssFile" $Yellow
        }
    }
    
    # Disable plugin in app.json
    $appJsonPath = Join-Path $VaultPath ".obsidian" "app.json"
    if (Test-Path $appJsonPath) {
        try {
            $appConfig = Get-Content $appJsonPath | ConvertFrom-Json
            if ($appConfig.plugins -and $appConfig.plugins."obsidian-observer") {
                try {
                    $appConfig.plugins."obsidian-observer" = $false
                    $appConfig | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
                    Write-ColorOutput "  📄 Disabled plugin in app.json" $Gray
                } catch {
                    Write-ColorOutput "  ⚠️  Could not disable plugin in app.json: $($_.Exception.Message)" $Yellow
                }
            }
        } catch {
            Write-ColorOutput "  ⚠️  Could not read app.json: $($_.Exception.Message)" $Yellow
        }
    }
    
    Write-ColorOutput "✅ ObsidianObserver artifacts removed successfully!" $Green
}

# Main execution
try {
    # Validate vault path
    if (!(Test-VaultPath $VaultPath)) {
        exit 1
    }
    
    if ($RemoveObsidianObserver) {
        # Remove ObsidianObserver artifacts
        Remove-ObsidianObserver $VaultPath
    } else {
        # Deploy ObsidianObserver plugin
        # Get plugin version
        $pluginVersion = Get-PluginVersion
        
        Write-ColorOutput "🚀 Deploying ObsidianObserver Plugin" $Cyan
        Write-ColorOutput "Version: $pluginVersion" $Cyan
        Write-ColorOutput "Vault Path: $VaultPath" $Gray
        
        if ($VerboseOutput) {
            Write-ColorOutput "Verbose mode enabled" $Gray
        }
        
        # Create Obsidian directory structure
        New-ObsidianStructure $VaultPath
        
        # Deploy plugin files
        $pluginName = "obsidian-observer"
        if (!(Deploy-PluginFiles $VaultPath $pluginName $SkipDeploy)) {
            Write-ColorOutput "Error: Failed to deploy plugin files" $Red
            exit 1
        }
        
        # Deploy CSS snippets
        Deploy-CssSnippets $VaultPath $SkipDeploy
        
        # Update app.json
        try {
            Update-AppJson $VaultPath $pluginName
        } catch {
            Write-ColorOutput "  ⚠️  App.json update failed: $($_.Exception.Message)" $Yellow
            Write-ColorOutput "  💡 Plugin files deployed but may need manual enabling in Obsidian settings" $Yellow
        }
        
        Write-ColorOutput "✅ Plugin deployed successfully!" $Green
        Write-ColorOutput "📁 Plugin location: $(Join-Path $VaultPath '.obsidian' 'plugins' $pluginName)" $Cyan
        Write-ColorOutput "💡 Restart Obsidian or reload the vault to activate the plugin" $Yellow
    }
    
} catch {
    Write-ColorOutput "Error: Operation failed: $($_.Exception.Message)" $Red
    exit 1
}
