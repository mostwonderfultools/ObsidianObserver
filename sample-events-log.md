---
aliases: [ObsidianObserver Event Log, Event Log]
tags: [obsidian-explorer, events, log]
type: event-log
---

# ObsidianObserver Event Log

This file contains event logs for note open, close, and save events.

## DataView Query Examples

### Recent Open Events
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE EventType = "OPEN"
SORT Time DESC
LIMIT 10
```

### Recent Save Events
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE EventType = "SAVE"
SORT Time DESC
LIMIT 5
```

### Events in Projects Folder
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE contains(FilePath, "Projects")
SORT Time DESC
```

### Today's Activity
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE date(Time) = date(today)
SORT Time DESC
```

### Most Active Files
```dataview
TABLE length(rows) as "Event Count", FileName, Vault
FROM "_debug/events"
GROUP BY FileName, Vault
SORT length(rows) DESC
LIMIT 10
```

### Recent Activity Summary
```dataview
TABLE EventType, length(rows) as "Count"
FROM "_debug/events"
WHERE date(Time) >= date(today) - dur(7 days)
GROUP BY EventType
SORT length(rows) DESC
```

### File Access Patterns
```dataview
TABLE FileName, 
  length(filter(rows, (r) => r["EventType"] = "OPEN")) as "Opens",
  length(filter(rows, (r) => r["EventType"] = "SAVE")) as "Saves"
FROM "_debug/events"
GROUP BY FileName
SORT length(rows) DESC
LIMIT 20
```

