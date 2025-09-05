import { App, TFile, TAbstractFile, EventRef } from 'obsidian';
import { EventLogger } from './logger';
import { LoggerConfig, EventLog } from './types';
import { generateBase32Guid } from './utils';

export class EventHandlers {
  private app: App;
  private logger: EventLogger;
  private eventRefs: EventRef[] = [];
  private isProcessingEvent = false;
  private excludedFiles: string[] = []; // All configured debug files are now excluded by the shouldExcludeFile method
  private loggerConfig: LoggerConfig;
  private hasLoggedAppReady = false; // Flag to prevent multiple ready events

  constructor(app: App, logger: EventLogger) {
    this.app = app;
    this.logger = logger;
    this.loggerConfig = logger.getConfig(); // We'll need to add this method to EventLogger
  }

  updateLoggerConfig(newConfig: LoggerConfig) {
    this.loggerConfig = newConfig;
    console.log('[ObsidianObserver] Event handlers configuration updated:', newConfig);
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

  /**
   * Determines if a file should be excluded from logging
   * @param filePath The path of the file to check
   * @returns true if the file should be excluded from logging
   */
  private shouldExcludeFile(filePath: string): boolean {
    // Skip ALL changes to the configured events folder - this prevents indexing loops
    if (filePath.startsWith(this.loggerConfig.eventsFolder)) {
      return true;
    }
    
    // Check for Obsidian internal files and directories
    if (filePath.startsWith('.obsidian/')) {
      return true;
    }
    
    // Check for temporary files and indexing artifacts
    if (filePath.includes('.temp') || filePath.includes('.tmp') || filePath.includes('.cache')) {
      return true;
    }
    
    // Check for hidden files (starting with .)
    if (filePath.startsWith('.')) {
      return true;
    }
    
    // Check specific excluded files
    return this.excludedFiles.includes(filePath);
  }

  registerEventHandlers(): void {
    try {
      // Register file open events
      const openRef = this.app.workspace.on('file-open', (file: TFile | null) => {
        if (file) {
          this.handleFileOpen(file);
        }
      });
      this.eventRefs.push(openRef);

      // Register file save/modify events
      const saveRef = this.app.vault.on('modify', (file: TAbstractFile) => {
        if (file instanceof TFile) {
          this.handleFileSave(file);
        }
      });
      this.eventRefs.push(saveRef);

      // Register file rename events
      const renameRef = this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
        if (file instanceof TFile) {
          this.handleFileRename(file, oldPath);
        }
      });
      this.eventRefs.push(renameRef);

      // Register file delete events
      const deleteRef = this.app.vault.on('delete', (file: TAbstractFile) => {
        if (file instanceof TFile) {
          this.handleFileDelete(file);
        }
      });
      this.eventRefs.push(deleteRef);

      // Register app layout ready event
      const readyRef = this.app.workspace.on('resize', () => {
        this.handleAppReady();
      });
      this.eventRefs.push(readyRef);

      console.log('[ObsidianObserver] Event handlers registered successfully (open, save, rename, delete, layout-ready)');
    } catch (error) {
      console.error('[ObsidianObserver] Error registering event handlers:', error);
    }
  }

  unregisterEventHandlers(): void {
    try {
      // Unregister all event references
      for (const eventRef of this.eventRefs) {
        this.app.workspace.offref(eventRef);
      }
      this.eventRefs = [];

      // Flush any remaining log entries
      this.logger.flushBuffer();

      console.log('[ObsidianObserver] Event handlers unregistered successfully');
    } catch (error) {
      console.error('[ObsidianObserver] Error unregistering event handlers:', error);
    }
  }

  private async handleFileOpen(file: TFile): Promise<void> {
    try {
      // Prevent recursive event processing
      if (this.isProcessingEvent) {
        return;
      }
      
      // Skip logging events for excluded files to prevent recursion
      if (this.shouldExcludeFile(file.path)) {
        return;
      }
      
      this.isProcessingEvent = true;

      // Get file metadata for last modified time and size
      let metadata;
      try {
        const stat = await this.app.vault.adapter.stat(file.path);
        if (stat) {
          metadata = {
            lastModified: new Date(stat.mtime).toISOString(),
            fileSize: stat.size
          };
        }
      } catch (error) {
        console.warn('[ObsidianObserver] Error getting file metadata:', error);
      }
      
      const eventLog: EventLog = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'open',
        filePath: file.path,
        fileName: file.name,
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata
      };

      await this.logger.logEvent(eventLog);
    } catch (error) {
      console.error('[ObsidianObserver] Error handling file open event:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }

  private async handleFileSave(file: TFile): Promise<void> {
    try {
      // Prevent recursive event processing
      if (this.isProcessingEvent) {
        return;
      }
      
      // Skip logging events for excluded files to prevent recursion
      if (this.shouldExcludeFile(file.path)) {
        return;
      }
      
      this.isProcessingEvent = true;

      // Get file metadata for last modified time and size
      let metadata;
      try {
        const stat = await this.app.vault.adapter.stat(file.path);
        if (stat) {
          metadata = {
            lastModified: new Date(stat.mtime).toISOString(),
            fileSize: stat.size
          };
        }
      } catch (error) {
        console.warn('[ObsidianObserver] Error getting file metadata:', error);
      }

      const eventLog: EventLog = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'save',
        filePath: file.path,
        fileName: file.name,
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata
      };

      await this.logger.logEvent(eventLog);
    } catch (error) {
      console.error('[ObsidianObserver] Error handling file save event:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }

  private async handleFileRename(file: TFile, oldPath: string): Promise<void> {
    try {
      // Prevent recursive event processing
      if (this.isProcessingEvent) {
        return;
      }
      
      // Skip logging events for excluded files to prevent recursion
      if (this.shouldExcludeFile(file.path) || this.shouldExcludeFile(oldPath)) {
        return;
      }
      
      this.isProcessingEvent = true;

      // Get file metadata for last modified time and size
      let metadata;
      try {
        const stat = await this.app.vault.adapter.stat(file.path);
        if (stat) {
          metadata = {
            lastModified: new Date(stat.mtime).toISOString(),
            fileSize: stat.size,
            oldPath: oldPath,
            newPath: file.path
          };
        }
      } catch (error) {
        console.warn('[ObsidianObserver] Error getting file metadata:', error);
      }

      const eventLog: EventLog = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'rename',
        filePath: file.path,
        fileName: file.name,
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata
      };

      await this.logger.logEvent(eventLog);
    } catch (error) {
      console.error('[ObsidianObserver] Error handling file rename event:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }

  private async handleFileDelete(file: TFile): Promise<void> {
    try {
      // Prevent recursive event processing
      if (this.isProcessingEvent) {
        return;
      }
      
      // Skip logging events for excluded files to prevent recursion
      if (this.shouldExcludeFile(file.path)) {
        return;
      }
      
      this.isProcessingEvent = true;

      const eventLog: EventLog = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'delete',
        filePath: file.path,
        fileName: file.name,
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata: {
          lastModified: new Date().toISOString()
        }
      };

      await this.logger.logEvent(eventLog);
    } catch (error) {
      console.error('[ObsidianObserver] Error handling file delete event:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }

  private async handleAppReady(): Promise<void> {
    try {
      // Only log app ready once per session
      if (this.hasLoggedAppReady) {
        return;
      }
      
      // Prevent recursive event processing
      if (this.isProcessingEvent) {
        return;
      }
      
      this.isProcessingEvent = true;

      const eventLog: EventLog = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'ready',
        filePath: '',
        fileName: '',
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata: {
          lastModified: new Date().toISOString()
        }
      };

      await this.logger.logEvent(eventLog);
      
      // Mark that we've logged the app ready event
      this.hasLoggedAppReady = true;
    } catch (error) {
      console.error('[ObsidianObserver] Error handling app ready event:', error);
    } finally {
      this.isProcessingEvent = false;
    }
  }



  async testLogging(): Promise<void> {
    try {
      const testFile = this.app.workspace.getActiveFile();
      if (testFile) {
        await this.handleFileOpen(testFile);
      } else {
        // Create a test event with a dummy file
        const eventLog: EventLog = {
          guid: generateBase32Guid(),
          timestamp: new Date().toISOString(),
          eventType: 'open',
          filePath: 'test-file.md',
          fileName: 'test-file.md',
          vaultName: this.app.vault.getName(),
          hostname: this.getHostname(),
          metadata: {
            lastModified: new Date().toISOString(),
            fileSize: 1024
          }
        };

        await this.logger.logEvent(eventLog);
      }
    } catch (error) {
      console.error('[ObsidianObserver] Error in test logging:', error);
    }
  }
}
