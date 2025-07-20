
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icons } from '@/components/icons';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, ChevronRight, Loader2, FileUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getFiles, uploadFile, deleteFile, type SavedFile } from '@/lib/firestore';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function HomePage() {
  const [ticketName, setTicketName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<SavedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileToDelete, setFileToDelete] = useState<SavedFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const files = await getFiles();
      setUploadedFiles(files);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching files",
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
       if (file.type !== 'text/csv') {
            toast({
                variant: 'destructive',
                title: 'Invalid File Type',
                description: 'Please upload a .csv file.',
            });
            setSelectedFile(null);
            const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
            return;
        }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!ticketName || !selectedFile) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please provide a ticket name and select a file.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadFile(ticketName, selectedFile, (progress) => {
        setUploadProgress(progress);
      });
      toast({
        title: "Upload successful!",
        description: `${selectedFile.name} has been uploaded.`,
      });
      // Reset form and refresh file list
      setTicketName('');
      setSelectedFile(null);
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      fetchFiles();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: (error as Error).message,
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, file: SavedFile) => {
    e.preventDefault();
    e.stopPropagation();
    setFileToDelete(file);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete || !fileToDelete.id) return;

    setIsDeleting(true);
    try {
      await deleteFile(fileToDelete.id, fileToDelete.storagePath);
      toast({
        title: "File deleted",
        description: `${fileToDelete.name} has been removed.`,
      });
      fetchFiles(); // Refresh the list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: (error as Error).message,
      });
    } finally {
      setIsDeleting(false);
      setFileToDelete(null);
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <Icons.logo className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Audit Log Analyzer</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Upload Form */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-6 w-6" />
                  Upload Audit Log
                </CardTitle>
                <CardDescription>
                  Provide an identifying name and upload the CSV file from the client.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="ticket-name">Ticket Name</Label>
                  <Input
                    id="ticket-name"
                    placeholder="e.g., INC-12345 or Project-X"
                    value={ticketName}
                    onChange={(e) => setTicketName(e.target.value)}
                    disabled={isUploading}
                  />
                </div>
                <div className="space-y-2">
                  <Label>CSV File</Label>
                   <div className="flex items-center gap-4">
                    <Label htmlFor="csv-upload" className="flex items-center gap-2 cursor-pointer h-10 px-4 py-2 border border-input bg-background rounded-md text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground">
                      <FileUp className="h-4 w-4" />
                      <span>Choose File</span>
                    </Label>
                    <Input
                      id="csv-upload"
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      disabled={isUploading}
                      className="hidden"
                    />
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground truncate">
                        {selectedFile.name}
                      </p>
                    )}
                   </div>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                      <Label>Upload Progress</Label>
                      <Progress value={uploadProgress} />
                      <p className="text-sm text-muted-foreground text-center">{Math.round(uploadProgress)}%</p>
                  </div>
                )}
                <Button onClick={handleUpload} className="w-full" disabled={!ticketName || !selectedFile || isUploading}>
                   {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    'Upload File'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Right Column: Uploaded Files List */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Uploaded Files</CardTitle>
                <CardDescription>
                  Click on a file to view its contents or delete it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-10">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : uploadedFiles.length > 0 ? (
                  <ul className="space-y-3">
                    {uploadedFiles.map((file) => (
                      <li key={file.id} className="group w-full text-left p-4 rounded-lg border bg-card hover:bg-muted transition-colors flex items-center justify-between">
                         <Link href={`/files/${file.id}`} className="flex-grow flex items-center gap-4 min-w-0">
                            <FileText className="h-6 w-6 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{file.ticketName}</p>
                              <p className="text-sm text-muted-foreground truncate">{file.name}</p>
                            </div>
                        </Link>
                        <div className="flex items-center gap-2 pl-4">
                            <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, file)}
                            >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete file</span>
                            </Button>
                            <Link href={`/files/${file.id}`} aria-hidden="true" tabIndex={-1}>
                                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    <p>No files uploaded yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the file <span className="font-semibold">{fileToDelete?.ticketName} ({fileToDelete?.name})</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
