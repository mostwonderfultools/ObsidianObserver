# ObsidianObserver API Reference

This document provides detailed API documentation for the ObsidianObserver plugin.

## 📋 Table of Contents

- [Types](#types)
- [EventLogger](#eventlogger)
- [EventHandlers](#eventhandlers)
- [ObsidianObserverPlugin](#ObsidianObserverplugin)

## 🔧 Types

### EventLog
Represents a single event log entry.

```typescript
interface EventLog {
  timestamp: string;           // ISO timestamp of the event
  eventType: 'open' | 'close' | 'save';  // Type of event
  filePath: string;           // Full path to the file
  fileName: string;           // Name of the file
  vaultName: string;          // Name of the vault
  metadata?: {                // Optional metadata
    fileSize?: number;        // File size in bytes
    lastModified?: string;    // Last modification timestamp
    tags?: string[];          // Array of tags found in content
    frontmatter?: Record<string, any>;  // Parsed YAML frontmatter
  };
}
```

### LoggerConfig
Configuration for the EventLogger.

```typescript
interface LoggerConfig {
  logFilePath: string;        // Path to log file (default: '_debug/events.md')
  enableConsoleLog: boolean;  // Enable console output (default: true)
}
```

### ObsidianObserverSettings
Plugin settings interface.

```typescript
interface ObsidianObserverSettings {
  enableLogging: boolean;     // Enable/disable logging
  logFilePath: string;        // Custom log file path
  includeFileMetadata: boolean;  // Include file metadata
  includeFrontmatter: boolean;   // Include frontmatter parsing
  maxLogEntries: number;      // Maximum log entries to keep
  enableConsoleOutput: boolean;  // Enable console output
}
```

## 📝 EventLogger

The EventLogger class handles writing event logs to the log file with buffering and error handling.

### Constructor
```typescript
constructor(app: App, config: LoggerConfig)
```

**Parameters:**
- `app`: Obsidian App instance
- `config`: Logger configuration object

### Methods

#### logEvent(eventLog: EventLog): Promise<void>
Logs a single event to the buffer.

**Parameters:**
- `eventLog`: Event log entry to log

**Returns:** Promise that resolves when the event is logged

#### flushBuffer(): Promise<void>
Flushes the current buffer to the log file.

**Returns:** Promise that resolves when the buffer is flushed

#### getFileMetadata(file: TFile): Promise<EventLog['metadata']>
Extracts metadata from a file.

**Parameters:**
- `file`: TFile instance to extract metadata from

**Returns:** Promise that resolves to file metadata or undefined

### Private Methods

#### formatLogEntries(entries: EventLog[]): string
Formats an array of event logs into markdown.

**Parameters:**
- `entries`: Array of event log entries

**Returns:** Formatted markdown string

#### writeToLogFile(content: string): Promise<void>
Writes content to the log file.

**Parameters:**
- `content`: Content to write to the log file

**Returns:** Promise that resolves when content is written

## 🎯 EventHandlers

The EventHandlers class manages Obsidian event registration and handling.

### Constructor
```typescript
constructor(app: App, logger: EventLogger)
```

**Parameters:**
- `app`: Obsidian App instance
- `logger`: EventLogger instance

### Methods

#### registerEventHandlers(): void
Registers all event handlers with Obsidian.

**Events Registered:**
- `file-open`: When a file is opened
- `file-close`: When a file is closed
- `modify`: When a file is modified/saved

#### unregisterEventHandlers(): void
Unregisters all event handlers and flushes the log buffer.

#### testLogging(): Promise<void>
Manually triggers logging for the currently active file.

**Returns:** Promise that resolves when test logging is complete

### Private Methods

#### handleFileOpen(file: TFile): Promise<void>
Handles file open events.

**Parameters:**
- `file`: TFile instance that was opened

**Returns:** Promise that resolves when event is handled

#### handleFileClose(file: TFile): Promise<void>
Handles file close events.

**Parameters:**
- `file`: TFile instance that was closed

**Returns:** Promise that resolves when event is handled

#### handleFileSave(file: TFile): Promise<void>
Handles file save events.

**Parameters:**
- `file`: TFile instance that was saved

**Returns:** Promise that resolves when event is handled

## 🔌 ObsidianObserverPlugin

The main plugin class that extends Obsidian's Plugin class.

### Constructor
```typescript
constructor()
```

### Lifecycle Methods

#### onload(): Promise<void>
Called when the plugin is loaded. Initializes the plugin components.

**Initialization Steps:**
1. Creates logger configuration
2. Initializes EventLogger instance
3. Creates EventHandlers instance
4. Registers event handlers
5. Adds ribbon icon for testing
6. Adds status bar item

#### onunload(): Promise<void>
Called when the plugin is unloaded. Cleans up resources.

**Cleanup Steps:**
1. Unregisters event handlers
2. Flushes log buffer
3. Cleans up UI elements

### UI Elements

#### Ribbon Icon
- **Icon**: Bug icon
- **Tooltip**: "Test ObsidianObserver Logging"
- **Action**: Triggers test logging for active file

#### Status Bar Item
- **Text**: "ObsidianObserver Active"
- **Purpose**: Shows plugin status

## 🔄 Event Flow

### File Open Event
1. User opens a file in Obsidian
2. `file-open` event is triggered
3. `handleFileOpen()` is called
4. File metadata is extracted
5. Event log is created
6. Log is added to buffer
7. Buffer is flushed if full

### File Close Event
1. User closes a file in Obsidian
2. `file-close` event is triggered
3. `handleFileClose()` is called
4. File metadata is extracted
5. Event log is created
6. Log is added to buffer
7. Buffer is flushed if full

### File Save Event
1. User saves a file in Obsidian
2. `modify` event is triggered
3. `handleFileSave()` is called
4. File metadata is extracted
5. Event log is created
6. Log is added to buffer
7. Buffer is flushed if full

## 🛠️ Error Handling

### Logger Errors
- File system errors are caught and logged to console
- Buffer operations continue even if individual writes fail
- Metadata extraction errors don't prevent event logging

### Event Handler Errors
- Individual event handler errors don't affect other handlers
- Errors are logged to console for debugging
- Plugin continues to function even with handler errors

### Plugin Errors
- Plugin initialization errors are logged to console
- Plugin cleanup errors are logged but don't prevent shutdown
- UI element errors don't affect core functionality

## 📊 Performance Considerations

### Buffering
- Events are buffered in memory before writing to disk
- Default buffer size is 10 events
- Buffer is flushed when full or on plugin unload

### Async Operations
- All file operations are asynchronous
- Event handlers don't block the main thread
- Metadata extraction is performed asynchronously

### Memory Management
- Event references are properly cleaned up
- Buffer is cleared after flushing
- No memory leaks from event handlers

## 🔧 Configuration Options

### Logger Configuration
```typescript
const loggerConfig: LoggerConfig = {
  logFilePath: '_debug/events.md',  // Custom log file path
  enableConsoleLog: true            // Enable console output
};
```

### Plugin Settings
```typescript
const settings: ObsidianObserverSettings = {
  enableLogging: true,             // Enable/disable logging
  logFilePath: '_debug/events.md', // Custom log file path
  includeFileMetadata: true,       // Include file metadata
  includeFrontmatter: true,        // Include frontmatter parsing
  maxLogEntries: 1000,            // Maximum log entries
  enableConsoleOutput: true        // Enable console output
};
```
