'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Upload,
  Link,
  AlertTriangle,
  FileCheck,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const MAX_FILE_SIZE_LABEL = '2MB';

const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

interface InsertImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsertImageDialog({ open, onOpenChange }: InsertImageDialogProps) {
  // URL tab state
  const [imageUrl, setImageUrl] = useState('');
  const [altText, setAltText] = useState('');
  const [urlPreviewError, setUrlPreviewError] = useState(false);

  // Upload tab state
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    dataUri: string;
  } | null>(null);
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<string>('url');

  const resetState = useCallback(() => {
    setImageUrl('');
    setAltText('');
    setUrlPreviewError(false);
    setUploadedFile(null);
    setUploadAltText('');
    setUploadError(null);
    setIsDragOver(false);
    setIsProcessing(false);
    setActiveTab('url');
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        resetState();
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, resetState]
  );

  // ---- URL tab handlers ----

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleInsertFromUrl = () => {
    if (!imageUrl.trim() || !isValidUrl(imageUrl.trim())) return;
    const alt = altText.trim() || 'image';
    const markdown = `\n\n![${alt}](${imageUrl.trim()})\n`;
    const currentContent = useAppStore.getState().content;
    useAppStore.getState().setContent(currentContent + markdown);
    handleOpenChange(false);
  };

  // ---- Upload tab handlers ----

  const processImageFile = useCallback((file: File) => {
    setUploadError(null);
    setUploadedFile(null);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setUploadError(
        'Unsupported file type. Please upload a PNG, JPEG, GIF, WebP, or SVG image.'
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError(
        `File size exceeds ${MAX_FILE_SIZE_LABEL}. Please choose a smaller image.`
      );
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setUploadedFile({ name: file.name, dataUri });
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the file. Please try again.');
      setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        processImageFile(file);
      }
    },
    [processImageFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processImageFile(file);
      }
      e.target.value = '';
    },
    [processImageFile]
  );

  const handleInsertFromUpload = () => {
    if (!uploadedFile) return;
    const alt = uploadAltText.trim() || uploadedFile.name.replace(/\.[^.]+$/, '');
    const markdown = `\n\n![${alt}](${uploadedFile.dataUri})\n`;
    const currentContent = useAppStore.getState().content;
    useAppStore.getState().setContent(currentContent + markdown);
    handleOpenChange(false);
  };

  const canInsertUrl = imageUrl.trim() !== '' && isValidUrl(imageUrl.trim());
  const canInsertUpload = uploadedFile !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            Insert Image
          </DialogTitle>
          <DialogDescription>
            Add an image from a URL or upload one from your device.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1 gap-1.5">
              <Link className="size-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex-1 gap-1.5">
              <Upload className="size-3.5" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* ---- URL tab ---- */}
          <TabsContent value="url" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="image-url" className="text-xs">
                Image URL
              </Label>
              <Input
                id="image-url"
                type="url"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setUrlPreviewError(false);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="alt-text" className="text-xs">
                Alt text{' '}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="alt-text"
                type="text"
                placeholder="Describe the image..."
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
              />
            </div>

            {/* URL preview */}
            {imageUrl && isValidUrl(imageUrl) && (
              <div className="overflow-hidden rounded-lg border bg-muted/30 p-2">
                {urlPreviewError ? (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                    <AlertTriangle className="size-3.5" />
                    Could not load preview
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imageUrl}
                    alt={altText || 'Preview'}
                    onError={() => setUrlPreviewError(true)}
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="mx-auto max-h-40 rounded-md object-contain"
                  />
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleInsertFromUrl}
                disabled={!canInsertUrl}
                className="gap-1.5"
                size="sm"
              >
                <ImageIcon className="size-3.5" />
                Insert Image
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* ---- Upload tab ---- */}
          <TabsContent value="upload" className="space-y-3 pt-2">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all duration-200',
                isDragOver
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
                  : 'border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50'
              )}
            >
              {isProcessing ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                <Upload
                  className={cn(
                    'size-6 transition-colors',
                    isDragOver
                      ? 'text-blue-500 dark:text-blue-400'
                      : 'text-muted-foreground'
                  )}
                />
              )}
              <div>
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    isDragOver
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-muted-foreground'
                  )}
                >
                  {isProcessing
                    ? 'Processing...'
                    : 'Drop an image here or click to upload'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  PNG, JPEG, GIF, WebP, SVG &mdash; max {MAX_FILE_SIZE_LABEL}
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                tabIndex={-1}
              />
            </div>

            {/* Upload error */}
            {uploadError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs text-destructive"
              >
                <AlertTriangle className="size-3" />
                {uploadError}
              </motion.div>
            )}

            {/* Uploaded file indicator and preview */}
            {uploadedFile && !uploadError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <FileCheck className="size-3" />
                  {uploadedFile.name}
                </div>
                <div className="overflow-hidden rounded-lg border bg-muted/30 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={uploadedFile.dataUri}
                    alt={uploadAltText || 'Uploaded preview'}
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="mx-auto max-h-40 rounded-md object-contain"
                  />
                </div>
              </motion.div>
            )}

            {/* Alt text for upload */}
            {uploadedFile && (
              <div className="space-y-1.5">
                <Label htmlFor="upload-alt-text" className="text-xs">
                  Alt text{' '}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="upload-alt-text"
                  type="text"
                  placeholder="Describe the image..."
                  value={uploadAltText}
                  onChange={(e) => setUploadAltText(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleInsertFromUpload}
                disabled={!canInsertUpload}
                className="gap-1.5"
                size="sm"
              >
                <ImageIcon className="size-3.5" />
                Insert Image
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
