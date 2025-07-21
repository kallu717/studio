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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronsUpDown, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonPayloadViewer } from './JsonPayloadViewer';

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
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>('');
  const [detailColumns, setDetailColumns] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Set default columns on mount
  useEffect(() => {
    const commonDateColumns = ['created_timestamp', 'updated_at', 'timestamp', 'date'];
    const defaultDateCol = headers.find(h => commonDateColumns.includes(h.toLowerCase())) || headers[0] || '';
    setDateColumn(defaultDateCol);

    const commonIdColumns = ['uuid', 'id', 'entity_id'];
    const defaultIdCol = headers.find(h => commonIdColumns.includes(h.toLowerCase())) || headers[0] || '';
    setIdentifierColumn(defaultIdCol);

    // Set a default detail column if available
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
    return Array.from(ids);
  }, [logs, identifierColumn]);
  
  const timelineLogs = useMemo(() => {
    if (!selectedIdentifier || !dateColumn) return [];

    return logs
      .filter(log => log[identifierColumn] === selectedIdentifier)
      .sort((a, b) => {
        const dateA = new Date(a[dateColumn] || 0).getTime();
        const dateB = new Date(b[dateColumn] || 0).getTime();
        if (sortOrder === 'asc') {
          return dateA - dateB;
        }
        return dateB - dateA;
      });
  }, [logs, selectedIdentifier, dateColumn, identifierColumn, sortOrder]);

  const handleIdentifierChange = (value: string) => {
      setIdentifierColumn(value);
      setSelectedIdentifier(''); // Reset selected ID when column changes
  }
  
  const isJsonLike = (value: string | null | undefined): boolean => {
      if (!value) return false;
      const trimmed = value.trim();
      return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 gap-6 bg-background">
      <div className="flex-shrink-0">
        <h2 className="text-2xl font-bold">Timeline View</h2>
        <p className="text-muted-foreground">Visualize your data over time for a specific item.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <div className="space-y-2">
          <Label htmlFor="identifier-column">Identifier Column</Label>
          <Select value={identifierColumn} onValueChange={handleIdentifierChange}>
            <SelectTrigger id="identifier-column"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>{headers.map(h => <SelectItem key={`id-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="identifier-value">Identifier Value</Label>
          <Select value={selectedIdentifier} onValueChange={setSelectedIdentifier} disabled={!identifierColumn}>
            <SelectTrigger id="identifier-value"><SelectValue placeholder="Select value..." /></SelectTrigger>
            <SelectContent>
              {uniqueIdentifiers.map(id => <SelectItem key={`val-${id}`} value={id}>{id}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date-column">Date Column</Label>
          <Select value={dateColumn} onValueChange={setDateColumn}>
            <SelectTrigger id="date-column"><SelectValue placeholder="Select column..." /></SelectTrigger>
            <SelectContent>{headers.map(h => <SelectItem key={`date-${h}`} value={h}>{h}</SelectItem>)}</SelectContent>
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
                                        onSelect={() => {
                                            if (isSelected) {
                                                setDetailColumns(detailColumns.filter((h) => h !== header));
                                            } else {
                                                setDetailColumns([...detailColumns, header]);
                                            }
                                        }}
                                    >
                                    <div className={cn( "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                        <CheckIcon className="h-4 w-4" />
                                    </div>
                                    <span>{header}</span>
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
          {timelineLogs.length > 0 ? (
            <div className="relative pl-6">
              {/* The vertical line */}
              <div className="absolute left-6 top-0 h-full w-0.5 bg-border -translate-x-1/2" />
              
              <div className="space-y-8">
                {timelineLogs.map((log, index) => (
                  <div key={index} className="relative">
                    <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background -translate-x-[calc(50%_+_1rem)]" />
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
                                {isJsonLike(log[col]) ? (
                                    <JsonPayloadViewer jsonString={log[col]} />
                                ) : (
                                    <span className="font-mono text-foreground break-all">{log[col] || <span className="text-muted-foreground/60">NULL</span>}</span>
                                )}
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
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p>No timeline to display.</p>
                <p className="text-xs">
                  { !selectedIdentifier ? "Please select an identifier to see its history." : "No logs found for the selected identifier."}
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
