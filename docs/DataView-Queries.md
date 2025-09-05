# DataView Queries for ObsidianObserver

This document contains DataView queries for working with ObsidianObserver events, including proper timezone handling.

## Basic Event Queries

### Recent File Opens (with Local Timezone)
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "MMM dd, yyyy HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Recent File Saves (with Local Timezone)
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "MMM dd, yyyy HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "save"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Recent File Closes (with Local Timezone)
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "MMM dd, yyyy HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "close"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

## Date and Time Formatting Options

### Human-Readable Date Format
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "MMM dd, yyyy HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Date and Time Separated
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, date(OOEvent_LocalTimestamp) as "Date", time(OOEvent_LocalTimestamp) as "Time"
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Relative Time (Time Ago)
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dur(OOEvent_LocalTimestamp, now()) as "Time Ago"
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Custom Date Format
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "yyyy-MM-dd HH:mm:ss")
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Day of Week + Date
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "EEE, MMM dd") as "Day & Date"
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

### Compact Format
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_VaultName, dateformat(OOEvent_LocalTimestamp, "MM/dd HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

## Advanced Queries

### Event Statistics by Type
```dataview
TABLE length(rows) as "Count"
FROM "_debug/events"
GROUP BY OOEvent_Type
SORT Count DESC
```

### Most Active Files
```dataview
TABLE OOEvent_FileName, length(rows) as "Total Events", 
  length(filter(rows, r => r.OOEvent_Type = "open")) as "Opens",
  length(filter(rows, r => r.OOEvent_Type = "save")) as "Saves",
  length(filter(rows, r => r.OOEvent_Type = "close")) as "Closes"
FROM "_debug/events"
GROUP BY OOEvent_FileName
SORT "Total Events" DESC
LIMIT 15
```

### Today's Activity
```dataview
TABLE OOEvent_FileName, OOEvent_Type, dateformat(OOEvent_LocalTimestamp, "HH:mm")
FROM "_debug/events"
WHERE date(OOEvent_LocalTimestamp) = date(today)
SORT OOEvent_Timestamp DESC
```

### This Week's Activity
```dataview
TABLE OOEvent_FileName, OOEvent_Type, dateformat(OOEvent_LocalTimestamp, "MMM dd HH:mm")
FROM "_debug/events"
WHERE date(OOEvent_LocalTimestamp) >= date(today) - dur(7 days)
SORT OOEvent_Timestamp DESC
```

### Daily Activity Summary (Last 30 Days)
```dataview
TABLE date(OOEvent_LocalTimestamp) as "Date", length(rows) as "Events"
FROM "_debug/events"
GROUP BY date(OOEvent_LocalTimestamp)
SORT "Date" DESC
LIMIT 30
```

## Timezone Information

The plugin now stores both UTC and local timezone information:

- **OOEvent_Timestamp**: UTC timestamp (ISO format)
- **OOEvent_LocalTimestamp**: Local timezone timestamp (ISO format)
- **OOEvent_Timezone**: Timezone identifier (e.g., "America/Chicago")

### Query with Timezone Information
```dataview
TABLE OOEvent_Type, OOEvent_FileName, OOEvent_Timezone, dateformat(OOEvent_LocalTimestamp, "MMM dd, yyyy HH:mm")
FROM "_debug/events"
WHERE OOEvent_Type = "open"
SORT OOEvent_Timestamp DESC
LIMIT 10
```

## Date Format Patterns

- `yyyy` - 4-digit year
- `MM` - 2-digit month
- `dd` - 2-digit day
- `HH` - 24-hour format
- `mm` - minutes
- `ss` - seconds
- `EEE` - abbreviated day name (Mon, Tue, etc.)
- `MMM` - abbreviated month name (Jan, Feb, etc.)

## Notes

- Use `OOEvent_LocalTimestamp` for display in your local timezone
- Use `OOEvent_Timestamp` for sorting (UTC is consistent)
- The plugin automatically handles Daylight Saving Time transitions
- All timestamps are stored in ISO format for consistency
