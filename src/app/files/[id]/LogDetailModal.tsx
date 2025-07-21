
// src/app/files/[id]/LogDetailModal.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

type LogRow = { [key: string]: any };

interface LogDetailModalProps {
  log: LogRow | null;
  isOpen: boolean;
  onClose: () => void;
}

type Difference = {
  field: string;
  old_value: any;
  new_value: any;
};

const ValueDisplay = ({ value }: { value: any }) => {
    if (value === null || value === undefined) {
        return <Badge variant="secondary">NULL</Badge>;
    }
    if (typeof value === 'object') {
        return <pre className="text-xs bg-muted p-2 rounded-md whitespace-pre-wrap break-all font-mono">{JSON.stringify(value, null, 2)}</pre>;
    }
    if (typeof value === 'boolean') {
        return <Badge variant={value ? "default" : "destructive"}>{String(value)}</Badge>
    }
    if (String(value).trim() === '') {
        return <Badge variant="secondary">EMPTY</Badge>
    }
    return <span className="font-mono text-sm">{String(value)}</span>;
};


export const LogDetailModal = ({ log, isOpen, onClose }: LogDetailModalProps) => {
  const differences = useMemo((): Difference[] => {
    if (!log || !log.difference_list) return [];
    try {
      // It might be a JSON string, or it could already be an object.
      const rawDiffs = typeof log.difference_list === 'string' 
        ? JSON.parse(log.difference_list) 
        : log.difference_list;
      
      if (Array.isArray(rawDiffs)) {
        return rawDiffs;
      }
      return [];
    } catch (error) {
      console.error("Error parsing difference_list:", error);
      return [];
    }
  }, [log]);

  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Log Details</DialogTitle>
          <DialogDescription>
            A detailed view of the changes for the selected log entry.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full pr-6">
                <Table>
                    <TableHeader className="sticky top-0 bg-background">
                        <TableRow>
                        <TableHead className="w-[200px]">Field</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {differences.length > 0 ? (
                            differences.map((diff, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-semibold capitalize align-top">{diff.field.replace(/_/g, ' ')}</TableCell>
                                    <TableCell className="align-top">
                                        <ValueDisplay value={diff.old_value} />
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <ValueDisplay value={diff.new_value} />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                                    No difference list found or it is empty.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
