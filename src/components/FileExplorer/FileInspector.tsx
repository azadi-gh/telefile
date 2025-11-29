import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { X, File as FileIcon, Info, Image as ImageIcon, Video, Music, Link as LinkIcon, Trash2, Send, Edit, Move, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import type { File as TeleFile, Folder } from '@shared/types';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
interface FileInspectorProps {
  file: TeleFile | null;
  onClose: () => void;
}
const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
const FilePreview = ({ file }: { file: TeleFile }) => {
  if (file.mime.startsWith('image/') && file.content) {
    return <img src={`data:${file.mime};base64,${file.content}`} alt={file.name} className="max-w-full max-h-full object-contain rounded-md" />;
  }
  if (file.mime.startsWith('video/') && file.content) {
    return <video src={`data:${file.mime};base64,${file.content}`} controls className="w-full h-full rounded-md" />;
  }
  if (file.mime.startsWith('audio/') && file.content) {
    return <audio src={`data:${file.mime};base64,${file.content}`} controls className="w-full" />;
  }
  if (file.mime.startsWith('text/') && file.content) {
    try {
      const textContent = atob(file.content);
      return <pre className="text-xs overflow-auto max-h-48 w-full bg-background p-2 rounded-md text-left whitespace-pre-wrap break-words">{textContent.slice(0, 500)}{textContent.length > 500 ? '...' : ''}</pre>;
    } catch (e) {
      return <p className="text-xs text-destructive">Could not decode file content.</p>;
    }
  }
  let IconComponent = FileIcon;
  if (file.mime.startsWith('image/')) IconComponent = ImageIcon;
  if (file.mime.startsWith('video/')) IconComponent = Video;
  if (file.mime.startsWith('audio/')) IconComponent = Music;
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
      <IconComponent className="w-24 h-24 text-muted-foreground" />
    </div>
  );
};
export function FileInspector({ file, onClose }: FileInspectorProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newName, setNewName] = useState(file?.name || '');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data: folders } = useQuery<Folder[]>({ queryKey: ['folders'], queryFn: () => api('/api/folders') });
  const updateFileMutation = useMutation({
    mutationFn: (data: { name?: string; folderId?: string | null }) => api<TeleFile>(`/api/files/${file!.id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (updatedFile) => {
      queryClient.invalidateQueries({ queryKey: ['files', file?.folderId] });
      queryClient.invalidateQueries({ queryKey: ['files', updatedFile.folderId] });
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // Invalidate search
      toast.success('File updated!');
      setIsRenaming(false);
      setIsMoving(false);
    },
    onError: (error) => toast.error(`Update failed: ${error.message}`),
  });
  const deleteMutation = useMutation({
    mutationFn: () => api(`/api/files/${file!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', file?.folderId] });
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // Invalidate search
      toast.success('File deleted');
      onClose();
    },
    onError: (error) => toast.error(`Delete failed: ${error.message}`),
  });
  const forwardMutation = useMutation({
    mutationFn: () => api<TeleFile>(`/api/files/${file!.id}/forward`, { method: 'POST' }),
    onSuccess: (updatedFile) => {
      queryClient.setQueryData(['files', file?.folderId], (oldData: TeleFile[] | undefined) =>
        oldData?.map(f => f.id === updatedFile.id ? updatedFile : f)
      );
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // Invalidate search
      toast.success('File forwarded to Telegram!');
    },
    onError: (error) => toast.error(`Forwarding failed: ${error.message}`),
  });
  const handleRename = () => {
    if (newName.trim() && newName.trim() !== file?.name) {
      updateFileMutation.mutate({ name: newName.trim() });
    } else {
      setIsRenaming(false);
    }
  };
  const handleMove = () => {
    updateFileMutation.mutate({ folderId: targetFolderId });
  };
  const handleCopyLink = () => {
    const link = `${window.location.origin}/api/files/${file?.id}/download`;
    navigator.clipboard.writeText(link);
    toast.success('Download link copied to clipboard!');
  };
  return (
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="h-full bg-card border-l flex flex-col"
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">File Details</h3>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg truncate">{file.name}</CardTitle></CardHeader>
              <CardContent>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 p-2">
                  <FilePreview file={file} />
                </motion.div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Size</span><span>{formatBytes(file.size)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="truncate max-w-[150px]">{file.mime}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uploaded</span><span>{format(new Date(file.createdAt), 'PPp')}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-base font-medium">Actions</CardTitle><Info className="w-4 h-4 text-muted-foreground" /></CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => { setNewName(file.name); setIsRenaming(true); }}><Edit className="mr-2 h-4 w-4" /> Rename</Button>
                <Button variant="outline" onClick={() => { setTargetFolderId(file.folderId || null); setIsMoving(true); }}><Move className="mr-2 h-4 w-4" /> Move</Button>
                <Button variant="outline" onClick={handleCopyLink}><LinkIcon className="mr-2 h-4 w-4" /> Copy Link</Button>
                <Button variant="outline" onClick={() => forwardMutation.mutate()} disabled={!!file.telegram || forwardMutation.isPending}>
                  {file.telegram ? <><CheckCircle2 className="mr-2 h-4 w-4 text-teal-500" /> Sent</> : <><Send className="mr-2 h-4 w-4" /> Forward</>}
                </Button>
                <Button variant="destructive" className="col-span-2" onClick={() => setIsDeleting(true)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </CardContent>
            </Card>
            {file.telegram && (
              <Card className="shadow-md">
                <CardHeader><CardTitle className="text-base">Telegram Info</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground break-all">File ID: {file.telegram.file_id}</p>
                  <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => { navigator.clipboard.writeText(file.telegram!.file_id); toast.success('Telegram File ID copied!'); }}>Copy ID</Button>
                </CardContent>
              </Card>
            )}
          </div>
          {/* Dialogs */}
          <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
            <DialogContent aria-describedby="rename-dialog-desc">
              <DialogHeader>
                <DialogTitle>Rename File</DialogTitle>
              </DialogHeader>
              <p id="rename-dialog-desc" className="sr-only">Enter a new name for the file and press Save or Cancel.</p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRenaming(false)}>Cancel</Button>
                <Button onClick={handleRename}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isMoving} onOpenChange={setIsMoving}>
            <DialogContent aria-describedby="move-dialog-desc">
              <DialogHeader>
                <DialogTitle>Move File</DialogTitle>
              </DialogHeader>
              <p id="move-dialog-desc" className="sr-only">Select a destination folder for the file and press Move to confirm.</p>
              <Select
                onValueChange={(v) => setTargetFolderId(v === 'root' ? null : v)}
                defaultValue={file.folderId || 'root'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Home (Root)</SelectItem>
                  {folders?.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsMoving(false)}>Cancel</Button>
                <Button onClick={handleMove}>Move</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete "{file.name}" ({formatBytes(file.size)}).</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </motion.div>
      )}
    </AnimatePresence>
  );
}