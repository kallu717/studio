// src/app/files/[id]/TimelineView.tsx
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronsUpDown, Check, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonPayloadViewer } from './JsonPayloadViewer';
import { DifferenceListViewer } from './DifferenceListViewer';

type LogRow = { [key: string]: string };

interface TimelineViewProps {
  logs: LogRow[];
  headers: string[];
}

// Helper to format date strings robustly
const formatDate = (dateString: string | undefined) => {
  if (!dateString) return "Invalid Date";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

export function TimelineView({ logs, headers }: TimelineViewProps) {
  const [dateColumn, setDateColumn] = useState<string>('');
  const [identifierColumn, setIdentifierColumn] = useState<string>('');
  const [selectedIdentifiers, setSelectedIdentifiers] = useState<string[]>([]);
  const [detailColumns, setDetailColumns] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Set default columns on mount
  useEffect(() => {
    const commonDateColumns = ['created_timestamp', 'updated_at', 'timestamp', 'date'];
    const defaultDateCol = headers.find(h => commonDateColumns.includes(h.toLowerCase())) || headers[0] || '';
    setDateColumn(defaultDateCol);

    const commonIdColumns = ['uuid', 'id', 'entity_id', 'entity_name'];
    const defaultIdCol = headers.find(h => commonIdColumns.includes(h.toLowerCase())) || headers[0] || '';
    setIdentifierColumn(defaultIdCol);

    if (headers.length > 1) {
        const defaultDetailCols = headers.filter(h => h !== defaultDateCol && h !== defaultIdCol);
        setDetailColumns(defaultDetailCols.length > 0 ? [defaultDetailCols[0]] : [headers[0]]);
    } else if (headers.length > 0) {
        setDetailColumns([headers[0]]);
    }
  }, [headers]);

  const uniqueIdentifiers = useMemo(() => {
    if (!identifierColumn) return [];
    const ids = new Set(logs.map(log => log[identifierColumn]).filter(Boolean));
    return Array.from(ids).sort();
  }, [logs, identifierColumn]);
  
  const groupedTimelineLogs = useMemo(() => {
    if (selectedIdentifiers.length === 0 || !dateColumn) return {};

    const filtered = logs.filter(log => selectedIdentifiers.includes(log[identifierColumn]));
    
    const sorted = filtered.sort((a, b) => {
        const dateA = new Date(a[dateColumn] || 0).getTime();
        const dateB = new Date(b[dateColumn] || 0).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

    return sorted.reduce((acc, log) => {
        const id = log[identifierColumn];
        if (!acc[id]) {
            acc[id] = [];
        }
        acc[id].push(log);
        return acc;
    }, {} as Record<string, LogRow[]>);

  }, [logs, selectedIdentifiers, dateColumn, identifierColumn, sortOrder]);


  const handleIdentifierChange = (value: string) => {
      setIdentifierColumn(value);
      setSelectedIdentifiers([]); // Reset selected IDs when column changes
  }
  
  const handleIdentifierValueSelect = (id: string) => {
    setSelectedIdentifiers(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        return Array.from(newSelected);
    });
  };
  
  const handleSelectAllIdentifiers = () => {
    if (selectedIdentifiers.length === uniqueIdentifiers.length) {
      setSelectedIdentifiers([]); // Deselect all
    } else {
      setSelectedIdentifiers(uniqueIdentifiers); // Select all
    }
  };

  const isJsonLike = (value: string | null | undefined): boolean => {
      if (!value) return false;
      const trimmed = value.trim();
      return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }
  
  const handleDetailColumnSelect = (header: string) => {
    setDetailColumns(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(header)) {
            newSelected.delete(header);
        } else {
            newSelected.add(header);
        }
        return Array.from(newSelected);
    });
  };

  const renderDetailValue = (col: string, value: string) => {
    if (col === 'difference_list') {
      return <DifferenceListViewer jsonString={value} />;
    }
    if (isJsonLike(value)) {
      return <JsonPayloadViewer jsonString={value} />;
    }
    return <span className="font-mono text-foreground break-all">{value || <span className="text-muted-foreground/60">NULL</span>}</span>;
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-6 bg-background">
      <div className="flex-shrink-0">
        
        <p className="text-muted-foreground">Visualize your data over time for one or more items.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <div className="space-y-2">
          <Label htmlFor="identifier-column">Identifier Column</Label>
          <Select value={identifierColumn} onValueChange={handleIdentifierChange}>
            <SelectTrigger id="identifier-column"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>{headers.map(h => <SelectItem key={`id-${h}`} value={h}>{h.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
            <Label>Identifier Value(s)</Label>
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal" disabled={!identifierColumn}>
                    {selectedIdentifiers.length > 0 ? `${selectedIdentifiers.length} of ${uniqueIdentifiers.length} selected` : "Select value(s)..."}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search values..." />
                        <CommandList>
                           <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {uniqueIdentifiers.length > 1 && (
                                    <CommandItem
                                        onSelect={handleSelectAllIdentifiers}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={selectedIdentifiers.length === uniqueIdentifiers.length}
                                                readOnly
                                                className="h-4 w-4"
                                            />
                                            <span className="font-semibold">
                                                {selectedIdentifiers.length === uniqueIdentifiers.length ? "Deselect All" : "Select All"}
                                            </span>
                                        </div>
                                    </CommandItem>
                                )}
                                {uniqueIdentifiers.map((id) => {
                                const isSelected = selectedIdentifiers.includes(id);
                                return (
                                    <CommandItem
                                        key={id}
                                        onSelect={() => handleIdentifierValueSelect(id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={isSelected}
                                                readOnly
                                                className="h-4 w-4"
                                            />
                                            <span>{id}</span>
                                        </div>
                                    </CommandItem>
                                );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date-column">Date Column</Label>
          <Select value={dateColumn} onValueChange={setDateColumn}>
            <SelectTrigger id="date-column"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>{headers.map(h => <SelectItem key={`date-${h}`} value={h}>{h.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort-order">Sort Order</Label>
          <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'asc' | 'desc')}>
            <SelectTrigger id="sort-order"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Ascending (Oldest First)</SelectItem>
              <SelectItem value="desc">Descending (Newest First)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 lg:col-span-4">
            <Label>Detail Columns</Label>
            <Popover>
                <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                    {detailColumns.length > 0 ? `${detailColumns.length} selected` : "Select columns..."}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                        <CommandInput placeholder="Search columns..." />
                        <CommandList>
                           <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {headers.map((header) => {
                                const isSelected = detailColumns.includes(header);
                                return (
                                    <CommandItem
                                        key={header}
                                        onSelect={() => handleDetailColumnSelect(header)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                checked={isSelected}
                                                readOnly
                                                className="h-4 w-4"
                                            />
                                            <span className="flex-grow">
                                                {header.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </CommandItem>
                                );
                                })}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className="flex-grow min-h-0 border-t pt-6">
        <ScrollArea className="h-full pr-4">
          {Object.keys(groupedTimelineLogs).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedTimelineLogs).map(([identifier, logs]) => (
                <div key={identifier}>
                    <h2 className="text-lg font-semibold mb-4 text-primary">{identifier}</h2>
                    <div className="relative pl-6 border-l">
                        {logs.map((log, index) => (
                            <div key={index} className="relative mb-8">
                                <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background -translate-x-[calc(50%_+_1px)]" />
                                <Card>
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">{formatDate(log[dateColumn])}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                                    {detailColumns.map(col => (
                                        <div key={col} className="flex flex-col">
                                        <dt className="font-medium text-muted-foreground capitalize">{col.replace(/_/g, ' ')}</dt>
                                        <dd className="mt-1">
                                            {renderDetailValue(col, log[col])}
                                        </dd>
                                        </div>
                                    ))}
                                    </dl>
                                </CardContent>
                                </Card>
                            </div>
                        ))}
                    </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>No timeline to display.</p>
                <p className="text-xs">
                  { selectedIdentifiers.length === 0 ? "Please select one or more identifier values." : "No logs found for the selected identifiers."}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
