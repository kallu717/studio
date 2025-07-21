// src/app/files/[id]/DifferenceListViewer.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

type Difference = {
  field: string;
  label?: string;
  oldValue: any;
  newValue: any;
};

interface DifferenceListViewerProps {
  jsonString: string | null | undefined;
}

const ValueDisplay = ({ value }: { value: any }) => {
    if (value === null || value === undefined) {
        return <Badge variant="secondary" className="font-normal">NULL</Badge>;
    }
    if (typeof value === 'boolean') {
        return <Badge variant={value ? "default" : "destructive"}>{String(value)}</Badge>
    }
    if (String(value).trim() === '') {
        return <Badge variant="secondary" className="font-normal">EMPTY</Badge>
    }
    return <span className="font-mono text-xs">{String(value)}</span>;
};


export const DifferenceListViewer = ({ jsonString }: DifferenceListViewerProps) => {
  let differences: Difference[] = [];
  let error = null;

  if (jsonString && typeof jsonString === 'string') {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        differences = parsed;
      } else {
        error = "Data is not an array of differences.";
      }
    } catch (e) {
      error = "Invalid JSON format.";
    }
  }

  if (error) {
    return <div className="text-destructive text-xs font-mono">{error}</div>;
  }
  
  if (differences.length === 0) {
    return <div className="text-muted-foreground text-xs font-mono">No differences recorded.</div>
  }

  return (
    <div className="my-2 rounded-md border">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="h-8">Field</TableHead>
                    <TableHead className="h-8">Old Value</TableHead>
                    <TableHead className="h-8"></TableHead>
                    <TableHead className="h-8">New Value</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {differences.map((diff, index) => (
                    <TableRow key={index}>
                        <TableCell className="py-1.5 font-semibold capitalize">{diff.label || diff.field.replace(/_/g, ' ')}</TableCell>
                        <TableCell className="py-1.5"><ValueDisplay value={diff.oldValue} /></TableCell>
                        <TableCell className="py-1.5 px-0 w-8 text-center"><ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" /></TableCell>
                        <TableCell className="py-1.5"><ValueDisplay value={diff.newValue} /></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
};
