// src/app/files/[id]/LogDetailView.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import React from 'react';

export const JsonBlock = ({ title, jsonString }: { title: string, jsonString: string | null | undefined }) => {
  let content;
  if (jsonString === null || jsonString === undefined || String(jsonString).trim() === '' || String(jsonString).toLowerCase() === 'null') {
    content = <pre className="text-muted-foreground">NULL</pre>;
  } else {
    try {
      const parsed = JSON.parse(jsonString);
      content = <pre className="whitespace-pre-wrap break-all">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch (e) {
      content = <pre className="whitespace-pre-wrap break-all">{jsonString}</pre>;
    }
  }

  return (
    <Card className="flex flex-col h-full rounded-none border-0">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-lg capitalize">{title.replace(/_/g, ' ')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow min-h-0 p-0">
        <ScrollArea className="h-full w-full">
            <div className="p-4 font-mono text-sm border-t h-full">
              {content}
            </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
