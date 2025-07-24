
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Terminal, Loader2, Wand, ChevronLeft, ChevronRight, XCircle, Eye, History, GripVertical } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Papa from 'papaparse';
import { Checkbox } from '@/components/ui/checkbox';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable-panel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { JsonBlock } from './LogDetailView';
import { LogComparisonView } from './LogComparisonView';
import { ColumnFilter, type FilterState } from './ColumnFilter';
import { cn } from '@/lib/utils';
import { LogDetailModal } from './LogDetailModal';
import { TimelineView } from './TimelineView';
import { ScrollArea } from '@/components/ui/scroll-area';


type LogRow = { [key: string]: string };

const ROWS_PER_PAGE_OPTIONS = [20, 50, 100, 200];
const DEFAULT_TIMELINE_WIDTH = 1024; // Default width in pixels, lg screen width
const MIN_TIMELINE_WIDTH = 480; // Minimum width in pixels

export default function FileViewerPage() {
    const params = useParams();
    const id = params.id as string;
    
    const [headers, setHeaders] = useState<string[]>([]);
    const [allLogs, setAllLogs] = useState<LogRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isParsing, setIsParsing] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fileName, setFileName] = useState('');
    const [selectedRows, setSelectedRows] = useState(new Set<number>());

    const [leftColumn, setLeftColumn] = useState<string>('difference_list');
    const [rightColumn, setRightColumn] = useState<string>('payload');
    const [isCompareOpen, setIsCompareOpen] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLogForModal, setSelectedLogForModal] = useState<LogRow | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0]);

    const [filters, setFilters] = useState<Record<string, FilterState>>({});
    
    const [timelineWidth, setTimelineWidth] = useState(DEFAULT_TIMELINE_WIDTH);
    const isResizingTimeline = useRef(false);

    const handleTimelineResizeStart = (e: React.MouseEvent) => {
        isResizingTimeline.current = true;
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
    };

    const handleTimelineResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizingTimeline.current) return;
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth >= MIN_TIMELINE_WIDTH) {
            setTimelineWidth(newWidth);
        }
    }, []);

    const handleTimelineResizeEnd = useCallback(() => {
        isResizingTimeline.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
    }, []);
    
    useEffect(() => {
        document.addEventListener('mousemove', handleTimelineResizeMove);
        document.addEventListener('mouseup', handleTimelineResizeEnd);

        return () => {
            document.removeEventListener('mousemove', handleTimelineResizeMove);
            document.removeEventListener('mouseup', handleTimelineResizeEnd);
        };
    }, [handleTimelineResizeMove, handleTimelineResizeEnd]);

    const setColumnFilter = useCallback((header: string, filter: FilterState | undefined) => {
        setFilters(prev => {
            const newFilters = { ...prev };
            if (filter) {
                newFilters[header] = filter;
            } else {
                delete newFilters[header];
            }
            return newFilters;
        });
    }, []);

    const filteredLogs = useMemo(() => {
        if (Object.keys(filters).length === 0) {
            return allLogs;
        }

        return allLogs.filter(log => {
            return Object.entries(filters).every(([header, filter]) => {
                const logValue = (log[header] || '').toLowerCase();
                const filterValue = filter.value.toLowerCase();

                if (filter.type === 'contains') {
                    return logValue.includes(filterValue);
                }
                if (filter.type === 'equals') {
                    return logValue === filterValue;
                }
                return true; // Should not happen
            });
        });
    }, [allLogs, filters]);


    const totalPages = Math.ceil(filteredLogs.length / rowsPerPage) || 1;

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * rowsPerPage;
        const end = start + rowsPerPage;
        return filteredLogs.slice(start, end);
    }, [filteredLogs, currentPage, rowsPerPage]);

    const getGlobalIndex = useCallback((localIndex: number): number => {
        const logToFind = paginatedLogs[localIndex];
        if (!logToFind) return -1;
        // Use a more robust way to find the index, especially with identical rows
        const paginatedLogGlobalIndex = (currentPage - 1) * rowsPerPage + localIndex;
        if (filteredLogs[paginatedLogGlobalIndex] === logToFind) {
            const globalIndex = allLogs.indexOf(logToFind);
            return globalIndex;
        }
        return allLogs.findIndex(log => log === logToFind);
    }, [paginatedLogs, allLogs, currentPage, rowsPerPage, filteredLogs]);


    useEffect(() => {
        if (!id) return;

        const fetchAndParseFile = async () => {
            setIsLoading(true);
            setIsParsing(true);
            setError(null);
            
            try {
                const fileDocRef = doc(db, 'saved_files', id);
                const fileDocSnap = await getDoc(fileDocRef);

                if (!fileDocSnap.exists()) {
                    throw new Error("File not found in database.");
                }

                const fileData = fileDocSnap.data();
                setFileName(fileData.ticketName || fileData.name);
                setIsLoading(false); 

                const fileUrl = `/api/files/${id}`;
                const response = await fetch(fileUrl);
                
                if (!response.ok) {
                    const errorJson = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
                    throw new Error(errorJson.error || `Failed to download file: ${response.statusText}`);
                }
                
                const csvText = await response.text();
                
                Papa.parse<LogRow>(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        if (results.errors.length) {
                             setError(`Parsing error: ${results.errors[0].message}`);
                        } else {
                            const newHeaders = results.meta.fields || [];
                            setHeaders(newHeaders);
                             if (!newHeaders.includes('difference_list')) setLeftColumn(newHeaders[0] || '');
                             if (!newHeaders.includes('payload')) setRightColumn(newHeaders[1] || newHeaders[0] || '');
                            setAllLogs(results.data);
                        }
                        setIsParsing(false);
                    },
                    error: (err: any) => {
                        console.error("PapaParse critical error:", err);
                        setError(`Critical parsing error: ${err.message}`);
                        setIsParsing(false);
                    }
                });

            } catch (err: any) {
                console.error("Error in fetchAndParseFile:", err);
                setError(err.message || "An unknown error occurred while loading the file.");
                setIsLoading(false);
                setIsParsing(false);
            }
        };

        fetchAndParseFile();
    }, [id]);

    useEffect(() => {
        setCurrentPage(1);
    }, [rowsPerPage, filters]);

    useEffect(() => {
        setSelectedRows(new Set());
    }, [rowsPerPage, currentPage, filters]);

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        const newSelectedRows = new Set(selectedRows);
        if (checked === true) {
            paginatedLogs.forEach((_, index) => {
                const globalIndex = getGlobalIndex(index);
                if (globalIndex !== -1) newSelectedRows.add(globalIndex);
            });
        } else {
            paginatedLogs.forEach((_, index) => {
                const globalIndex = getGlobalIndex(index);
                if (globalIndex !== -1) newSelectedRows.delete(globalIndex);
            });
        }
        setSelectedRows(newSelectedRows);
    };

    const handleRowSelect = (localIndex: number, checked: boolean) => {
        const globalIndex = getGlobalIndex(localIndex);
        if (globalIndex === -1) return;

        const newSelectedRows = new Set(selectedRows);
        if (checked) {
            newSelectedRows.add(globalIndex);
        } else {
            newSelectedRows.delete(globalIndex);
        }
        setSelectedRows(newSelectedRows);
    };

    const handleRowClick = (localIndex: number) => {
        const globalIndex = getGlobalIndex(localIndex);
        if (globalIndex === -1) return;

        const newSelectedRows = new Set(selectedRows);
        if (newSelectedRows.size === 1 && newSelectedRows.has(globalIndex)) {
            newSelectedRows.clear();
        } else {
            newSelectedRows.clear();
            newSelectedRows.add(globalIndex);
        }
        setSelectedRows(newSelectedRows);
    };

    const handleViewClick = (e: React.MouseEvent, log: LogRow) => {
        e.stopPropagation();
        setSelectedLogForModal(log);
        setIsModalOpen(true);
    };

    const numSelected = selectedRows.size;
    
    const isAllOnPageSelected = paginatedLogs.length > 0 && paginatedLogs.every((_, index) => {
        const globalIndex = getGlobalIndex(index);
        return globalIndex !== -1 && selectedRows.has(globalIndex);
    });

    const isSomeOnPageSelected = !isAllOnPageSelected && paginatedLogs.some((_, index) => {
        const globalIndex = getGlobalIndex(index);
        return globalIndex !== -1 && selectedRows.has(globalIndex);
    });
    
    const showDetailView = numSelected === 1;
    const selectedLogIndex = showDetailView ? selectedRows.values().next().value : null;
    const selectedLog = selectedLogIndex !== null ? allLogs[selectedLogIndex] : null;

    const showCompareButton = numSelected === 2;
    const getSelectedLogs = () => {
        if (numSelected !== 2) return [];
        const indices = Array.from(selectedRows);
        return [allLogs[indices[0]], allLogs[indices[1]]];
    };

    const getRowClass = (log: LogRow | undefined) => {
        if (!log) return "";
        const action = log.action?.toLowerCase();
        if (action === 'create') return 'row-create';
        if (action === 'update') return 'row-update';
        if (action === 'delete') return 'row-delete';
        return "";
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    const hasActiveFilters = Object.keys(filters).length > 0;


    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <header className="flex-shrink-0 bg-background/80 backdrop-blur-sm border-b z-20">
                <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => window.history.back()}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                    </div>
                    <div className="flex-1 flex items-baseline justify-center gap-4 min-w-0">
                         <h1 className="text-xl font-bold text-foreground truncate">
                            {isLoading && !fileName ? 'Loading...' : `${fileName}`}
                         </h1>
                         <p className="text-sm text-muted-foreground whitespace-nowrap">
                            Audit Logs ({isLoading || isParsing ? '...' : allLogs.length.toLocaleString()} rows)
                         </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasActiveFilters && (
                            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear All Filters
                            </Button>
                        )}
                        {showCompareButton && (
                            <Button variant="outline" size="sm" onClick={() => setIsCompareOpen(true)}>
                                <Wand className="mr-2 h-4 w-4"/>
                                Compare Selections
                            </Button>
                        )}
                         <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" disabled={isLoading || isParsing || allLogs.length === 0}>
                                    <History className="mr-2 h-4 w-4"/>
                                    Timeline
                                </Button>
                            </SheetTrigger>
                            <SheetContent 
                                side="right" 
                                className="!max-w-none p-0 flex flex-col"
                                style={{ width: `${timelineWidth}px` }}
                            >
                                <div
                                    onMouseDown={handleTimelineResizeStart}
                                    className="absolute top-0 left-0 h-full w-2 cursor-ew-resize flex items-center justify-center group"
                                >
                                    <div className="w-0.5 h-8 bg-border rounded-full group-hover:bg-primary transition-colors" />
                                </div>
                                <SheetHeader className="p-4 border-b">
                                  <SheetTitle>Timeline View</SheetTitle>
                                </SheetHeader>
                                <TimelineView logs={filteredLogs} headers={headers} />
                            </SheetContent>
                        </Sheet>
                        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-green-400/80"></span>
                                <span>Create</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-yellow-400/80"></span>
                                <span>Update</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded-full bg-red-400/80"></span>
                                <span>Delete</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-grow flex flex-col min-h-0">
                 <ResizablePanelGroup direction="vertical" className="flex-grow">
                    <ResizablePanel defaultSize={showDetailView ? 60 : 100}>
                        <div className="h-full flex flex-col">
                            {error ? (
                                 <Alert variant="destructive" className="my-4 mx-6">
                                    <Terminal className="h-4 w-4" />
                                    <AlertTitle>Error Loading File</AlertTitle>
                                    <AlertDescription>
                                        <p>{error}</p>
                                    </AlertDescription>
                                </Alert>
                            ) : isLoading || isParsing ? (
                                 <div className="w-full h-full flex flex-col justify-center items-center space-y-4">
                                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    <span className="text-lg text-muted-foreground">
                                        {isLoading ? 'Loading file info...' : 'Parsing file, please wait...'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex-grow min-h-0 overflow-y-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background z-10">
                                            <TableRow>
                                                <TableHead className="w-16 px-2">
                                                    <Checkbox
                                                        checked={isAllOnPageSelected ? true : (isSomeOnPageSelected ? 'indeterminate' : false)}
                                                        onCheckedChange={handleSelectAll}
                                                        aria-label="Select all rows on this page"
                                                        disabled={paginatedLogs.length === 0}
                                                    />
                                                </TableHead>
                                                <TableHead className="w-20 font-mono">#</TableHead>
                                                {headers.map((header) => (
                                                    <TableHead key={header} className="capitalize">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate">
                                                                {header.replace(/_/g, ' ')}
                                                            </span>
                                                            <ColumnFilter 
                                                                header={header}
                                                                filter={filters[header]}
                                                                setFilter={setColumnFilter}
                                                            />
                                                        </div>
                                                    </TableHead>
                                                ))}
                                                <TableHead className="w-24 text-center">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedLogs.map((log, index) => {
                                                const globalIndex = getGlobalIndex(index);
                                                const isSelected = globalIndex !== -1 && selectedRows.has(globalIndex);
                                                return (
                                                    <TableRow
                                                        key={globalIndex === -1 ? `fallback-${index}`: globalIndex}
                                                        data-state={isSelected ? 'selected' : undefined}
                                                        className={cn("cursor-pointer", getRowClass(log))}
                                                        onClick={() => handleRowClick(index)}
                                                    >
                                                        <TableCell className="px-2" onClick={(e) => e.stopPropagation()}>
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={(checked) => handleRowSelect(index, !!checked)}
                                                                aria-label={`Select row ${globalIndex + 1}`}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="font-mono text-muted-foreground">{globalIndex + 1}</TableCell>
                                                        {headers.map((header) => (
                                                            <TableCell 
                                                                key={`${globalIndex}-${header}`} 
                                                                className="font-mono truncate"
                                                                title={log[header]}
                                                            >
                                                                {log[header]}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleViewClick(e, log)}>
                                                                <Eye className="h-4 w-4" />
                                                                <span className="sr-only">View Details</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                            {!paginatedLogs.length && (
                                                <TableRow>
                                                    <TableCell colSpan={headers.length + 3} className="text-center py-10 text-muted-foreground">
                                                        {hasActiveFilters ? "No logs match the current filters." : "The file is empty."}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                             {!isLoading && !isParsing && allLogs.length > 0 && (
                                <div className="flex-shrink-0 flex items-center justify-between border-t py-2 px-4">
                                     <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                       <div className="flex items-center gap-2">
                                          <Label htmlFor="rows-per-page">Rows per page</Label>
                                           <Select
                                              value={`${rowsPerPage}`}
                                              onValueChange={(value) => {
                                                  setRowsPerPage(Number(value));
                                              }}
                                          >
                                              <SelectTrigger id="rows-per-page" className="h-8 w-[70px]">
                                                  <SelectValue placeholder={rowsPerPage} />
                                              </SelectTrigger>
                                              <SelectContent side="top">
                                                  {ROWS_PER_PAGE_OPTIONS.map((pageSize) => (
                                                      <SelectItem key={pageSize} value={`${pageSize}`}>
                                                          {pageSize}
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                        </div>
                                        <div>
                                          Selected: {selectedRows.size} of {filteredLogs.length}
                                        </div>
                                     </div>

                                     <div className="flex items-center gap-4 text-sm font-medium">
                                        <span>Page {totalPages > 0 ? currentPage : 0} of {totalPages}</span>
                                        <div className="flex items-center gap-2">
                                          <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handlePageChange(currentPage - 1)}
                                              disabled={currentPage === 1}
                                          >
                                              <ChevronLeft className="h-4 w-4" />
                                              <span className="sr-only">Previous</span>
                                          </Button>
                                          <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => handlePageChange(currentPage + 1)}
                                              disabled={currentPage === totalPages}
                                          >
                                             <span className="sr-only">Next</span>
                                              <ChevronRight className="h-4 w-4" />
                                          </Button>
                                        </div>
                                     </div>
                                </div>
                            )}
                        </div>
                    </ResizablePanel>
                    {showDetailView && (
                        <>
                            <ResizableHandle withHandle />
                            <ResizablePanel defaultSize={40} minSize={20} className="flex flex-col bg-muted/40">
                                <div className="flex-grow min-h-0 flex">
                                    <div className="flex-1 basis-1/2 flex flex-col border-r">
                                        <div className="p-4 border-b flex-shrink-0">
                                            <Label htmlFor="left-column-select">Left Panel</Label>
                                            <Select value={leftColumn} onValueChange={setLeftColumn}>
                                                <SelectTrigger id="left-column-select">
                                                    <SelectValue placeholder="Select column..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {headers.map(h => <SelectItem key={`left-${h}`} value={h}>{h.replace(/_/g, ' ')}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <JsonBlock
                                            title={leftColumn}
                                            jsonString={selectedLog?.[leftColumn]}
                                        />
                                    </div>
                                    <div className="flex-1 basis-1/2 flex flex-col">
                                        <div className="p-4 border-b flex-shrink-0">
                                            <Label htmlFor="right-column-select">Right Panel</Label>
                                            <Select value={rightColumn} onValueChange={setRightColumn}>
                                                <SelectTrigger id="right-column-select">
                                                    <SelectValue placeholder="Select column..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {headers.map(h => <SelectItem key={`right-${h}`} value={h}>{h.replace(/_/g, ' ')}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                         <JsonBlock
                                            title={rightColumn}
                                            jsonString={selectedLog?.[rightColumn]}
                                        />
                                    </div>
                                </div>
                            </ResizablePanel>
                        </>
                    )}
                </ResizablePanelGroup>
            </main>
            <Dialog open={isCompareOpen} onOpenChange={setIsCompareOpen}>
                <DialogContent className="max-w-4xl h-4/5 flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Compare Log Entries</DialogTitle>
                    </DialogHeader>
                    <LogComparisonView 
                        logs={getSelectedLogs()}
                        headers={headers}
                    />
                </DialogContent>
            </Dialog>
            <LogDetailModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                log={selectedLogForModal}
            />
        </div>
    );
}
