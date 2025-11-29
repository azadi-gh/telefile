import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FolderPane } from '@/components/FileExplorer/FolderPane';
import { FileList } from '@/components/FileExplorer/FileList';
import { UploadDropzone } from '@/components/FileExplorer/UploadDropzone';
import { Button } from '@/components/ui/button';
import { Settings, FileUp } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient as useTanstackQueryClient } from '@tanstack/react-query';
import type { AppSettings } from '@shared/types';
import { toast } from 'sonner';
const queryClient = new QueryClient();
function SettingsSheet() {
  const tanstackQueryClient = useTanstackQueryClient();
  const [token, setToken] = useState('');
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<AppSettings>('/api/settings'),
    onSuccess: (data) => {
      if (data.botToken) setToken(data.botToken);
    },
  });
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AppSettings>) => api<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(newSettings) }),
    onSuccess: () => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved!');
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
  const handleSave = () => {
    updateSettingsMutation.mutate({ botToken: token });
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Telegram Bot Token</Label>
            <Input id="bot-token" type="password" placeholder="Your bot token" value={token} onChange={(e) => setToken(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Get this from BotFather on Telegram. Your token is stored securely and never exposed to the client.
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateSettingsMutation.isPending}>
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
function FileExplorer() {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const queryClient = useTanstackQueryClient();
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="TeleFile Logo" className="h-8 w-8" />
          <h1 className="text-2xl font-bold font-display text-primary">TeleFile</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowUploader(s => !s)}><FileUp className="mr-2 h-4 w-4" /> Upload</Button>
          <SettingsSheet />
          <ThemeToggle className="relative top-0 right-0" />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={20} minSize={15} className="min-w-[280px]">
            <FolderPane selectedFolderId={currentFolderId} onSelectFolder={setCurrentFolderId} />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80}>
            <div className="p-6 h-full overflow-y-auto">
              {showUploader && (
                <div className="mb-8">
                  <UploadDropzone
                    currentFolderId={currentFolderId}
                    onUploadComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
                    }}
                  />
                </div>
              )}
              <FileList currentFolderId={currentFolderId} onSelectFile={setSelectedFile} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
      <footer className="text-center p-2 text-xs text-muted-foreground border-t">
        Built with ❤�� at Cloudflare
      </footer>
    </div>
  );
}
export function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <FileExplorer />
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}