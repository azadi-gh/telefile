import React, { useCallback, useState, useRef } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { UploadCloud, X, File as FileIcon, Link as LinkIcon, Send } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
interface UploadDropzoneProps {
  currentFolderId: string | null
  onUploadComplete: () => void
}
interface UploadableItem {
  id: string
  name: string
  size?: number
  progress: number
  error?: string
  source: 'file' | 'url'
}
export function UploadDropzone({ currentFolderId, onUploadComplete }: UploadDropzoneProps) {
  const [items, setItems] = useState<UploadableItem[]>([])
  const [url, setUrl] = useState('')
  const queryClient = useQueryClient()
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        const json = await response.json()
        if (!response.ok || !json.success) {
          throw new Error(json.error || 'Upload failed')
        }
        return json.data
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Network error or server issue: ${error.message}`)
        }
        throw new Error('An unknown error occurred during upload.')
      }
    },
    onSuccess: (data, variables) => {
      const id = variables.get('id') as string
      setItems(prev => prev.map(item => (item.id === id ? { ...item, progress: 100 } : item)))
      setTimeout(() => {
        setItems(prev => prev.filter(item => item.id !== id))
      }, 1000)
      queryClient.invalidateQueries({ queryKey: ['files', currentFolderId] })
      queryClient.invalidateQueries({ queryKey: ['files', null] }); // Invalidate search results
      onUploadComplete()
      toast.success('File uploaded successfully!')
    },
    onError: (error: Error, variables) => {
      const id = variables.get('id') as string
      setItems(prev => prev.map(item => (item.id === id ? { ...item, error: error.message, progress: 0 } : item)))
      toast.error(`Upload failed: ${error.message}`)
    },
  })
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newItems: UploadableItem[] = acceptedFiles.map(file => ({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        progress: 0,
        source: 'file',
      }))
      setItems(prev => [...prev, ...newItems])
      newItems.forEach((item, index) => {
        const file = acceptedFiles[index]
        const formData = new FormData()
        formData.append('file', file)
        if (currentFolderId) {
          formData.append('folderId', currentFolderId)
        }
        formData.append('id', item.id)
        setItems(prev => prev.map(p => (p.id === item.id ? { ...p, progress: 10 } : p)))
        uploadMutation.mutate(formData)
      })
    },
    [currentFolderId, uploadMutation]
  )
  const handleUrlUpload = useCallback(() => {
    let validUrl;
    try {
      validUrl = new URL(url)
    } catch (e) {
      toast.error('Invalid URL. Please enter a full URL including http/https.')
      return
    }
    const newItem: UploadableItem = {
      id: crypto.randomUUID(),
      name: validUrl.href,
      progress: 0,
      source: 'url',
    }
    setItems(prev => [...prev, newItem])
    setUrl('')
    const formData = new FormData()
    formData.append('url', validUrl.href)
    if (currentFolderId) {
      formData.append('folderId', currentFolderId)
    }
    formData.append('id', newItem.id)
    setItems(prev => prev.map(p => (p.id === newItem.id ? { ...p, progress: 10 } : p)))
    uploadMutation.mutate(formData)
  }, [url, currentFolderId, uploadMutation]);
  const fileInputRef = useRef<HTMLInputElement | null>(null)
const [isDragActive, setIsDragActive] = useState(false)

const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = e.target.files ? Array.from(e.target.files) : []
  if (files.length) onDrop(files)
}

const rootProps = {
  onDragOver: (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  },
  onDragEnter: (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(true)
  },
  onDragLeave: (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
  },
  onDrop: (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragActive(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) onDrop(files)
  },
  onClick: () => fileInputRef.current?.click(),
}

const inputProps = {
  ref: fileInputRef,
  multiple: true,
  onChange: onFileInputChange,
  type: 'file' as const,
}
  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }
  return (
    <div className="space-y-4">
      <Card
        {...rootProps}
        className={cn(
          'border-2 border-dashed hover:border-primary/80 transition-colors duration-200 cursor-pointer',
          isDragActive && 'border-primary bg-primary/10'
        )}
      >
        <CardContent className="p-6 text-center">
          <input {...inputProps} />
          <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
            <UploadCloud className="w-12 h-12" />
            <p className="text-lg font-medium">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here, or click to select'}
            </p>
            <p className="text-sm">Max file size 2MB (for this demo)</p>
          </div>
        </CardContent>
      </Card>
      <motion.div
        className="relative"
        whileHover={{ scale: 1.02 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      >
        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Or paste a URL to upload"
          className="pl-9"
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleUrlUpload()}
        />
        <Button
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
          onClick={handleUrlUpload}
          disabled={!url.trim() || uploadMutation.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </motion.div>
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Uploading Files</h4>
          {items.map(({ id, name, size, progress, error, source }) => (
            <Card key={id} className={cn('p-2', error && 'bg-destructive/10 border-destructive')}>
              <div className="flex items-center gap-3">
                {source === 'file' ? (
                  <FileIcon className="w-6 h-6 text-muted-foreground" />
                ) : (
                  <LinkIcon className="w-6 h-6 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium truncate">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {error ? (
                      <span className="text-destructive">{error}</span>
                    ) : size ? (
                      `${(size / 1024).toFixed(1)} KB`
                    ) : (
                      'Fetching from URL...'
                    )}
                  </p>
                  {!error && <Progress value={progress} className="h-1 mt-1" />}
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeItem(id)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}