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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";

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

type EntityData = {
    entity_id: string;
    differences: Difference[];
};

const ValueDisplay = ({ value, isNew = false }: { value: any, isNew?: boolean }) => {
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
    return <span className={`font-mono text-sm ${isNew ? 'font-semibold text-primary' : ''}`}>{String(value)}</span>;
};


export const LogDetailModal = ({ log, isOpen, onClose }: LogDetailModalProps) => {
  const entities = useMemo((): EntityData[] => {
    if (!log) return [];

    const action = log.action?.toLowerCase();

    try {
      if (action === 'create') {
        const payload = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
        const payloadArray = Array.isArray(payload) ? payload : [payload];
        
        return payloadArray.map((entity: any, index: number) => ({
            entity_id: entity.uuid || entity.id || `New Entity ${index + 1}`,
            differences: Object.keys(entity).map(key => ({
                field: key,
                old_value: null,
                new_value: entity[key]
            }))
        }));

      } else { // Handles 'update', 'delete', and others
        const diffListRaw = typeof log.difference_list === 'string' 
            ? (log.difference_list.trim() === '' || log.difference_list.toUpperCase() === 'NULL' ? [] : JSON.parse(log.difference_list))
            : log.difference_list;

        if (!Array.isArray(diffListRaw) || diffListRaw.length === 0) return [];
        
        const transformedDifferences: Difference[] = diffListRaw.map(diff => ({
            field: diff.field,
            old_value: diff.oldValue, // Map from oldValue
            new_value: diff.newValue  // Map from newValue
        }));

        return [{
            entity_id: log.uuid || log.entity_id || "Changed Entity",
            differences: transformedDifferences
        }];
      }
    } catch (error) {
      console.error("Error parsing log data:", error);
      return [];
    }
  }, [log]);

  if (!log) return null;
  
  const actionDisplay = log.action ? log.action.charAt(0).toUpperCase() + log.action.slice(1) : 'Log';


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{actionDisplay} Details</DialogTitle>
          <DialogDescription>
            A detailed breakdown of the changes for the selected log entry.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow min-h-0">
            <ScrollArea className="h-full pr-4">
                {entities.length > 0 ? (
                     <Accordion type="multiple" defaultValue={entities.length === 1 ? [entities[0].entity_id] : []} className="w-full">
                        {entities.map((entity) => (
                             <AccordionItem value={entity.entity_id} key={entity.entity_id}>
                                <AccordionTrigger>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline">{log.action?.toUpperCase()}</Badge>
                                        <span className="font-semibold">{entity.entity_id}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Field</TableHead>
                                                <TableHead>Value Change (Old → New)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {entity.differences.map((diff, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-semibold capitalize align-top">{diff.field.replace(/_/g, ' ')}</TableCell>
                                                <TableCell className="align-top">
                                                    <div className="flex items-center gap-2">
                                                        <ValueDisplay value={diff.old_value} />
                                                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                        <ValueDisplay value={diff.new_value} isNew={true} />
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        No changes found to display.
                    </div>
                )}
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
