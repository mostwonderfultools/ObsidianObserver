---
aliases: [ObsidianObserver Main Summary, Events Summary]
tags: [obsidian-explorer, summary, events, main]
type: events-summary
version: "00.00.07_0075"
cssclasses: obsidianObserverEventsTable
---

# ObsidianObserver Events Summary

This file provides comprehensive DataView reports for common use-cases with ObsidianObserver events.

> **Note**: This summary uses the `obsidianObserverEventsTable` CSS class for enhanced table styling. The CSS class is automatically applied to this note.

## Quick Overview

### Recent Activity (Last 20 Events)
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
SORT OOEvent_LocalTimestamp DESC
LIMIT 20
```

### Event Type Distribution
```dataview
TABLE length(rows) as "Count"
FROM "99 - Meta/ObsidianObserver/events"
GROUP BY OOEvent_Type
SORT Count DESC
```

### Most Active Files
```dataviewjs
const ignore = ["ready", "PLUGINLOADED", "QUIT"];

const pages = dv.pages('"99 - Meta/ObsidianObserver/events"')
  .where(p => p.OOEvent_FileName && 
              !ignore.includes(p.OOEvent_Type) && 
              !p.OOEvent_FilePath.includes('99 - Meta/ObsidianObserver'));

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
      File: file.replace(/\.md$/, ""),
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
let html = `
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
`;

for (let row of result) {
  // Create a link to the original note
  const fileLink = `[[${row.File}]]`;
  html += `
    <tr>
      <td style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${fileLink}</td>
      <td style="text-align: right;">${row.Total}</td>
      <td style="text-align: right;">${row.Opens}</td>
      <td style="text-align: right;">${row.Saves}</td>
      <td style="text-align: right;">${row.Closes}</td>
    </tr>
  `;
}

html += `
  </tbody>
</table>
</div>
`;

dv.container.innerHTML = html;
```

## File Operations

### Recent File Opens
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

### Recent File Saves
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "save"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

### Recent File Closes
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "close"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

## File Management

### Recently Created Files
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "create"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

### Recently Deleted Files
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "delete"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

### Recently Renamed Files
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  OOEvent_OldPath AS "Old Path",
  OOEvent_NewPath AS "New Path",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_Type = "rename"
SORT OOEvent_LocalTimestamp DESC
LIMIT 10
```

## Advanced Analysis

### Project-Related Activity
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE contains(OOEvent_FilePath, "Projects")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
```

### People-Related Activity
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE contains(OOEvent_FilePath, "People")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
```

### Meeting-Related Activity
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE contains(OOEvent_FileName, "Meeting")
SORT OOEvent_LocalTimestamp DESC
LIMIT 15
```

## Time-Based Analysis

### Today's Activity
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE date(OOEvent_LocalTimestamp) = date(today)
SORT OOEvent_LocalTimestamp DESC
```

### This Week's Activity
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE date(OOEvent_LocalTimestamp) >= date(today) - dur(7 days)
SORT OOEvent_LocalTimestamp DESC
```

### Daily Activity Summary (Last 30 Days)
```dataview
TABLE date(OOEvent_LocalTimestamp) as "Date", length(rows) as "Events"
FROM "99 - Meta/ObsidianObserver/events"
GROUP BY date(OOEvent_LocalTimestamp)
SORT "Date" DESC
LIMIT 30
```

## File Size Analysis

### Files with Size Information
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  OOEvent_FileSize AS "Size",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_FileSize
SORT OOEvent_FileSize DESC
LIMIT 10
```

## Search and Filter

### Search by File Name
```dataview
TABLE WITHOUT ID
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE contains(OOEvent_FileName, "YOUR_SEARCH_TERM")
SORT OOEvent_LocalTimestamp DESC
```

### Search by GUID
```dataview
TABLE WITHOUT ID
  OOEvent_GUID AS "GUID",
  regexreplace(OOEvent_FileName, ".md$", "") AS "File",
  upper(OOEvent_Type) AS "Type",
  OOEvent_Hostname AS "Host",
  dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss") AS "When"
FROM "99 - Meta/ObsidianObserver/events"
WHERE OOEvent_GUID = "YOUR_GUID_HERE"
```

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
