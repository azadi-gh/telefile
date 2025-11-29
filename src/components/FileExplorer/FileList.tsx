import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { File as TeleFile } from '@shared/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { File as FileIcon, MoreVertical, Trash2, Download, Send, UploadCloud, CheckCircle2, SearchX } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
interface FileListProps {
  currentFolderId: string | null;
  onSelectFile: (file: TeleFile | null) => void;
  toggleUploader: () => void;
  searchTerm?: string;
}
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
const FileCard = ({ file, onSelect }: { file: TeleFile; onSelect: (file: TeleFile | null) => void; }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const isImage = file.mime.startsWith('image/');
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/api/files/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', file.folderId] });
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // For search
      toast.success('File deleted');
      onSelect(null);
    },
    onError: (error) => toast.error(`Failed to delete file: ${error.message}`),
  });
  const forwardMutation = useMutation({
    mutationFn: (id: string) => api(`/api/files/${id}/forward`, { method: 'POST' }),
    onSuccess: (updatedFile: TeleFile) => {
      queryClient.setQueryData(['files', file.folderId], (oldData: TeleFile[] | undefined) =>
        oldData?.map(f => f.id === updatedFile.id ? updatedFile : f)
      );
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // For search
      toast.success('File forwarded to Telegram!');
    },
    onError: (error) => toast.error(`Forwarding failed: ${error.message}`),
  });
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.info('Starting download...');
    try {
      const res = await fetch(`/api/files/${file.id}/download`);
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    }
  };
  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
        <Card className="hover:shadow-xl transition-shadow duration-200 cursor-pointer group" onClick={() => onSelect(file)}>
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
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download</DropdownMenuItem>
                {!file.telegram && (
                  <DropdownMenuItem onClick={() => forwardMutation.mutate(file.id)} disabled={forwardMutation.isPending}>
                    <Send className="mr-2 h-4 w-4" /> {forwardMutation.isPending ? 'Forwarding...' : 'Forward to Telegram'}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="aspect-video bg-muted rounded-md flex items-center justify-center relative overflow-hidden">
              {isImage && file.content ? (
                <img src={`data:${file.mime};base64,${file.content}`} alt={file.name} className="w-full h-full object-cover rounded-md" />
              ) : (
                <FileIcon className="w-12 h-12 text-muted-foreground" />
              )}
              {file.telegram && (
                <Badge variant="secondary" className="absolute bottom-2 right-2 bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1.5" /> Sent
                </Badge>
              )}
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
            <span>{formatBytes(file.size)}</span>
          </CardFooter>
        </Card>
      </motion.div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete "{file.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(file.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
export function FileList({ currentFolderId, onSelectFile, toggleUploader, searchTerm }: FileListProps) {
  const queryKey = ['files', searchTerm ? null : currentFolderId];
  const { data: files, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const url = searchTerm ? '/api/files' : currentFolderId ? `/api/files?folderId=${currentFolderId}` : '/api/files';
      return api<TeleFile[]>(url);
    },
  });
  const filteredFiles = useMemo(() => {
    if (!files) return [];
    if (!searchTerm) return files;
    return files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full" />
        ))}
      </div>
    );
  }
  if (filteredFiles.length === 0) {
    if (searchTerm) {
      return (
        <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground rounded-lg border-2 border-dashed">
          <SearchX className="w-16 h-16 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No files found</h3>
          <p>Your search for "{searchTerm}" did not match any files.</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground rounded-lg border-2 border-dashed">
        <UploadCloud className="w-16 h-16 mb-4" />
        <h3 className="text-xl font-semibold text-foreground">This folder is empty</h3>
        <p className="mb-6">Upload some files to get started!</p>
        <Button onClick={toggleUploader}>
          <Send className="mr-2 h-4 w-4" /> Upload Files
        </Button>
      </div>
    );
  }
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {filteredFiles.map(file => (
          <FileCard key={file.id} file={file} onSelect={onSelectFile} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}