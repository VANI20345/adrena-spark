import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, Image as ImageIcon, Eye, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // في الميجابايت
  acceptedTypes?: string[];
  showPreview?: boolean;
  multiple?: boolean;
  label?: string;
}

interface UploadedFile {
  file: File;
  preview?: string;
  progress: number;
  id: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  maxFiles = 5,
  maxSize = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  showPreview = true,
  multiple = true,
  label = 'رفع الملفات'
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // فحص نوع الملف
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'نوع ملف غير مدعوم',
        description: `الأنواع المدعومة: ${acceptedTypes.map(type => type.split('/')[1]).join(', ')}`,
        variant: 'destructive'
      });
      return false;
    }

    // فحص حجم الملف
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: 'حجم الملف كبير جداً',
        description: `الحد الأقصى: ${maxSize} ميجابايت`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (selectedFiles: FileList) => {
    const newFiles: File[] = Array.from(selectedFiles);
    const validFiles: File[] = [];

    // فحص عدد الملفات
    if (files.length + newFiles.length > maxFiles) {
      toast({
        title: 'عدد كبير من الملفات',
        description: `يمكنك رفع ${maxFiles} ملفات كحد أقصى`,
        variant: 'destructive'
      });
      return;
    }

    // التحقق من صحة الملفات
    for (const file of newFiles) {
      if (validateFile(file)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    setUploading(true);

    const uploadedFiles: UploadedFile[] = await Promise.all(
      validFiles.map(async (file, index) => {
        const id = Date.now() + index;
        let preview: string | undefined;

        // إنشاء معاينة للصور
        if (file.type.startsWith('image/') && showPreview) {
          preview = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        }

        // محاكاة تحميل الملف
        const uploadProgress = { progress: 0 };
        const uploadInterval = setInterval(() => {
          uploadProgress.progress += Math.random() * 20;
          if (uploadProgress.progress >= 100) {
            uploadProgress.progress = 100;
            clearInterval(uploadInterval);
          }
        }, 200);

        await new Promise(resolve => {
          const checkProgress = () => {
            if (uploadProgress.progress >= 100) {
              resolve(true);
            } else {
              setTimeout(checkProgress, 100);
            }
          };
          checkProgress();
        });

        return {
          file,
          preview,
          progress: 100,
          id: id.toString()
        };
      })
    );

    const updatedFiles = [...files, ...uploadedFiles];
    setFiles(updatedFiles);
    setUploading(false);
    
    onFileUpload(updatedFiles.map(f => f.file));
    
    toast({
      title: 'تم رفع الملفات بنجاح',
      description: `تم رفع ${validFiles.length} ملف`
    });
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFileUpload(updatedFiles.map(f => f.file));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-6 h-6" />;
    }
    return <FileText className="w-6 h-6" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">{label}</label>
        <Card 
          className={`border-2 border-dashed transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                اسحب الملفات هنا أو 
                <Button
                  type="button"
                  variant="link"
                  className="px-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  اختر ملفات
                </Button>
              </p>
              <p className="text-sm text-muted-foreground">
                الأنواع المدعومة: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}
              </p>
              <p className="text-xs text-muted-foreground">
                حد أقصى {maxSize} ميجابايت لكل ملف • حد أقصى {maxFiles} ملفات
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple={multiple}
              accept={acceptedTypes.join(',')}
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>

      {/* قائمة الملفات المرفوعة */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-sm">الملفات المرفوعة ({files.length})</h4>
          <div className="space-y-2">
            {files.map((uploadedFile) => (
              <Card key={uploadedFile.id} className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {uploadedFile.preview ? (
                      <div className="relative">
                        <img 
                          src={uploadedFile.preview} 
                          alt={uploadedFile.file.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute -top-1 -right-1 w-6 h-6 p-0"
                          onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              newWindow.document.write(`
                                <img src="${uploadedFile.preview}" style="max-width:100%; height:auto;" />
                              `);
                            }
                          }}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-secondary rounded flex items-center justify-center">
                        {getFileIcon(uploadedFile.file.type)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">
                        {uploadedFile.file.name}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(uploadedFile.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatFileSize(uploadedFile.file.size)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {uploadedFile.file.type.split('/')[1].toUpperCase()}
                      </Badge>
                    </div>
                    
                    {uploadedFile.progress < 100 && (
                      <Progress 
                        value={uploadedFile.progress} 
                        className="mt-2 h-2"
                      />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">جاري رفع الملفات...</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;