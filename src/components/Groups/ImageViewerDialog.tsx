import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImageViewerDialogProps {
  images: string[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  caption?: string;
}

export const ImageViewerDialog: React.FC<ImageViewerDialogProps> = ({
  images,
  currentIndex,
  open,
  onClose,
  caption
}) => {
  const [index, setIndex] = React.useState(currentIndex);

  React.useEffect(() => {
    setIndex(currentIndex);
  }, [currentIndex]);

  const goToPrevious = () => {
    setIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const goToNext = () => {
    setIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 bg-black/95">
        <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
          {caption && (
            <p className="text-white text-sm mt-12 px-4">{caption}</p>
          )}
        </DialogHeader>

        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={images[index]}
            alt={`Image ${index + 1}`}
            className="max-w-full max-h-full object-contain"
          />

          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 text-white hover:bg-white/20 rounded-full"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 text-white hover:bg-white/20 rounded-full"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === index ? 'bg-white w-6' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
