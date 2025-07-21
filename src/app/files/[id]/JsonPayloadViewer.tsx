// src/app/files/[id]/JsonPayloadViewer.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface JsonPayloadViewerProps {
  jsonString: string | null | undefined;
}

const MAX_INITIAL_FIELDS = 6;

const renderValue = (value: any, level: number): React.ReactNode => {
    if (value === null) {
        return <span className="text-muted-foreground/80">null</span>;
    }
    if (typeof value === 'object') {
        return <JsonObjectViewer data={value} level={level + 1} />;
    }
    if (typeof value === 'boolean') {
        return <span className={cn("font-semibold", value ? 'text-green-600' : 'text-red-600')}>{String(value)}</span>
    }
    if (typeof value === 'string' && value.trim() === '') {
        return <span className="text-muted-foreground/80 italic">empty string</span>
    }
    return <span className="text-foreground break-all">{String(value)}</span>;
};

const JsonObjectViewer = ({ data, level }: { data: object | any[], level: number }) => {
    const isArray = Array.isArray(data);
    const entries = Object.entries(data);

    return (
        <div className={cn("pl-4 border-l border-border/50", level > 0 ? "mt-1" : "")}>
            {entries.map(([key, value], index) => (
                <div key={key} className="flex text-sm">
                    <span className="font-semibold text-muted-foreground pr-2 shrink-0">{isArray ? `${index}:` : `${key}:`}</span>
                    <div className="min-w-0">{renderValue(value, level)}</div>
                </div>
            ))}
        </div>
    );
};


export const JsonPayloadViewer = ({ jsonString }: JsonPayloadViewerProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    let parsedJson: object | null = null;
    let isJson = false;
    let error = null;

    if (jsonString && typeof jsonString === 'string' && jsonString.trim().startsWith('{') || jsonString.trim().startsWith('[')) {
        try {
            parsedJson = JSON.parse(jsonString);
            isJson = true;
        } catch (e) {
            error = "Invalid JSON format.";
        }
    }
    
    if (!isJson) {
        return <pre className="font-mono text-sm whitespace-pre-wrap break-all">{jsonString || <span className="text-muted-foreground/60">NULL</span>}</pre>;
    }
    
    if (error || !parsedJson) {
         return <pre className="font-mono text-sm text-destructive-foreground">{error}</pre>
    }

    const entries = Object.entries(parsedJson);
    const canCollapse = entries.length > MAX_INITIAL_FIELDS;
    const displayedEntries = isExpanded ? entries : entries.slice(0, MAX_INITIAL_FIELDS);

    return (
        <div className="font-mono text-sm">
            {displayedEntries.map(([key, value]) => (
                <div key={key} className="flex">
                    <span className="font-semibold text-muted-foreground pr-2 shrink-0">{key}:</span>
                    <div className="min-w-0">{renderValue(value, 0)}</div>
                </div>
            ))}
            {canCollapse && (
                <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? 'Show Less' : `Show ${entries.length - MAX_INITIAL_FIELDS} More...`}
                </Button>
            )}
        </div>
    );
};
