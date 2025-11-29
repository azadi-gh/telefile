import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Folder } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Folder as FolderIcon, PlusCircle, Home } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
interface FolderPaneProps {
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
}
export function FolderPane({ selectedFolderId, onSelectFolder }: FolderPaneProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const queryClient = useQueryClient();
  const { data: folders, isLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api<Folder[]>('/api/folders'),
  });
  const createFolderMutation = useMutation({
    mutationFn: (name: string) => api<Folder>('/api/folders', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      toast.success('Folder created!');
      setIsCreating(false);
      setNewFolderName('');
    },
    onError: (error) => {
      toast.error(`Failed to create folder: ${error.message}`);
    },
  });
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };
  return (
    <div className="p-4 bg-secondary/50 rounded-lg h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Folders</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsCreating(true)}>
          <PlusCircle className="w-5 h-5" />
        </Button>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-2",
            selectedFolderId === null && "bg-primary/10 text-primary"
          )}
          onClick={() => onSelectFolder(null)}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Button>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)
        ) : (
          folders?.map(folder => (
            <Button
              key={folder.id}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2",
                selectedFolderId === folder.id && "bg-primary/10 text-primary"
              )}
              onClick={() => onSelectFolder(folder.id)}
            >
              <FolderIcon className="w-4 h-4" />
              <span className="truncate">{folder.name}</span>
            </Button>
          ))
        )}
      </div>
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={createFolderMutation.isPending}>
              {createFolderMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}