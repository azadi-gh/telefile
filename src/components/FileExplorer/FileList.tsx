import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { File as TeleFile } from '@shared/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { File as FileIcon, MoreVertical, Trash2, Download, Send } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
interface FileListProps {
  currentFolderId: string | null;
  onSelectFile: (file: TeleFile | null) => void;
}
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
const FileCard = ({ file, onDelete, onSelect }: { file: TeleFile; onDelete: (id: string) => void; onSelect: (file: TeleFile) => void; }) => {
  const isImage = file.mime.startsWith('image/');
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.content) {
      const byteCharacters = atob(file.content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      toast.error("No content to download for this file.");
    }
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(file.id);
  };
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer" onClick={() => onSelect(file)}>
        <CardHeader className="flex flex-row items-start justify-between p-4">
          <div className="flex-1 truncate pr-2">
            <CardTitle className="text-base font-medium truncate">{file.name}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
              <DropdownMenuItem disabled><Send className="mr-2 h-4 w-4" /> Forward</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="aspect-video bg-muted rounded-md flex items-center justify-center">
            {isImage && file.content ? (
              <img src={`data:${file.mime};base64,${file.content}`} alt={file.name} className="w-full h-full object-cover rounded-md" />
            ) : (
              <FileIcon className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
          <span>{formatBytes(file.size)}</span>
        </CardFooter>
      </Card>
    </motion.div>
  );
};
export function FileList({ currentFolderId, onSelectFile }: FileListProps) {
  const queryClient = useQueryClient();
  const queryKey = ['files', currentFolderId];
  const { data: files, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const url = currentFolderId ? `/api/files?folderId=${currentFolderId}` : '/api/files';
      return api<TeleFile[]>(url);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/files/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('File deleted');
      onSelectFile(null); // Deselect file on deletion
    },
    onError: (error) => {
      toast.error(`Failed to delete file: ${error.message}`);
    },
  });
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }
  if (!files || files.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>This folder is empty.</p>
        <p className="text-sm">Upload some files to get started!</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {files.map(file => (
        <FileCard key={file.id} file={file} onDelete={deleteMutation.mutate} onSelect={onSelectFile} />
      ))}
    </div>
  );
}