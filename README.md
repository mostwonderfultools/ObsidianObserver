# ObsidianObserver

A comprehensive Obsidian plugin that tracks file events (open, save, close) and stores them as individual notes with rich metadata for enhanced DataView compatibility and analysis.

## Features

- **Event Tracking**: Logs file open, save, and close events
- **Individual Note Storage**: Each event stored as a separate markdown file
- **Rich Metadata**: Includes file paths, timestamps, vault information, and modification times
- **DataView Compatible**: Optimized frontmatter structure for DataView queries
- **Unique GUIDs**: Base32-encoded identifiers for each event
- **Professional Styling**: CSS integration for DataView tables
- **Configurable Events Directory**: Customizable folder for storing event files

## Quick Start

### Installation
1. Download the latest release
2. Extract to your Obsidian vault's `.obsidian/plugins/` directory
3. Enable the plugin in Obsidian settings

### Configuration
The plugin provides a comprehensive settings page accessible through Obsidian's Settings → Community Plugins → ObsidianObserver:

- **Events Directory**: Set the folder where event files will be stored (default: `ObsidianObserver/events`)
- **Enable Console Logging**: Toggle console output for debugging

**Note**: The EventSummary.md file is automatically created in the Events Directory.

### Deployment
Use the provided PowerShell deployment script to deploy the plugin:

```powershell
# Deploy to existing vault
./bin/deploy.ps1 -VaultPath "C:\path\to\your\vault"

# Deploy with verbose output
./bin/deploy.ps1 -VaultPath "C:\path\to\your\vault" -VerboseOutput

# Skip file deployment (useful for testing)
./bin/deploy.ps1 -VaultPath "C:\path\to\your\vault" -SkipDeploy

# Remove all ObsidianObserver artifacts from vault
./bin/deploy.ps1 -VaultPath "C:\path\to\your\vault" -RemoveObsidianObserver
```

## Documentation

See `docs/README.md` for comprehensive documentation including:
- Installation and configuration
- DataView query examples
- Event types and metadata fields
- Troubleshooting guide

## Development

### Building
```powershell
# Standard build
npm run build

# Build with version parameterization (recommended)
./bin/build.ps1 -BuildVersion "00.01.17"

# Build with custom options
./bin/build.ps1 -BuildVersion "00.01.17" -SkipDependencies -CreatePackage
./bin/build.ps1 -BuildVersion "00.01.17" -VaultName "TestVault"  # Update specific vault
```

### Testing
The plugin includes test utilities for GUID generation and event logging.

## License

MIT License
