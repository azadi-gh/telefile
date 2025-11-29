import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { UploadCloud, X, File as FileIcon } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { File as TeleFile } from '@shared/types';
interface UploadDropzoneProps {
  currentFolderId: string | null;
  onUploadComplete: () => void;
}
interface UploadableFile {
  file: File;
  progress: number;
  error?: string;
}
export function UploadDropzone({ currentFolderId, onUploadComplete }: UploadDropzoneProps) {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const queryClient = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: async (fileWithFolder: { file: File, folderId: string | null }) => {
      const formData = new FormData();
      formData.append('file', fileWithFolder.file);
      if (fileWithFolder.folderId) {
        formData.append('folderId', fileWithFolder.folderId);
      }
      // We don't use the generic `api` helper here because it's for JSON APIs.
      // We need to handle FormData and potential progress events manually.
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
      onUploadComplete();
      toast.success('File uploaded successfully!');
    },
    onError: (error: Error, variables) => {
      setFiles(prev => prev.map(f => f.file === variables.file ? { ...f, error: error.message } : f));
      toast.error(`Upload failed: ${error.message}`);
    },
  });
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadableFile[] = acceptedFiles.map(file => ({ file, progress: 0 }));
    setFiles(prev => [...prev, ...newFiles]);
    newFiles.forEach(f => {
      // Simulate progress for demo purposes, as XMLHttpRequest is needed for real progress
      // and fetch API doesn't support it directly.
      // In a real app, you'd use XHR or a library that wraps it.
      setFiles(prev => prev.map(p => p.file === f.file ? { ...p, progress: 50 } : p));
      uploadMutation.mutate({ file: f.file, folderId: currentFolderId }, {
        onSuccess: () => {
          setFiles(prev => prev.map(p => p.file === f.file ? { ...p, progress: 100 } : p));
          setTimeout(() => {
            setFiles(prev => prev.filter(p => p.file !== f.file));
          }, 1000);
        },
      });
    });
  }, [currentFolderId, uploadMutation]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, multiple: true });
  const removeFile = (file: File) => {
    setFiles(prev => prev.filter(f => f.file !== file));
  };
  return (
    <div className="space-y-4">
      <Card
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed hover:border-primary/80 transition-colors duration-200 cursor-pointer',
          isDragActive && 'border-primary bg-primary/10'
        )}
      >
        <CardContent className="p-6 text-center">
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <UploadCloud className="w-12 h-12" />
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm">Max file size 2MB (for this demo)</p>
          </div>
        </CardContent>
      </Card>
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploading Files</h4>
          {files.map(({ file, progress, error }, index) => (
            <Card key={index} className={cn("p-2", error && "bg-destructive/10 border-destructive")}>
              <div className="flex items-center gap-3">
                <FileIcon className="w-6 h-6 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {error ? <span className="text-destructive">{error}</span> : `${(file.size / 1024).toFixed(1)} KB`}
                  </p>
                  {!error && <Progress value={progress} className="h-1 mt-1" />}
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeFile(file)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}