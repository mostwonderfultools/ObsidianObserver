# ObsidianObserver Examples

This document provides practical examples of how to use and extend the ObsidianObserver plugin.

## 📋 Table of Contents

- [Basic Usage](#basic-usage)
- [Custom Configurations](#custom-configurations)
- [Extending Functionality](#extending-functionality)
- [Integration Examples](#integration-examples)
- [Testing Examples](#testing-examples)

## 🚀 Basic Usage

### **Simple Plugin Integration**

```typescript
import { Plugin } from 'obsidian';
import { EventLogger } from './logger';
import { EventHandlers } from './eventHandlers';

export default class MyPlugin extends Plugin {
  private logger: EventLogger;
  private eventHandlers: EventHandlers;

  async onload() {
    // Basic configuration
    const loggerConfig = {
      logFilePath: '_debug/events.md',
      enableConsoleLog: true
    };

    this.logger = new EventLogger(this.app, loggerConfig);
    this.eventHandlers = new EventHandlers(this.app, this.logger);
    this.eventHandlers.registerEventHandlers();
  }

  async onunload() {
    this.eventHandlers.unregisterEventHandlers();
  }
}
```

### **Custom Log File Path**

```typescript
const loggerConfig = {
  logFilePath: 'logs/obsidian-events.md',  // Custom path
  enableConsoleLog: false                  // Disable console output
};
```

## ⚙️ Custom Configurations

### **Minimal Configuration (Performance Focused)**

```typescript
const minimalConfig = {
  logFilePath: '_debug/minimal-events.md',
  enableConsoleLog: false      // No console output
};
```

### **Verbose Configuration (Debugging Focused)**

```typescript
const verboseConfig = {
  logFilePath: '_debug/verbose-events.md',
  enableConsoleLog: true       // Console output enabled
};
```

### **Custom Metadata Extraction**

```typescript
class CustomEventLogger extends EventLogger {
  async getFileMetadata(file: TFile): Promise<EventLog['metadata']> {
    const baseMetadata = await super.getFileMetadata(file);
    
    // Add custom metadata
    const content = await this.app.vault.read(file);
    
    return {
      ...baseMetadata,
      wordCount: content.split(/\s+/).length,
      lineCount: content.split('\n').length,
      hasLinks: content.includes('[[') && content.includes(']]'),
      hasTags: content.includes('#'),
      customField: this.extractCustomField(content)
    };
  }

  private extractCustomField(content: string): string | undefined {
    const match = content.match(/custom-field:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }
}
```

## 🔧 Extending Functionality

### **Custom Event Handler**

```typescript
class CustomEventHandlers extends EventHandlers {
  registerEventHandlers(): void {
    super.registerEventHandlers();
    
    // Add custom event handlers
    const customRef = this.app.workspace.on('layout-change', () => {
      this.handleLayoutChange();
    });
    this.eventRefs.push(customRef);
  }

  private async handleLayoutChange(): Promise<void> {
    const eventLog: EventLog = {
      timestamp: new Date().toISOString(),
      eventType: 'open', // Reuse existing type
      filePath: 'layout-change',
      fileName: 'Layout Change',
      vaultName: this.app.vault.getName(),
      metadata: {
        layoutType: this.app.workspace.getLayoutType(),
        activeLeaf: this.app.workspace.activeLeaf?.getDisplayText()
      }
    };

    await this.logger.logEvent(eventLog);
  }
}
```

### **Filtered Logging**

```typescript
class FilteredEventLogger extends EventLogger {
  private filters: Array<(eventLog: EventLog) => boolean> = [];

  addFilter(filter: (eventLog: EventLog) => boolean): void {
    this.filters.push(filter);
  }

  async logEvent(eventLog: EventLog): Promise<void> {
    // Apply filters
    for (const filter of this.filters) {
      if (!filter(eventLog)) {
        return; // Skip this event
      }
    }

    await super.logEvent(eventLog);
  }
}

// Usage
const filteredLogger = new FilteredEventLogger(app, config);

// Only log events for specific file types
filteredLogger.addFilter((eventLog) => {
  return eventLog.fileName.endsWith('.md');
});

// Only log events in specific folders
filteredLogger.addFilter((eventLog) => {
  return eventLog.filePath.startsWith('Projects/');
});

// Only log save events
filteredLogger.addFilter((eventLog) => {
  return eventLog.eventType === 'save';
});
```

### **Aggregated Logging**

```typescript
class AggregatedEventLogger extends EventLogger {
  private eventCounts: Map<string, number> = new Map();
  private lastFlushTime: number = Date.now();
  private flushInterval: number = 60000; // 1 minute

  async logEvent(eventLog: EventLog): Promise<void> {
    // Count events by type
    const key = `${eventLog.eventType}:${eventLog.filePath}`;
    this.eventCounts.set(key, (this.eventCounts.get(key) || 0) + 1);

    // Flush aggregated data periodically
    if (Date.now() - this.lastFlushTime > this.flushInterval) {
      await this.flushAggregatedData();
    }
  }

  private async flushAggregatedData(): Promise<void> {
    const aggregatedContent = this.formatAggregatedData();
    await this.writeToLogFile(aggregatedContent);
    
    this.eventCounts.clear();
    this.lastFlushTime = Date.now();
  }

  private formatAggregatedData(): string {
    let content = `\n## Aggregated Events - ${new Date().toISOString()}\n\n`;
    
    for (const [key, count] of this.eventCounts) {
      const [eventType, filePath] = key.split(':');
      content += `- **${eventType.toUpperCase()}**: ${filePath} (${count} times)\n`;
    }
    
    return content;
  }
}
```

## 🔗 Integration Examples

### **Integration with TestSidian**

```typescript
class TestSidianEventLogger extends EventLogger {
  async getFileMetadata(file: TFile): Promise<EventLog['metadata']> {
    const baseMetadata = await super.getFileMetadata(file);
    
    // Add TestSidian-specific metadata
    const content = await this.app.vault.read(file);
    
    return {
      ...baseMetadata,
      noteType: this.extractNoteType(content),
      projectLevel: this.extractProjectLevel(file.path),
      raciMembers: this.extractRACIMembers(content),
      testSidianVersion: 'v00.01.00'
    };
  }

  private extractNoteType(content: string): string | undefined {
    const match = content.match(/NoteType:\s*(.+)/);
    return match ? match[1].trim() : undefined;
  }

  private extractProjectLevel(filePath: string): number {
    const levels = filePath.split('/').filter(part => part.includes('Sub-Project')).length;
    return levels + 1; // Level 1 is main project
  }

  private extractRACIMembers(content: string): string[] {
    const raciMatch = content.match(/RACI:\s*\n([\s\S]*?)(?=\n\n|\n#|$)/);
    if (!raciMatch) return [];
    
    const raciContent = raciMatch[1];
    const memberMatches = raciContent.match(/\[\[([^\]]+)\]\]/g);
    return memberMatches ? memberMatches.map(m => m.slice(2, -2)) : [];
  }
}
```

### **Integration with Analytics**

```typescript
class AnalyticsEventLogger extends EventLogger {
  private analyticsData: Map<string, any> = new Map();

  async logEvent(eventLog: EventLog): Promise<void> {
    await super.logEvent(eventLog);
    
    // Update analytics
    this.updateAnalytics(eventLog);
  }

  private updateAnalytics(eventLog: EventLog): void {
    const date = new Date(eventLog.timestamp).toDateString();
    
    if (!this.analyticsData.has(date)) {
      this.analyticsData.set(date, {
        totalEvents: 0,
        eventsByType: { open: 0, close: 0, save: 0 },
        filesAccessed: new Set(),
        totalFileSize: 0
      });
    }

    const dayData = this.analyticsData.get(date);
    dayData.totalEvents++;
    dayData.eventsByType[eventLog.eventType]++;
    dayData.filesAccessed.add(eventLog.filePath);
    
    if (eventLog.metadata?.fileSize) {
      dayData.totalFileSize += eventLog.metadata.fileSize;
    }
  }

  getAnalyticsReport(): string {
    let report = '# Analytics Report\n\n';
    
    for (const [date, data] of this.analyticsData) {
      report += `## ${date}\n`;
      report += `- Total Events: ${data.totalEvents}\n`;
      report += `- Events by Type: ${JSON.stringify(data.eventsByType)}\n`;
      report += `- Files Accessed: ${data.filesAccessed.size}\n`;
      report += `- Total File Size: ${data.totalFileSize} bytes\n\n`;
    }
    
    return report;
  }
}
```

## 🧪 Testing Examples

### **Unit Test Example**

```typescript
// test/logger.test.ts
import { EventLogger } from '../src/logger';
import { EventLog } from '../src/types';

describe('EventLogger', () => {
  let logger: EventLogger;
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      vault: {
        getAbstractFileByPath: jest.fn(),
        read: jest.fn(),
        modify: jest.fn(),
        create: jest.fn(),
        adapter: {
          stat: jest.fn()
        }
      }
    };

    const config = {
      logFilePath: '_debug/test-events.md',
      enableConsoleLog: false
    };

    logger = new EventLogger(mockApp, config);
  });

  test('should log event to buffer', async () => {
    const eventLog: EventLog = {
      timestamp: '2024-12-20T15:30:00.000Z',
      eventType: 'open',
      filePath: 'test.md',
      fileName: 'test.md',
      vaultName: 'TestVault'
    };

    await logger.logEvent(eventLog);
    // Add assertions here
  });
});
```

### **Integration Test Example**

```typescript
// test/integration.test.ts
import { ObsidianObserverPlugin } from '../src/main';

describe('ObsidianObserver Integration', () => {
  let plugin: ObsidianObserverPlugin;
  let mockApp: any;

  beforeEach(() => {
    mockApp = {
      workspace: {
        on: jest.fn(),
        offref: jest.fn(),
        getActiveFile: jest.fn()
      },
      vault: {
        getName: jest.fn().mockReturnValue('TestVault'),
        getAbstractFileByPath: jest.fn(),
        read: jest.fn(),
        modify: jest.fn(),
        create: jest.fn()
      }
    };

    plugin = new ObsidianObserverPlugin();
    plugin.app = mockApp;
  });

  test('should register event handlers on load', async () => {
    await plugin.onload();
    
    expect(mockApp.workspace.on).toHaveBeenCalledWith('file-open', expect.any(Function));
    expect(mockApp.workspace.on).toHaveBeenCalledWith('file-close', expect.any(Function));
  });
});
```

### **Manual Testing Script**

```typescript
// test/manual-test.ts
export class ManualTester {
  constructor(private plugin: ObsidianObserverPlugin) {}

  async runTests(): Promise<void> {
    console.log('Starting manual tests...');

    // Test 1: Create a test file
    await this.createTestFile();
    
    // Test 2: Trigger file open
    await this.triggerFileOpen();
    
    // Test 3: Trigger file save
    await this.triggerFileSave();
    
    // Test 4: Trigger file close
    await this.triggerFileClose();
    
    // Test 5: Check log file
    await this.checkLogFile();
    
    console.log('Manual tests completed!');
  }

  private async createTestFile(): Promise<void> {
    const testContent = `---
title: Test File
type: test
---

# Test File

This is a test file for ObsidianObserver.

## Tags
#test #manual #obsidian-explorer

## Content
Some test content here.
`;

    await this.plugin.app.vault.create('test-manual.md', testContent);
    console.log('✓ Test file created');
  }

  private async triggerFileOpen(): Promise<void> {
    const testFile = this.plugin.app.vault.getAbstractFileByPath('test-manual.md');
    if (testFile && testFile instanceof TFile) {
      // Simulate file open
      await this.plugin.eventHandlers.testLogging();
      console.log('✓ File open event triggered');
    }
  }

  private async triggerFileSave(): Promise<void> {
    const testFile = this.plugin.app.vault.getAbstractFileByPath('test-manual.md');
    if (testFile && testFile instanceof TFile) {
      // Simulate file save
      const content = await this.plugin.app.vault.read(testFile);
      await this.plugin.app.vault.modify(testFile, content + '\n\n## Modified\nModified content.');
      console.log('✓ File save event triggered');
    }
  }

  private async triggerFileClose(): Promise<void> {
    // Simulate file close (this would normally be handled by Obsidian)
    console.log('✓ File close event simulated');
  }

  private async checkLogFile(): Promise<void> {
    const logFile = this.plugin.app.vault.getAbstractFileByPath('_debug/events.md');
    if (logFile && logFile instanceof TFile) {
      const content = await this.plugin.app.vault.read(logFile);
      console.log('✓ Log file content:', content.substring(0, 200) + '...');
    } else {
      console.log('✗ Log file not found');
    }
  }
}
```

## 📊 Performance Testing

### **Load Testing**

```typescript
class LoadTester {
  constructor(private logger: EventLogger) {}

  async runLoadTest(eventCount: number): Promise<void> {
    console.log(`Starting load test with ${eventCount} events...`);
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < eventCount; i++) {
      const eventLog: EventLog = {
        timestamp: new Date().toISOString(),
        eventType: i % 3 === 0 ? 'open' : i % 3 === 1 ? 'save' : 'close',
        filePath: `test-file-${i}.md`,
        fileName: `test-file-${i}.md`,
        vaultName: 'LoadTestVault',
        metadata: {
          fileSize: Math.floor(Math.random() * 10000),
          lastModified: new Date().toISOString()
        }
      };

      promises.push(this.logger.logEvent(eventLog));
    }

    await Promise.all(promises);
    await this.logger.flushBuffer();

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`Load test completed in ${duration}ms`);
    console.log(`Average time per event: ${duration / eventCount}ms`);
  }
}
```

These examples demonstrate the flexibility and extensibility of the ObsidianObserver plugin, showing how it can be adapted for different use cases and integrated with other systems.
