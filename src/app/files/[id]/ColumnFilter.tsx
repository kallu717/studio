
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export type FilterState = {
  value: string;
  type: 'contains' | 'equals';
};

interface ColumnFilterProps {
  header: string;
  filter: FilterState | undefined;
  setFilter: (header: string, filter: FilterState | undefined) => void;
}

export function ColumnFilter({ header, filter, setFilter }: ColumnFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'contains' | 'equals'>(filter?.type || 'contains');
  const [filterValue, setFilterValue] = useState(filter?.value || "");

  useEffect(() => {
    if (isOpen) {
      setFilterType(filter?.type || 'contains');
      setFilterValue(filter?.value || "");
    }
  }, [isOpen, filter]);

  const handleApply = () => {
    if (filterValue.trim() === "") {
        setFilter(header, undefined); // Clear filter if input is empty
    } else {
        setFilter(header, { value: filterValue, type: filterType });
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setFilter(header, undefined);
    setIsOpen(false);
  };
  
  const hasFilter = !!filter;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            'h-6 w-6 p-1 text-muted-foreground hover:text-foreground',
            { 'text-primary bg-primary/10 hover:bg-primary/20': hasFilter }
          )}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-4" align="start">
        <div className="space-y-2">
            <Label htmlFor={`filter-type-${header}`}>Condition</Label>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as 'contains' | 'equals')}>
                <SelectTrigger id={`filter-type-${header}`}>
                    <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                </SelectContent>
            </Select>
        </div>
         <div className="space-y-2">
            <Label htmlFor={`filter-value-${header}`}>Value</Label>
            <Input
                id={`filter-value-${header}`}
                placeholder="Filter value..."
                value={filterValue}
                onChange={(e) => setFilterValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleApply();
                    }
                }}
            />
        </div>
        <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
            <Button size="sm" onClick={handleApply}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
