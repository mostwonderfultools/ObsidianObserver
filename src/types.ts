export interface EventLog {
  guid: string; // Base32 GUID for unique identification
  timestamp: string;
  eventType: 'open' | 'save' | 'quit' | 'ready' | 'rename' | 'delete' | 'PluginLoaded';
  filePath: string;
  fileName: string;
  vaultName: string;
  hostname: string; // Hostname of the machine where the event occurred
  metadata?: {
    lastModified?: string;
    fileSize?: number;
    oldPath?: string;
    newPath?: string;
    sourcePath?: string;
    targetPath?: string;
  };
}

export interface EventFrontmatter {
  OOEvent_GUID: string;
  OOEvent_Timestamp: string;
  OOEvent_LocalTimestamp?: string;
  OOEvent_Timezone?: string;
  OOEvent_Type: 'open' | 'save' | 'quit' | 'ready' | 'rename' | 'delete' | 'PluginLoaded';
  OOEvent_FilePath: string;
  OOEvent_FileName: string;
  OOEvent_VaultName: string;
  OOEvent_Hostname: string; // Hostname of the machine where the event occurred
  OOEvent_LastModified?: string;
  OOEvent_Created: string;
  OOEvent_OldPath?: string;
  OOEvent_NewPath?: string;
  OOEvent_SourcePath?: string;
  OOEvent_TargetPath?: string;
  OOEvent_PluginVersion?: string;
}

export interface LoggerConfig {
  eventsFolder: string; // The base folder where ObsidianObserver will create its structure
  enableConsoleLog: boolean;
}

export interface PluginSettings {
  eventsFolder: string;
  enableConsoleLog: boolean;
}

export interface ObsidianObserverSettings {
  enableLogging: boolean;
  eventsDirectory: string; // Changed from logFilePath to eventsDirectory
  includeFileMetadata: boolean;
  includeFrontmatter: boolean;
  maxLogEntries: number;
  enableConsoleOutput: boolean;
}
