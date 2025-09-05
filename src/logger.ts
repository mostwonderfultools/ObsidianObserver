import { App, TFile } from 'obsidian';
import { EventLog, EventFrontmatter, LoggerConfig } from './types';

export class EventLogger {
  private app: App;
  private config: LoggerConfig;
  private logBuffer: EventLog[] = [];
  private maxBufferSize = 3; // Reduced from 10 to 3 for more frequent writes
  private pluginVersion: string;

  constructor(app: App, config: LoggerConfig, pluginVersion: string = 'unknown') {
    this.app = app;
    this.config = config;
    this.pluginVersion = pluginVersion;
  }

  private getPluginVersion(): string {
    return this.pluginVersion;
  }

  private getHostname(): string {
    // Create a meaningful machine identifier from available Obsidian context
    try {
      // Method 1: Try to use Node.js os module (most reliable - uses uv_os_gethostname)
      if (typeof require !== 'undefined') {
        try {
          const os = require('os');
          if (os && typeof os.hostname === 'function') {
            const hostname = os.hostname();
            console.log('[ObsidianObserver] os.hostname() result:', hostname);
            
            // Check if we got a meaningful hostname (not localhost or empty)
            if (hostname && 
                hostname.trim() && 
                hostname !== 'localhost' && 
                hostname !== '127.0.0.1' &&
                hostname !== '::1') {
              return hostname;
            }
          }
        } catch (osError) {
          console.log('[ObsidianObserver] os module not available or error:', osError);
        }
      }
      
      // Method 2: Try to get from environment variables (fallback)
      if (typeof process !== 'undefined' && process.env) {
        // macOS and Linux
        if (process.env.HOSTNAME && process.env.HOSTNAME !== 'localhost') {
          return process.env.HOSTNAME;
        }
        
        // Windows
        if (process.env.COMPUTERNAME && process.env.COMPUTERNAME !== 'localhost') {
          return process.env.COMPUTERNAME;
        }
        
        // Alternative Windows environment variable
        if (process.env.USERDOMAIN && process.env.USERDOMAIN !== 'localhost') {
          return process.env.USERDOMAIN;
        }
        
        // Try USER environment variable
        if (process.env.USER && process.env.USER !== 'localhost') {
          return process.env.USER;
        }
      }
      
      // Method 3: Create a meaningful identifier from Obsidian context
      let machineId = 'obsidian';
      
      // Try to get from vault name
      if (this.app && this.app.vault) {
        try {
          const vaultName = this.app.vault.getName();
          if (vaultName && vaultName.trim() && vaultName !== 'vault') {
            // Clean the vault name and use it as machine identifier
            const cleanName = vaultName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            if (cleanName.length > 0) {
              machineId = cleanName;
            }
          }
        } catch (vaultError) {
          console.log('[ObsidianObserver] Could not get vault name:', vaultError);
        }
      }
      
      // Method 4: Create a unique machine identifier based on available info
      let identifier = machineId;
      
      // Add OS information from navigator
      if (typeof navigator !== 'undefined' && navigator.platform) {
        if (navigator.platform.includes('Mac')) {
          identifier += '-mac';
        } else if (navigator.platform.includes('Win')) {
          identifier += '-win';
        } else if (navigator.platform.includes('Linux')) {
          identifier += '-linux';
        }
      }
      
      // Add a unique session identifier
      const sessionId = Math.random().toString(36).substring(2, 6);
      const finalId = `${identifier}-${sessionId}`;
      
      console.log('[ObsidianObserver] Generated machine identifier:', finalId);
      return finalId;
      
    } catch (error) {
      console.warn('[ObsidianObserver] Could not determine hostname:', error);
      // Generate a unique fallback identifier
      const fallbackId = Math.random().toString(36).substring(2, 8);
      return `fallback-${fallbackId}`;
    }
  }

  getConfig(): LoggerConfig {
    return this.config;
  }

  updateConfig(newConfig: LoggerConfig) {
    this.config = newConfig;
    console.log('[ObsidianObserver] Logger configuration updated:', newConfig);
  }