### Events by File Type
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE endsWith(FileName, ".md")
SORT Time DESC
```

### Recent Activity List
```dataview
LIST "**" + EventType + "**: " + FileName + " at " + Time
FROM "_debug/events"
SORT Time DESC
LIMIT 15
```

## Event Log

| EventType | FileName | FilePath | Vault | Time | Modified |
|-----------|----------|----------|-------|------|----------|
| OPEN | Project Planning.md | `Projects/Project Planning.md` | TestSidian-ObsidianObserver | 2024-12-20T23:45:00.000Z | 2024-12-20T23:44:30.000Z |
| SAVE | Project Planning.md | `Projects/Project Planning.md` | TestSidian-ObsidianObserver | 2024-12-20T23:45:15.000Z | 2024-12-20T23:45:15.000Z |
| OPEN | Meeting Notes - Q4 Review.md | `Meetings/Meeting Notes - Q4 Review.md` | TestSidian-ObsidianObserver | 2024-12-20T23:46:00.000Z | 2024-12-20T23:45:45.000Z |
| SAVE | Meeting Notes - Q4 Review.md | `Meetings/Meeting Notes - Q4 Review.md` | TestSidian-ObsidianObserver | 2024-12-20T23:46:30.000Z | 2024-12-20T23:46:30.000Z |
| OPEN | John Smith.md | `People/John Smith.md` | TestSidian-ObsidianObserver | 2024-12-20T23:47:00.000Z | 2024-12-20T23:46:15.000Z |
| SAVE | John Smith.md | `People/John Smith.md` | TestSidian-ObsidianObserver | 2024-12-20T23:47:45.000Z | 2024-12-20T23:47:45.000Z |
| OPEN | API Documentation.md | `Projects/API Documentation.md` | TestSidian-ObsidianObserver | 2024-12-20T23:48:00.000Z | 2024-12-20T23:47:30.000Z |
| SAVE | API Documentation.md | `Projects/API Documentation.md` | TestSidian-ObsidianObserver | 2024-12-20T23:48:20.000Z | 2024-12-20T23:48:20.000Z |
| OPEN | Daily Standup.md | `Meetings/Daily Standup.md` | TestSidian-ObsidianObserver | 2024-12-20T23:49:00.000Z | 2024-12-20T23:48:45.000Z |
| SAVE | Daily Standup.md | `Meetings/Daily Standup.md` | TestSidian-ObsidianObserver | 2024-12-20T23:49:30.000Z | 2024-12-20T23:49:30.000Z |
| OPEN | Sarah Johnson.md | `People/Sarah Johnson.md` | TestSidian-ObsidianObserver | 2024-12-20T23:50:00.000Z | 2024-12-20T23:49:15.000Z |
| SAVE | Sarah Johnson.md | `People/Sarah Johnson.md` | TestSidian-ObsidianObserver | 2024-12-20T23:50:45.000Z | 2024-12-20T23:50:45.000Z |
| OPEN | Budget Planning.md | `Projects/Budget Planning.md` | TestSidian-ObsidianObserver | 2024-12-20T23:51:00.000Z | 2024-12-20T23:50:30.000Z |
| SAVE | Budget Planning.md | `Projects/Budget Planning.md` | TestSidian-ObsidianObserver | 2024-12-20T23:51:20.000Z | 2024-12-20T23:51:20.000Z |
| OPEN | Team Retrospective.md | `Meetings/Team Retrospective.md` | TestSidian-ObsidianObserver | 2024-12-20T23:52:00.000Z | 2024-12-20T23:51:45.000Z |
| SAVE | Team Retrospective.md | `Meetings/Team Retrospective.md` | TestSidian-ObsidianObserver | 2024-12-20T23:52:30.000Z | 2024-12-20T23:52:30.000Z |
| OPEN | Mike Davis.md | `People/Mike Davis.md` | TestSidian-ObsidianObserver | 2024-12-20T23:53:00.000Z | 2024-12-20T23:52:15.000Z |
| SAVE | Mike Davis.md | `People/Mike Davis.md` | TestSidian-ObsidianObserver | 2024-12-20T23:53:45.000Z | 2024-12-20T23:53:45.000Z |
| OPEN | User Research.md | `Projects/User Research.md` | TestSidian-ObsidianObserver | 2024-12-20T23:54:00.000Z | 2024-12-20T23:53:30.000Z |
| SAVE | User Research.md | `Projects/User Research.md` | TestSidian-ObsidianObserver | 2024-12-20T23:54:20.000Z | 2024-12-20T23:54:20.000Z |

## Usage Notes

### Event Types
- **OPEN**: File was opened in Obsidian
- **SAVE**: File was saved/modified
- **CLOSE**: File was closed (when active file changes)

### DataView Integration
This log file is designed to work seamlessly with the DataView plugin. The table format allows you to:
- Query events by type, file, or time
- Filter by specific folders or file patterns
- Generate activity summaries and reports
- Track usage patterns over time

### File Structure
The log file is automatically maintained by the ObsidianObserver plugin and includes:
- YAML frontmatter for metadata and tagging
- DataView query examples for common use cases
- A structured table of all events with DataView-compatible column names
- Automatic appending of new events to the end of the table

### Column Names
The table uses DataView-compatible column names without spaces:
- **EventType**: OPEN, SAVE, CLOSE
- **FileName**: The name of the file
- **FilePath**: The full path to the file (in code formatting)
- **Vault**: The vault name
- **Time**: The timestamp of the event
- **Modified**: The last modified time (if available)

### Custom Queries
You can create your own DataView queries to:
- Find files that haven't been accessed recently
- Track activity in specific project folders
- Monitor meeting note updates
- Analyze team member file access patterns
- Generate activity reports for different time periods
- Identify most and least active files
- Track file modification patterns

### Advanced Query Examples

**Find files opened but not saved recently:**
```dataview
TABLE FileName, Vault
FROM "_debug/events"
WHERE EventType = "OPEN"
AND !contains(
  filter(rows, (r) => r["FileName"] = this["FileName"] AND r["EventType"] = "SAVE"),
  this
)
SORT Time DESC
```

**Activity in the last 24 hours:**
```dataview
TABLE EventType, FileName, Vault, Time
FROM "_debug/events"
WHERE date(Time) >= date(today) - dur(1 day)
SORT Time DESC
```

**Files with most save events:**
```dataview
TABLE length(rows) as "Save Count", FileName, Vault
FROM "_debug/events"
WHERE EventType = "SAVE"
GROUP BY FileName, Vault
SORT length(rows) DESC
LIMIT 10
```
