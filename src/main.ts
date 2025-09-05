import { Plugin, Notice, PluginSettingTab, Setting, App } from 'obsidian';
import { EventLogger } from './logger';
import { EventHandlers } from './eventHandlers';
import { LoggerConfig, PluginSettings } from './types';

export const DEFAULT_SETTINGS: PluginSettings = {
  eventsFolder: 'ObsidianObserver',
  enableConsoleLog: true
};

export default class ObsidianObserverPlugin extends Plugin {
  private logger!: EventLogger;
  private eventHandlers!: EventHandlers;
  public settings: PluginSettings;

  constructor(app: any, manifest: any) {
    super(app, manifest);
    this.settings = { ...DEFAULT_SETTINGS };
  }

  async onload() {
    console.log('[ObsidianObserver] Loading plugin...');

    try {
      // Load settings
      await this.loadSettings();

      // Initialize logger configuration from settings
      const loggerConfig: LoggerConfig = {
        eventsFolder: this.settings.eventsFolder,
        enableConsoleLog: this.settings.enableConsoleLog
      };

      // Create logger instance
      this.logger = new EventLogger(this.app, loggerConfig, this.manifest.version);

      // Ensure events directory exists
      await this.logger.ensureEventsDirectoryExists();

      // Create summary note for DataView queries
      await this.logger.createSummaryNote();

      // Create main summary file in configured directory
      await this.logger.createMainSummaryNote();

      // Create event handlers
      this.eventHandlers = new EventHandlers(this.app, this.logger);

      // Register event handlers
      this.eventHandlers.registerEventHandlers();

      // Register application quit detection events
      this.registerQuitDetectionEvents();

      // Add settings tab
      this.addSettingTab(new ObsidianObserverSettingTab(this.app, this));

      // Add ribbon icon for manual testing
      this.addRibbonIcon('bug', 'Test ObsidianObserver Logging', async () => {
        await this.eventHandlers.testLogging();
        // Refresh the file explorer to show any new files
        this.app.workspace.trigger('file-explorer:refresh');
        new Notice('Test event note created!');
      });

      // Add command palette command for manual buffer flush
      this.addCommand({
        id: 'flush-obsidian-observer-buffer',
        name: 'Flush ObsidianObserver Buffer',
        callback: async () => {
          await this.logger.flushBuffer();
          // Refresh the file explorer to show any new files
          this.app.workspace.trigger('file-explorer:refresh');
          new Notice('Buffer flushed to event notes!');
        }
      });

      // Add command palette command for refreshing summary file
      this.addCommand({
        id: 'obsidian-observer-refresh-summary',
        name: 'ObsidianObserver: Refresh Summary',
        callback: async () => {
          await this.logger.refreshMainSummaryNote();
          // Refresh the file explorer to show any updated files
          this.app.workspace.trigger('file-explorer:refresh');
          new Notice('Events summary refreshed!');
        }
      });

      // Add command palette command for debugging hostname
      this.addCommand({
        id: 'obsidian-observer-debug-hostname',
        name: 'ObsidianObserver: Debug Hostname',
        callback: () => {
          const hostname = this.getHostname();
          console.log('[ObsidianObserver] Debug - Final hostname result:', hostname);
          new Notice(`Hostname: ${hostname}`);
        }
      });

      // Add ribbon icon for creating summary note
      this.addRibbonIcon('file-text', 'Create Events Summary', async () => {
        await this.logger.createSummaryNote();
        // Refresh the file explorer to show any new files
        this.app.workspace.trigger('file-explorer:refresh');
        new Notice('Events summary created!');
      });

      // Log PluginLoaded event after successful initialization
      const { generateBase32Guid } = await import('./utils');
      const pluginLoadedEvent = {
        guid: generateBase32Guid(),
        timestamp: new Date().toISOString(),
        eventType: 'PluginLoaded' as const,
        filePath: '',
        fileName: '',
        vaultName: this.app.vault.getName(),
        hostname: this.getHostname(),
        metadata: {
          lastModified: new Date().toISOString(),
          pluginVersion: this.manifest.version
        }
      };
      await this.logger.logEvent(pluginLoadedEvent);

      console.log('[ObsidianObserver] Plugin loaded successfully');
    } catch (error) {
      console.error('[ObsidianObserver] Error loading plugin:', error);
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async updateSettings(updates: Partial<PluginSettings>) {
    Object.assign(this.settings, updates);
    await this.saveSettings();
    
    // Update logger configuration with new settings
    await this.updateLoggerConfiguration();
  }

  private async updateLoggerConfiguration() {
    if (!this.logger) return;
    
    // Create new logger configuration from updated settings
    const newLoggerConfig: LoggerConfig = {
      eventsFolder: this.settings.eventsFolder,
      enableConsoleLog: this.settings.enableConsoleLog
    };
    
    // Update the logger's configuration
    this.logger.updateConfig(newLoggerConfig);
    
    // Update event handlers with new configuration
    if (this.eventHandlers) {
      this.eventHandlers.updateLoggerConfig(newLoggerConfig);
    }
    
    // Ensure the new events directory exists
    await this.logger.ensureEventsDirectoryExists();
    
    // Refresh the file explorer to show the new directory
    this.app.workspace.trigger('file-explorer:refresh');
    
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

  private registerQuitDetectionEvents() {
    // Use Obsidian's proper event registration methods for reliable cleanup
    
    // Listen for window beforeunload event using registerDomEvent
    this.registerDomEvent(window, 'beforeunload', async (event: BeforeUnloadEvent) => {
      console.log('[ObsidianObserver] Application quitting detected via beforeunload...');
      
      try {
        // Log quit event
        if (this.logger) {
          const { generateBase32Guid } = await import('./utils');
          const eventLog = {
            guid: generateBase32Guid(),
            timestamp: new Date().toISOString(),
            eventType: 'quit' as const,
            filePath: '',
            fileName: '',
            vaultName: this.app.vault.getName(),
            hostname: this.getHostname(),
            metadata: {
              lastModified: new Date().toISOString(),
              quitMethod: 'beforeunload'
            }
          };
          
          // Log the event and force flush immediately
          await this.logger.logEvent(eventLog);
          await this.logger.flushBuffer();
        }
      } catch (error) {
        console.error('[ObsidianObserver] Error logging quit event:', error);
      }
    });

    // Listen for Obsidian workspace close events
    this.registerEvent(
      this.app.workspace.on('quit', async () => {
        console.log('[ObsidianObserver] Workspace quit event detected...');
        
        try {
          if (this.logger) {
            const { generateBase32Guid } = await import('./utils');
            const eventLog = {
              guid: generateBase32Guid(),
              timestamp: new Date().toISOString(),
              eventType: 'quit' as const,
              filePath: '',
              fileName: '',
              vaultName: this.app.vault.getName(),
              hostname: this.getHostname(),
              metadata: {
                lastModified: new Date().toISOString(),
                quitMethod: 'workspace-quit'
              }
            };
            
            await this.logger.logEvent(eventLog);
            await this.logger.flushBuffer();
          }
        } catch (error) {
          console.error('[ObsidianObserver] Error logging workspace quit event:', error);
        }
      })
    );
  }

  async onunload() {
    console.log('[ObsidianObserver] Unloading plugin...');

    try {
      // Unregister event handlers
      if (this.eventHandlers) {
        this.eventHandlers.unregisterEventHandlers();
      }

      // Flush any remaining log entries
      if (this.logger) {
        await this.logger.flushBuffer();
      }

      console.log('[ObsidianObserver] Plugin unloaded successfully');
    } catch (error) {
      console.error('[ObsidianObserver] Error unloading plugin:', error);
    }
  }
}

class ObsidianObserverSettingTab extends PluginSettingTab {
  plugin: ObsidianObserverPlugin;

  constructor(app: App, plugin: ObsidianObserverPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'ObsidianObserver Settings' });

    // Plugin Version Display (Read-only)
    new Setting(containerEl)
      .setName('Plugin Version')
      .setDesc(`Current version: ${this.plugin.manifest.version}`)
      .addText(text => text
        .setValue(this.plugin.manifest.version)
        .setDisabled(true));

    // Events Folder Setting
    new Setting(containerEl)
      .setName('Events Folder')
      .setDesc('The base folder where ObsidianObserver will create its structure. Events will be stored in EventsFolder/events and EventSummary.md will be created automatically.')
      .addText(text => text
        .setPlaceholder('ObsidianObserver')
        .setValue(this.plugin.settings.eventsFolder)
        .onChange(async (value) => {
          await this.plugin.updateSettings({ eventsFolder: value });
        }));

    // Enable Console Log Setting
    new Setting(containerEl)
      .setName('Enable Console Logging')
      .setDesc('Log events to the browser console for debugging.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableConsoleLog)
        .onChange(async (value) => {
          await this.plugin.updateSettings({ enableConsoleLog: value });
        }));

    // Reset to Defaults Button
    new Setting(containerEl)
      .setName('Reset to Defaults')
      .setDesc('Reset all settings to their default values.')
      .addButton(button => button
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings = { ...DEFAULT_SETTINGS };
          await this.plugin.saveSettings();
          this.display(); // Refresh the settings display
        }));
  }
}