  async ensureEventsDirectoryExists(): Promise<void> {
    try {
      const eventsDir = `${this.config.eventsFolder}/events`;
      
      // Check if the directory exists
      const dirExists = this.app.vault.getAbstractFileByPath(eventsDir);
      
      if (!dirExists) {
        // Create the events directory
        try {
          await this.app.vault.createFolder(eventsDir);
          console.log(`[ObsidianObserver] Created events directory: ${eventsDir}`);
          
          // Refresh the file explorer to show the new directory
          this.app.workspace.trigger('file-explorer:refresh');
        } catch (createError: any) {
          if (createError.message && createError.message.includes('already exists')) {
            console.log(`[ObsidianObserver] Events directory already exists: ${eventsDir}`);
          } else {
            throw createError;
          }
        }
      } else {
        console.log(`[ObsidianObserver] Events directory already exists: ${eventsDir}`);
      }
    } catch (error) {
      console.error('[ObsidianObserver] Error ensuring events directory exists:', error);
    }
  }

  async logEvent(eventLog: EventLog): Promise<void> {
    try {
      // Add to buffer
      this.logBuffer.push(eventLog);

      // Flush buffer if it's full
      if (this.logBuffer.length >= this.maxBufferSize) {
        await this.flushBuffer();
      }

      // Console output if enabled
      if (this.config.enableConsoleLog) {
        console.log(`[ObsidianObserver] ${eventLog.eventType}: ${eventLog.filePath}`);
      }
    } catch (error) {
      console.error('[ObsidianObserver] Error logging event:', error);
    }
  }

