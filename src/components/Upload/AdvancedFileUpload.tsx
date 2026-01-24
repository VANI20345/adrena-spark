import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { 
  Upload, 
  File, 
  Image, 
  X, 
  Check, 
  AlertCircle, 
  Camera, 
  FileText,
  Film,
  Music,
  Archive,
  Paperclip,
  Eye,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploadProgress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  preview?: string;
}

interface AdvancedFileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  allowedTypes?: string[];
  showPreview?: boolean;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onFileRemoved?: (fileId: string) => void;
  uploadEndpoint?: string;
  bucket?: string;
  folder?: string;
}

const AdvancedFileUpload: React.FC<AdvancedFileUploadProps> = ({
  accept = "image/*,application/pdf,.doc,.docx",
  multiple = true,
  maxFileSize = 10, // 10MB default
  maxFiles = 10,
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword'],
  showPreview = true,
  onFilesUploaded,
  onFileRemoved,
  uploadEndpoint = '/api/upload',
  bucket = 'uploads',
  folder = 'general'
}) => {
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-5 h-5" />;
    if (type.startsWith('video/')) return <Film className="w-5 h-5" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
    if (type === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return t('fileTypeNotAllowed');
    }

    // Check file size
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return t('fileTooLarge') + `: ${formatFileSize(maxSizeBytes)}`;
    }

    return null;
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const fileArray = Array.from(fileList);
    
    // Check max files limit
    if (files.length + fileArray.length > maxFiles) {
      toast({
        title: t('tooManyFiles'),
        description: t('maxFilesAllowed') + `: ${maxFiles}`,
        variant: 'destructive'
      });
      return;
    }

    const newFiles: UploadedFile[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (validation) {
        toast({
          title: t('fileValidationError'),
          description: `${file.name}: ${validation}`,
          variant: 'destructive'
        });
        continue;
      }

      const preview = await createFilePreview(file);
      
      const uploadFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        uploadProgress: 0,
        status: 'pending',
        preview
      };

      newFiles.push(uploadFile);
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      uploadFiles(newFiles);
    }
  };

  const uploadFiles = async (filesToUpload: UploadedFile[]) => {
    setIsUploading(true);

    for (const uploadFile of filesToUpload) {
      try {
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploading' }
            : f
        ));

        // Simulate upload progress (replace with actual upload logic)
        await simulateUpload(uploadFile.id);

        // Mark as completed
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'completed', 
                uploadProgress: 100,
                url: URL.createObjectURL(uploadFile.file) // Temporary URL for demo
              }
            : f
        ));

      } catch (error) {
        // Mark as error
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: t('uploadFailed')
              }
            : f
        ));
      }
    }

    setIsUploading(false);
    
    // Call callback with completed files
    const completedFiles = files.filter(f => f.status === 'completed');
    onFilesUploaded?.(completedFiles);
  };

  const simulateUpload = (fileId: string): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, uploadProgress: Math.round(progress) }
            : f
        ));
      }, 200);
    });
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemoved?.(fileId);
  };

  const retryUpload = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      uploadFiles([{ ...file, status: 'pending', uploadProgress: 0, error: undefined }]);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const takePicture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      // Create a video element to capture the stream
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // You would implement camera capture UI here
      // For now, we'll just show a toast
      toast({
        title: t('cameraFeature'),
        description: t('cameraFeatureComingSoon')
      });
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      toast({
        title: t('cameraError'),
        description: t('cameraAccessDenied'),
        variant: 'destructive'
      });
    }
  };

  const downloadFile = (file: UploadedFile) => {
    if (file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.download = file.name;
      a.click();
    }
  };

  const previewFile = (file: UploadedFile) => {
    if (file.url) {
      window.open(file.url, '_blank');
    }
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const getUploadStats = () => {
    const total = files.length;
    const completed = files.filter(f => f.status === 'completed').length;
    const uploading = files.filter(f => f.status === 'uploading').length;
    const errors = files.filter(f => f.status === 'error').length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    return { total, completed, uploading, errors, totalSize };
  };

  const stats = getUploadStats();

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            {t('fileUpload')}
            {stats.total > 0 && (
              <Badge variant="secondary">
                {stats.completed}/{stats.total} {t('completed')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Upload Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className={`w-12 h-12 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">
                  {isDragging ? t('dropFilesHere') : t('uploadFiles')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('dragDropOrClick')}
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={openFileDialog} disabled={isUploading}>
                  <Paperclip className="w-4 h-4 mr-2" />
                  {t('chooseFiles')}
                </Button>
                
                <Button variant="outline" onClick={takePicture} disabled={isUploading}>
                  <Camera className="w-4 h-4 mr-2" />
                  {t('takePhoto')}
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>{t('maxFileSize')}: {maxFileSize}MB</p>
                <p>{t('maxFiles')}: {maxFiles}</p>
                <p>{t('supportedFormats')}: {allowedTypes.join(', ')}</p>
              </div>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Upload Statistics */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span>{t('totalFiles')}: {stats.total}</span>
                <span className="text-green-600">{t('completed')}: {stats.completed}</span>
                {stats.uploading > 0 && (
                  <span className="text-blue-600">{t('uploading')}: {stats.uploading}</span>
                )}
                {stats.errors > 0 && (
                  <span className="text-red-600">{t('errors')}: {stats.errors}</span>
                )}
                <span className="text-muted-foreground">
                  {t('totalSize')}: {formatFileSize(stats.totalSize)}
                </span>
              </div>
              
              <Button variant="outline" size="sm" onClick={clearAllFiles}>
                <Trash2 className="w-4 h-4 mr-2" />
                {t('clearAll')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('uploadedFiles')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-4 p-4 border rounded-lg"
              >
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {showPreview && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded border cursor-pointer"
                      onClick={() => previewFile(file)}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{file.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)} • {file.type}
                  </p>
                  
                  {/* Progress Bar */}
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={file.uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {file.uploadProgress}% {t('uploaded')}
                      </p>
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {file.status === 'error' && file.error && (
                    <p className="text-sm text-red-600 mt-1">{file.error}</p>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex-shrink-0">
                  {file.status === 'completed' && (
                    <Badge variant="secondary" className="text-green-600">
                      <Check className="w-3 h-3 mr-1" />
                      {t('completed')}
                    </Badge>
                  )}
                  
                  {file.status === 'uploading' && (
                    <Badge variant="secondary" className="text-blue-600">
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      {t('uploading')}
                    </Badge>
                  )}
                  
                  {file.status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {t('error')}
                    </Badge>
                  )}
                  
                  {file.status === 'pending' && (
                    <Badge variant="outline">
                      {t('pending')}
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {file.status === 'completed' && file.url && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => previewFile(file)}
                        title={t('preview')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => downloadFile(file)}
                        title={t('download')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  
                  {file.status === 'error' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => retryUpload(file.id)}
                      title={t('retry')}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFile(file.id)}
                    title={t('remove')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedFileUpload;