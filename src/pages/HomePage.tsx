import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FolderPane } from '@/components/FileExplorer/FolderPane';
import { FileList } from '@/components/FileExplorer/FileList';
import { UploadDropzone } from '@/components/FileExplorer/UploadDropzone';
import { FileInspector } from '@/components/FileExplorer/FileInspector';
import { Button } from '@/components/ui/button';
import { Settings, FileUp, PanelLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient as useTanstackQueryClient } from '@tanstack/react-query';
import type { AppSettings, File as TeleFile, Folder } from '@shared/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
const queryClient = new QueryClient();
function SettingsSheet() {
  const tanstackQueryClient = useTanstackQueryClient();
  const [token, setToken] = useState('');
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<AppSettings>('/api/settings'),
    onSuccess: (data) => setToken(data.botToken || ''),
  });
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AppSettings>) => api<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(newSettings) }),
    onSuccess: () => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved!');
    },
    onError: (error) => toast.error(`Failed to save settings: ${error.message}`),
  });
  const handleSave = () => {
    updateSettingsMutation.mutate({ botToken: token });
  };
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader><SheetTitle>Settings</SheetTitle></SheetHeader>
        <div className="py-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-token">Telegram Bot Token</Label>
            <Input id="bot-token" type="password" placeholder="Your bot token" value={token} onChange={(e) => setToken(e.target.value)} />
            <p className="text-xs text-muted-foreground">Get this from BotFather on Telegram. Your token is stored securely.</p>
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
  const [selectedFile, setSelectedFile] = useState<TeleFile | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useTanstackQueryClient();
  const { data: folders } = useQuery<Folder[]>({ queryKey: ['folders'], queryFn: () => api('/api/folders') });
  const currentFolder = folders?.find(f => f.id === currentFolderId);
  const handleSelectFile = (file: TeleFile | null) => {
    setSelectedFile(file);
  };
  const handleSelectFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedFile(null);
    if (isMobile) setSidebarOpen(false);
  };
  const folderPane = <FolderPane selectedFolderId={currentFolderId} onSelectFolder={handleSelectFolder} />;
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between p-2 md:p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          {isMobile && (
            <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><PanelLeft /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">{folderPane}</SheetContent>
            </Sheet>
          )}
          <img src="/logo.svg" alt="TeleFile Logo" className="h-8 w-8" />
          <h1 className="text-xl md:text-2xl font-bold font-display text-primary">TeleFile</h1>
          {currentFolder && <Badge variant="secondary" className="hidden sm:inline-flex">{currentFolder.name}</Badge>}
        </div>
        <div className="flex items-center gap-1 md:gap-2">
          <Button onClick={() => setShowUploader(s => !s)}><FileUp className="mr-0 md:mr-2 h-4 w-4" /> <span className="hidden md:inline">Upload</span></Button>
          <SettingsSheet />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {!isMobile && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} className="min-w-[280px]"><div className="p-2 h-full">{folderPane}</div></ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          <ResizablePanel defaultSize={selectedFile ? 50 : 80}>
            <div className="p-4 md:p-6 h-full overflow-y-auto">
              <AnimatePresence>
                {showUploader && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-8"
                  >
                    <UploadDropzone
                      currentFolderId={currentFolderId}
                      onUploadComplete={() => {
                        queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] });
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <FileList currentFolderId={currentFolderId} onSelectFile={handleSelectFile} toggleUploader={() => setShowUploader(true)} />
            </div>
          </ResizablePanel>
          <AnimatePresence>
            {selectedFile && (
              <>
                {!isMobile && <ResizableHandle withHandle />}
                <ResizablePanel defaultSize={30} minSize={20} className="min-w-[360px] hidden lg:block">
                  <FileInspector file={selectedFile} onClose={() => setSelectedFile(null)} />
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>
      </main>
      <Sheet open={isMobile && !!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <SheetContent className="p-0 w-full sm:max-w-lg">
          <FileInspector file={selectedFile} onClose={() => setSelectedFile(null)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
export function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="max-w-7xl mx-auto">
        <div className="py-0">
          <FileExplorer />
        </div>
      </div>
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}