  async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) return;

    try {
      // Create individual note files for each event
      for (const eventLog of this.logBuffer) {
        await this.createEventNote(eventLog);
      }
      
      console.log(`[ObsidianObserver] Buffer flushed: ${this.logBuffer.length} event notes created`);
      this.logBuffer = [];
    } catch (error) {
      console.error('[ObsidianObserver] Error flushing log buffer:', error);
    }
  }

  private async createEventNote(eventLog: EventLog): Promise<void> {
    try {
      const eventsDir = `${this.config.eventsFolder}/events`;
      const fileName = `${eventLog.guid}.md`;
      const filePath = `${eventsDir}/${fileName}`;
      
      // Get local timezone information
      const utcDate = new Date(eventLog.timestamp);
      const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
          // Convert EventLog to EventFrontmatter
    const frontmatter: EventFrontmatter = {
      OOEvent_GUID: eventLog.guid,
      OOEvent_Timestamp: eventLog.timestamp,
      OOEvent_LocalTimestamp: localDate.toISOString(),
      OOEvent_Timezone: timezone,
      OOEvent_Type: eventLog.eventType,
      OOEvent_FilePath: eventLog.filePath,
      OOEvent_FileName: eventLog.fileName,
      OOEvent_VaultName: eventLog.vaultName,
      OOEvent_Hostname: eventLog.hostname,
      OOEvent_LastModified: eventLog.metadata?.lastModified || '',
      OOEvent_Created: new Date().toISOString(),
      OOEvent_OldPath: eventLog.metadata?.oldPath,
      OOEvent_NewPath: eventLog.metadata?.newPath,
      OOEvent_SourcePath: eventLog.metadata?.sourcePath,
      OOEvent_TargetPath: eventLog.metadata?.targetPath,
      OOEvent_PluginVersion: this.getPluginVersion()
    };

      // Create the note content with frontmatter
      const noteContent = this.createNoteContent(frontmatter, eventLog);
      
      // Check if file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(filePath);
      
      if (existingFile) {
        console.log(`[ObsidianObserver] Event note already exists: ${filePath}`);
        return;
      }

      // Create the note file
      await this.app.vault.create(filePath, noteContent);
      console.log(`[ObsidianObserver] Created event note: ${filePath}`);
      
      // Refresh the file explorer to show the new file
      this.app.workspace.trigger('file-explorer:refresh');
      
    } catch (error) {
      console.error(`[ObsidianObserver] Error creating event note:`, error);
    }
  }

  private createNoteContent(frontmatter: EventFrontmatter, eventLog: EventLog): string {
    // Create frontmatter string with conditional fields
    let frontmatterFields = `---
aliases: [${eventLog.eventType.toUpperCase()} Event, ${eventLog.fileName}]
tags: [obsidian-explorer, event, ${eventLog.eventType}]
type: obsidian-event
OOEvent_GUID: ${frontmatter.OOEvent_GUID}
OOEvent_Timestamp: ${frontmatter.OOEvent_Timestamp}
OOEvent_LocalTimestamp: ${frontmatter.OOEvent_LocalTimestamp}
OOEvent_Timezone: ${frontmatter.OOEvent_Timezone}
OOEvent_Type: ${frontmatter.OOEvent_Type}
OOEvent_FilePath: ${frontmatter.OOEvent_FilePath}
OOEvent_FileName: ${frontmatter.OOEvent_FileName}
OOEvent_VaultName: ${frontmatter.OOEvent_VaultName}
OOEvent_Hostname: ${frontmatter.OOEvent_Hostname}
OOEvent_LastModified: ${frontmatter.OOEvent_LastModified}
OOEvent_Created: ${frontmatter.OOEvent_Created}
OOEvent_PluginVersion: ${frontmatter.OOEvent_PluginVersion}`;

    // Add optional fields if they exist
    if (frontmatter.OOEvent_OldPath) {
      frontmatterFields += `\nOOEvent_OldPath: ${frontmatter.OOEvent_OldPath}`;
    }
    if (frontmatter.OOEvent_NewPath) {
      frontmatterFields += `\nOOEvent_NewPath: ${frontmatter.OOEvent_NewPath}`;
    }
    if (frontmatter.OOEvent_SourcePath) {
      frontmatterFields += `\nOOEvent_SourcePath: ${frontmatter.OOEvent_SourcePath}`;
    }
    if (frontmatter.OOEvent_TargetPath) {
      frontmatterFields += `\nOOEvent_TargetPath: ${frontmatter.OOEvent_TargetPath}`;
    }

    frontmatterFields += `\n---\n\n`;

    // Create the note content - simplified to just frontmatter and link
    let noteContent = frontmatterFields;
    
    // Only add file link if there's a file name (skip for quit/ready/PluginLoaded events)
    if (eventLog.fileName && eventLog.fileName.trim() !== '') {
      noteContent += `[[${eventLog.fileName}]]`;
    } else {
      noteContent += `# ${eventLog.eventType.toUpperCase()} Event\n\nThis event was logged at ${new Date(eventLog.timestamp).toLocaleString()}.`;
    }

    return noteContent;
  }

  // Legacy method for backward compatibility - now creates a summary note
  async createSummaryNote(): Promise<void> {
    try {
      const summaryPath = `${this.config.eventsFolder}/events/_summary.md`;
      
      const summaryContent = `---
aliases: [ObsidianObserver Events Summary, Events Summary]
tags: [obsidian-explorer, summary, events]
type: events-summary
version: "${this.getPluginVersion()}"
cssclasses: obsidianObserverEventsTable
---

# ObsidianObserver Events Summary

This file provides a summary of all ObsidianObserver events.

> **Note**: This summary uses the \`obsidianObserverEventsTable\` CSS class for enhanced table styling. The CSS class is automatically applied to this note.

## DataView Query Examples

### Basic Event Queries
\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "save"
SORT OOEvent_LocalTimestamp DESC
LIMIT 5
\`\`\`

\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "close"
SORT OOEvent_LocalTimestamp DESC
LIMIT 5
\`\`\`

### File Management Events
\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "create"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "delete"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_OldPath, OOEvent_NewPath, OOEvent_LocalTimestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "rename"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

### Advanced Queries
\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_Timestamp
FROM "${this.config.eventsFolder}/events"
WHERE contains(OOEvent_FilePath, "Projects")
SORT OOEvent_Timestamp DESC
\`\`\`

\`\`\`dataview
TABLE OOEvent_GUID, OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, OOEvent_Timestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_GUID = "ABC123DEF456GHI789JKL012"
\`\`\`

### File Size Analysis
\`\`\`dataview
TABLE OOEvent_FileName, OOEvent_FileSize, OOEvent_Type, OOEvent_Timestamp
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_FileSize
SORT OOEvent_FileSize DESC
LIMIT 10
\`\`\`

### Recent Activity
\`\`\`dataview
TABLE OOEvent_FileName, OOEvent_Type, OOEvent_Timestamp
FROM "${this.config.eventsFolder}/events"
SORT OOEvent_Timestamp DESC
LIMIT 20
\`\`\`

## Event Statistics

### Event Type Distribution
\`\`\`dataview
TABLE length(rows) as "Count"
FROM "${this.config.eventsFolder}/events"
GROUP BY OOEvent_Type
SORT Count DESC
\`\`\`

### Vault Activity
\`\`\`dataview
TABLE length(rows) as "Count"
FROM "${this.config.eventsFolder}/events"
GROUP BY OOEvent_VaultName
SORT Count DESC
\`\`\`

### File Activity
\`\`\`dataview
TABLE OOEvent_FileName, length(rows) as "Event Count"
FROM "${this.config.eventsFolder}/events"
GROUP BY OOEvent_FileName
SORT "Event Count" DESC
LIMIT 20
\`\`\`

### Daily Activity
\`\`\`dataview
TABLE date(OOEvent_Timestamp) as "Date", length(rows) as "Events"
FROM "${this.config.eventsFolder}/events"
GROUP BY date(OOEvent_Timestamp)
SORT "Date" DESC
LIMIT 30
\`\`\`
`;

      // Check if summary file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
      
      if (existingFile) {
        console.log(`[ObsidianObserver] Summary file already exists: ${summaryPath}`);
        return;
      }

      // Create the summary file
      await this.app.vault.create(summaryPath, summaryContent);
      console.log(`[ObsidianObserver] Created summary file: ${summaryPath}`);
      
      // Refresh the file explorer to show the new file
      this.app.workspace.trigger('file-explorer:refresh');
      
    } catch (error) {
      console.error(`[ObsidianObserver] Error creating summary file:`, error);
    }
  }

  // Create the EventsBase.base file in the events folder
  async createEventsBaseFile(): Promise<void> {
    try {
      const basePath = `${this.config.eventsFolder}/EventsBase.base`;
      
      const baseContent = `formulas:
  Time: OOEvent_LocalTimestamp
  File: link(OOEvent_Filename)
  Untitled: OOEvent_LocalTimestamp - now()
  When: (now() - date(OOEvent_LocalTimestamp.slice(0,10))).days
  FileLink: file(OOEvent_FilePath)
  Accessed: date(OOEvent_LocalTimestamp.slice(0,19)).relative()
properties:
  note.OOEvent_Type:
    displayName: Event
  note.OOEvent_LocalTimestamp:
    displayName: Timestamp
  file.name:
    displayName: Note
  note.OOEvent_Hostname:
    displayName: Hostname
views:
  - type: table
    name: Table
    filters:
      and:
        - file.hasProperty("OOEvent_GUID")
    order:
      - OOEvent_Type
      - formula.File
      - OOEvent_LocalTimestamp
      - OOEvent_Timestamp
    sort: []
    columnSize:
      formula.File: 150
  - type: table
    name: Today's File Accesses
    filters:
      and:
        - formula.When <= 1
        - OOEvent_Type.containsAny("open", "save", "rename", "delete")
    order:
      - formula.FileLink
      - OOEvent_Type
      - formula.Accessed
      - OOEvent_Hostname
    sort:
      - property: formula.Accessed
        direction: DESC
      - property: OOEvent_LocalTimestamp
        direction: ASC
      - property: formula.When
        direction: ASC
    columnSize:
      formula.FileLink: 140
      note.OOEvent_Type: 117
      note.OOEvent_LocalTimestamp: 213`;

      // Check if base file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(basePath);
      
      if (existingFile) {
        console.log(`[ObsidianObserver] EventsBase.base file already exists: ${basePath}`);
        return;
      }

      // Create the base file
      await this.app.vault.create(basePath, baseContent);
      console.log(`[ObsidianObserver] Created EventsBase.base file: ${basePath}`);
      
    } catch (error) {
      console.error(`[ObsidianObserver] Error creating EventsBase.base file:`, error);
    }
  }

  // Create the main summary file in the events folder
  async createMainSummaryNote(): Promise<void> {
    try {
      const summaryPath = `${this.config.eventsFolder}/EventsSummary.md`;
      
      const summaryContent = `---
aliases: [ObsidianObserver Main Summary, Events Summary]
tags: [obsidian-explorer, summary, events, main]
type: events-summary
version: "${this.getPluginVersion()}"
cssclasses: obsidianObserverEventsTable
---

# ObsidianObserver Events Summary

This file provides comprehensive DataView reports for common use-cases with ObsidianObserver events.

> **Note**: This summary uses the \`obsidianObserverEventsTable\` CSS class for enhanced table styling. The CSS class is automatically applied to this note.

## Quick Overview

### Recent Activity (Last 20 Events)
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
SORT OOEvent_LocalTimestamp DESC
LIMIT 20
\`\`\`

### Event Type Distribution
\`\`\`dataview
TABLE length(rows) as "Count"
FROM "${this.config.eventsFolder}/events"
GROUP BY OOEvent_Type
SORT Count DESC
\`\`\`

### Most Active Files
\`\`\`dataviewjs
const ignore = ["ready", "PLUGINLOADED", "QUIT"];

const pages = dv.pages('"${this.config.eventsFolder}/events"')
  .where(p => p.OOEvent_FileName && 
              !ignore.includes(p.OOEvent_Type) && 
              !p.OOEvent_FilePath.includes('${this.config.eventsFolder}'));

const grouped = new Map();

for (let page of pages) {
  const key = page.OOEvent_FileName;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(page);
}

const result = Array.from(grouped.entries())
  .map(([file, rows]) => {
    const opens = rows.filter(r => r.OOEvent_Type === "open").length;
    const saves = rows.filter(r => r.OOEvent_Type === "save").length;
    const closes = rows.filter(r => r.OOEvent_Type === "close").length;
    return {
      File: file.replace(/\\.md$/, ""),
      Opens: opens,
      Saves: saves,
      Closes: closes,
      Total: rows.length
    };
  })
  .filter(row => row.Saves > 0 || row.Closes > 0) // Filter out files that only have opens
  .sort((a, b) => b.Total - a.Total)
  .slice(0, 15);

// Build the HTML table
let html = \`
<div class="activity-log-table">
<table>
  <thead>
    <tr>
      <th style="width: 40%; text-align: left;">File</th>
      <th style="text-align: right;">Total</th>
      <th style="text-align: right;">Opens</th>
      <th style="text-align: right;">Saves</th>
      <th style="text-align: right;">Closes</th>
    </tr>
  </thead>
  <tbody>
\`;

for (let row of result) {
  // Create a link to the original note
  const fileLink = \`[[\${row.File}]]\`;
  html += \`
    <tr>
      <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\${fileLink}</td>
      <td style="text-align: right;">\${row.Total}</td>
      <td style="text-align: right;">\${row.Opens}</td>
      <td style="text-align: right;">\${row.Saves}</td>
      <td style="text-align: right;">\${row.Closes}</td>
    </tr>
  \`;
}

html += \`
  </tbody>
</table>
</div>
\`;

dv.container.innerHTML = html;
\`\`\`

## File Operations

### Recent File Opens
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

### Recent File Saves
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "save"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

### Recent File Closes
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "close"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

## File Management

### Recently Created Files
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "create"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

### Recently Deleted Files
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "delete"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

### Recently Renamed Files
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  OOEvent_OldPath AS "Old Path",
  OOEvent_NewPath AS "New Path",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_Type = "rename"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
\`\`\`

## Advanced Analysis

### Project-Related Activity
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE contains(OOEvent_FilePath, "Projects")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
\`\`\`

### People-Related Activity
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE contains(OOEvent_FilePath, "People")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
\`\`\`

### Meeting-Related Activity
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE contains(OOEvent_FileName, "Meeting")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
\`\`\`

## Time-Based Analysis

### Today's Activity
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE date(OOEvent_LocalTimestamp) = date(today)
SORT OOEvent_LocalTimestamp DESC
\`\`\`

### This Week's Activity
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE date(OOEvent_LocalTimestamp) >= date(today) - dur(7 days)
SORT OOEvent_LocalTimestamp DESC
\`\`\`

### Daily Activity Summary (Last 30 Days)
\`\`\`dataview
TABLE date(OOEvent_LocalTimestamp) as "Date", length(rows) as "Events"
FROM "${this.config.eventsFolder}/events"
GROUP BY date(OOEvent_LocalTimestamp)
SORT "Date" DESC
LIMIT 30
\`\`\`

## File Size Analysis

### Files with Size Information
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  OOEvent_FileSize AS "Size",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_FileSize
SORT OOEvent_FileSize DESC
LIMIT 10
\`\`\`

## Search and Filter

### Search by File Name
\`\`\`dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE contains(OOEvent_FileName, "YOUR_SEARCH_TERM")
SORT OOEvent_LocalTimestamp DESC
\`\`\`

### Search by GUID
\`\`\`dataview
TABLE WITHOUT ID
  OOEvent_GUID AS "GUID",
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "${this.config.eventsFolder}/events"
WHERE OOEvent_GUID = "YOUR_GUID_HERE"
\`\`\`

## Event Types Explained

- **open**: File opened in Obsidian editor
- **save**: File modified and saved
- **close**: File closed in editor
- **create**: New file created
- **delete**: File deleted from vault
- **rename**: File renamed or moved (includes old and new paths)
- **ready**: Obsidian application fully loaded and ready
- **quit**: Obsidian application closing
- **PluginLoaded**: ObsidianObserver plugin loaded and initialized

## Metadata Fields

- **OOEvent_GUID**: Unique Base32 identifier for each event
- **OOEvent_Timestamp**: ISO timestamp of the event (UTC)
- **OOEvent_LocalTimestamp**: Local timestamp of the event (user's timezone)
- **OOEvent_Type**: Type of file operation
- **OOEvent_FilePath**: Full path to the file
- **OOEvent_FileName**: Name of the file
- **OOEvent_VaultName**: Name of the vault
- **OOEvent_Hostname**: Hostname of the machine where the event occurred
- **OOEvent_LastModified**: Last modification time of the file
- **OOEvent_Created**: When the event note was created
- **OOEvent_FileSize**: Size of the file in bytes
- **OOEvent_OldPath**: Previous path (for rename events)
- **OOEvent_NewPath**: New path (for rename events)
`;

      // Check if summary file already exists
      const existingFile = this.app.vault.getAbstractFileByPath(summaryPath);
      
      if (existingFile) {
        console.log(`[ObsidianObserver] Main summary file already exists: ${summaryPath}`);
        return;
      }

      // Create the summary file
      await this.app.vault.create(summaryPath, summaryContent);
      console.log(`[ObsidianObserver] Created main summary file: ${summaryPath}`);
      
      // Also create the EventsBase.base file
      await this.createEventsBaseFile();
      
      // Refresh the file explorer to show the new files
      this.app.workspace.trigger('file-explorer:refresh');
      
    } catch (error) {
      console.error(`[ObsidianObserver] Error creating main summary file:`, error);
    }
  }

  // Refresh the main summary file by deleting and recreating it
  async refreshMainSummaryNote(): Promise<void> {
    try {
      const summaryPath = `${this.config.eventsFolder}/EventsSummary.md`;
      const basePath = `${this.config.eventsFolder}/EventsBase.base`;
      
      // Check if summary file exists and delete it
      const existingSummaryFile = this.app.vault.getAbstractFileByPath(summaryPath);
      if (existingSummaryFile) {
        await this.app.vault.delete(existingSummaryFile);
        console.log(`[ObsidianObserver] Deleted existing summary file: ${summaryPath}`);
      }

      // Check if base file exists and delete it
      const existingBaseFile = this.app.vault.getAbstractFileByPath(basePath);
      if (existingBaseFile) {
        await this.app.vault.delete(existingBaseFile);
        console.log(`[ObsidianObserver] Deleted existing EventsBase.base file: ${basePath}`);
      }

      // Create new files with fresh content
      await this.createMainSummaryNote();
      console.log(`[ObsidianObserver] Refreshed main summary file: ${summaryPath}`);
      
    } catch (error) {
      console.error(`[ObsidianObserver] Error refreshing main summary file:`, error);
      throw error; // Re-throw to allow the command to show an error notice
    }
  }

}
