import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { FolderPane } from '@/components/FileExplorer/FolderPane';
import { FileList } from '@/components/FileExplorer/FileList';
import { UploadDropzone } from '@/components/FileExplorer/UploadDropzone';
import { FileInspector } from '@/components/FileExplorer/FileInspector';
import { Button } from '@/components/ui/button';
import { Settings, FileUp, PanelLeft, Search, X } from 'lucide-react';
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
  const [channelId, setChannelId] = useState('');
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api<AppSettings>('/api/settings'),
  });
  useEffect(() => {
    if (settings) {
      setToken(settings.botToken || '');
      setChannelId(settings.channelId || '');
    }
  }, [settings]);
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<AppSettings>) => api<AppSettings>('/api/settings', { method: 'POST', body: JSON.stringify(newSettings) }),
    onSuccess: () => {
      tanstackQueryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings saved!');
    },
    onError: (error) => toast.error(`Failed to save settings: ${error.message}`),
  });
  const handleSave = () => {
    updateSettingsMutation.mutate({ botToken: token, channelId });
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
            <div className="space-y-2">
              <Label htmlFor="channel-id">Channel ID</Label>
              <Input id="channel-id" placeholder="@channel or -1001234567890" value={channelId} onChange={(e) => setChannelId(e.target.value)} />
              <p className="text-xs text-muted-foreground">The target channel for uploads. Use a username like @mychannel or the numeric ID e.g. -1001234567890.</p>
            </div>
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
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
  const folderPane = <FolderPane selectedFolderId={currentFolderId} onSelectFolder={handleSelectFolder} searchTerm={searchTerm} />;
  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between p-2 md:p-4 border-b shrink-0 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          {isMobile && (
            <Sheet open={isSidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon"><PanelLeft /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-[280px]">{folderPane}</SheetContent>
            </Sheet>
          )}
          <img src="/logo.svg" alt="TeleFile Logo" className="h-8 w-8" />
          <h1 className="text-xl md:text-2xl font-bold font-display text-primary hidden sm:block">TeleFile</h1>
        </div>
        <div className="flex-1 flex justify-center px-4">
          <AnimatePresence>
            {isMobile && showMobileSearch ? (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: "100%", opacity: 1 }} exit={{ width: 0, opacity: 0 }} className="relative w-full">
                <Input placeholder="Search all files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full" />
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowMobileSearch(false)}><X className="h-4 w-4" /></Button>
              </motion.div>
            ) : (
              <div className="relative w-full max-w-md hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search all files..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 w-full" />
              </div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {isMobile && !showMobileSearch && (
            <Button variant="ghost" size="icon" onClick={() => setShowMobileSearch(true)}><Search className="h-5 w-5" /></Button>
          )}
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
              <div className="mb-4">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {searchTerm ? 'Search Results' : currentFolder ? currentFolder.name : 'Home'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? `Showing results for "${searchTerm}"` : currentFolder ? 'Files in this folder' : 'Files in your root directory'}
                </p>
              </div>
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
                        queryClient.invalidateQueries({ queryKey: ['files', null] }); // Invalidate root for search
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              <FileList currentFolderId={currentFolderId} onSelectFile={handleSelectFile} toggleUploader={() => setShowUploader(true)} searchTerm={searchTerm} />
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
      <FileExplorer />
      <Toaster richColors closeButton />
    </QueryClientProvider>
  );
}