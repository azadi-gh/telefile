import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { X, File as FileIcon, Info, Image as ImageIcon, Video, Music, Link as LinkIcon, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import type { File as TeleFile } from '@shared/types';
import { toast } from 'sonner';
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
    return <img src={`data:${file.mime};base64,${file.content}`} alt={file.name} className="w-full h-full object-contain rounded-md" />;
  }
  if (file.mime.startsWith('video/') && file.content) {
    return <video src={`data:${file.mime};base64,${file.content}`} controls className="w-full h-full rounded-md" />;
  }
  if (file.mime.startsWith('audio/') && file.content) {
    return <audio src={`data:${file.mime};base64,${file.content}`} controls className="w-full" />;
  }
  let Icon = FileIcon;
  if (file.mime.startsWith('image/')) Icon = ImageIcon;
  if (file.mime.startsWith('video/')) Icon = Video;
  if (file.mime.startsWith('audio/')) Icon = Music;
  return <Icon className="w-24 h-24 text-muted-foreground" />;
};
export function FileInspector({ file, onClose }: FileInspectorProps) {
  const handleCopyLink = () => {
    if (file?.telegram?.file_id) {
      navigator.clipboard.writeText(file.telegram.file_id);
      toast.success('Telegram file ID copied to clipboard!');
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/api/files/${file?.id}`);
      toast.success('File link copied to clipboard!');
    }
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
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex-1 p-4 space-y-6 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg truncate">{file.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-4">
                  <FilePreview file={file} />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatBytes(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="truncate max-w-[150px]">{file.mime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>{format(new Date(file.createdAt), 'PPp')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">Actions</CardTitle>
                <Info className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={handleCopyLink}><LinkIcon className="mr-2 h-4 w-4" /> Copy Link</Button>
                <Button variant="outline" disabled><Send className="mr-2 h-4 w-4" /> Forward</Button>
                <Button variant="destructive" className="col-span-2" disabled><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
              </CardContent>
            </Card>
            {file.telegram && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Telegram Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground break-all">File ID: {file.telegram.file_id}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}