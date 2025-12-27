import React, { useState } from 'react';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, Video, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MediaUploadFieldProps {
  mediaType: 'image' | 'video';
  mediaFiles: File[];
  onMediaFilesChange: (files: File[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/mov'];

export const MediaUploadField: React.FC<MediaUploadFieldProps> = ({
  mediaType,
  mediaFiles,
  onMediaFilesChange
}) => {
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const isRTL = language === 'ar';

  const validateFile = (file: File): boolean => {
    const allowedTypes = mediaType === 'image' ? IMAGE_TYPES : VIDEO_TYPES;
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: isRTL ? 'نوع ملف غير صحيح' : 'Invalid file type',
        description: isRTL 
          ? `الرجاء اختيار ${mediaType === 'image' ? 'صورة (JPG, PNG, GIF, WEBP)' : 'فيديو (MP4, WEBM, MOV)'}`
          : `Please select a ${mediaType === 'image' ? 'JPG, PNG, GIF, or WEBP image' : 'MP4, WEBM, or MOV video'}`,
        variant: 'destructive'
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: isRTL ? 'حجم الملف كبير جداً' : 'File too large',
        description: isRTL ? 'الحد الأقصى لحجم الملف 10 ميجابايت' : 'Maximum file size is 10MB',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(validateFile);
    
    if (validFiles.length > 0) {
      onMediaFilesChange([...mediaFiles, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    onMediaFilesChange(mediaFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <Label>{isRTL ? 'رفع الوسائط' : 'Upload Media'}</Label>
      
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
        <input
          type="file"
          accept={mediaType === 'image' ? IMAGE_TYPES.join(',') : VIDEO_TYPES.join(',')}
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="media-upload"
        />
        <label htmlFor="media-upload" className="cursor-pointer flex flex-col items-center gap-2">
          {mediaType === 'image' ? (
            <ImageIcon className="w-10 h-10 text-muted-foreground" />
          ) : (
            <Video className="w-10 h-10 text-muted-foreground" />
          )}
          <div className="text-sm text-muted-foreground">
            <span className="text-primary font-medium">{isRTL ? 'انقر للرفع' : 'Click to upload'}</span>
            {' '}{isRTL ? 'أو اسحب وأفلت' : 'or drag and drop'}
          </div>
          <div className="text-xs text-muted-foreground">
            {mediaType === 'image' 
              ? (isRTL ? 'JPG, PNG, GIF, WEBP (حد أقصى 10 ميجابايت)' : 'JPG, PNG, GIF, WEBP (max 10MB)')
              : (isRTL ? 'MP4, WEBM, MOV (حد أقصى 10 ميجابايت)' : 'MP4, WEBM, MOV (max 10MB)')
            }
          </div>
        </label>
      </div>

      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {mediaFiles.map((file, index) => (
            <div key={index} className="relative group">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                {mediaType === 'image' ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={URL.createObjectURL(file)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeFile(index)}
              >
                <X className="w-4 h-4" />
              </Button>
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
