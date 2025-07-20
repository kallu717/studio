
// src/app/files/[id]/LogComparisonView.tsx
"use client";

import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from '@/components/ui/label';
import { diffJson, type Change } from 'diff';
import { cn } from '@/lib/utils';

type LogRow = { [key: string]: string };

interface LogComparisonViewProps {
  logs: LogRow[];
  headers: string[];
}

const DiffBlock = ({ title, content }: { title: string, content: Change[] }) => {
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <h3 className="text-sm font-semibold mb-2 capitalize">{title}</h3>
      <ScrollArea className="h-full w-full rounded-md border p-2 bg-muted/20">
        <pre className="text-sm whitespace-pre-wrap break-all font-mono">
          {content.map((part, index) => (
            <span
              key={index}
              className={cn({
                'bg-green-500/20 text-green-800 dark:bg-green-500/10 dark:text-green-300': part.added,
                'bg-red-500/20 text-red-800 dark:bg-red-500/10 dark:text-red-300': part.removed,
                'text-muted-foreground': !part.added && !part.removed,
              })}
            >
              {part.value}
            </span>
          ))}
        </pre>
      </ScrollArea>
    </div>
  );
};


export const LogComparisonView = ({ logs, headers }: LogComparisonViewProps) => {
  const [compareColumn, setCompareColumn] = useState(headers.find(h => h === 'payload') || headers[0] || '');

  if (logs.length !== 2) {
    return <div className="text-muted-foreground">Please select exactly two logs to compare.</div>;
  }

  const [logA, logB] = logs;

  const { diffA, diffB } = useMemo(() => {
    const valueA = logA[compareColumn] || '';
    const valueB = logB[compareColumn] || '';
    
    let objA = valueA;
    let objB = valueB;

    try {
        objA = JSON.parse(valueA);
    } catch (e) {
        // Not JSON, will be treated as plain text string object later
    }
     try {
        objB = JSON.parse(valueB);
    } catch (e) {
        // Not JSON, will be treated as plain text string object later
    }

    const diff = diffJson(objA, objB);

    const diffA = diff.filter(part => !part.added);
    const diffB = diff.filter(part => !part.removed);

    return { diffA, diffB };
  }, [compareColumn, logA, logB]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="space-y-2">
        <Label htmlFor="compare-column-select">Column to Compare</Label>
        <Select value={compareColumn} onValueChange={setCompareColumn}>
          <SelectTrigger id="compare-column-select">
            <SelectValue placeholder="Select a column..." />
          </SelectTrigger>
          <SelectContent>
            {headers.map(h => <SelectItem key={h} value={h}>{h.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-grow flex gap-4 min-h-0">
        <DiffBlock title="Selection 1" content={diffA} />
        <DiffBlock title="Selection 2" content={diffB} />
      </div>
    </div>
  );
};
