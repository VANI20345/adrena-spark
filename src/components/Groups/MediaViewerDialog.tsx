import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaViewerDialogProps {
  media: MediaItem[];
  currentIndex: number;
  open: boolean;
  onClose: () => void;
  caption?: string;
}

export const MediaViewerDialog: React.FC<MediaViewerDialogProps> = ({
  media,
  currentIndex,
  open,
  onClose,
  caption
}) => {
  const [index, setIndex] = useState(currentIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIndex(currentIndex);
    resetZoom();
  }, [currentIndex]);

  useEffect(() => {
    if (!open) {
      setIsPlaying(false);
      resetZoom();
    }
  }, [open]);

  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const goToPrevious = () => {
    setIsPlaying(false);
    resetZoom();
    setIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const goToNext = () => {
    setIsPlaying(false);
    resetZoom();
    setIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') handleZoomIn();
    if (e.key === '-') handleZoomOut();
  }, []);

  useEffect(() => {
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };

  const currentMedia = media[index];
  if (!currentMedia) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] md:max-w-[95vw] w-full h-[100vh] md:h-[95vh] p-0 bg-black border-none overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-start justify-between">
          <div className="flex-1">
            {caption && (
              <p className="text-white text-sm mt-8 md:mt-0 pr-12 line-clamp-2">{caption}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {currentMedia.type === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  className="text-white hover:bg-white/20 h-9 w-9"
                  disabled={zoom >= 4}
                >
                  <ZoomIn className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  className="text-white hover:bg-white/20 h-9 w-9"
                  disabled={zoom <= 1}
                >
                  <ZoomOut className="w-5 h-5" />
                </Button>
                {zoom > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetZoom}
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-9 w-9"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Media Container */}
        <div 
          className="relative w-full h-full flex items-center justify-center select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          {currentMedia.type === 'video' ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={currentMedia.url}
                className="max-w-full max-h-full object-contain"
                playsInline
                muted={isMuted}
                loop
                onClick={togglePlay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              {/* Video Controls */}
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePlay}
                  className="text-white hover:bg-white/20 h-10 w-10"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 h-10 w-10"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          ) : (
            <img
              ref={imageRef}
              src={currentMedia.url}
              alt={`Media ${index + 1}`}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
                maxHeight: 'calc(100vh - 120px)'
              }}
              draggable={false}
            />
          )}

          {/* Navigation Arrows */}
          {media.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-2 md:left-4 text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/40"
              >
                <ChevronLeft className="w-7 h-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-2 md:right-4 text-white hover:bg-white/20 rounded-full h-12 w-12 bg-black/40"
              >
                <ChevronRight className="w-7 h-7" />
              </Button>
            </>
          )}
        </div>

        {/* Dots indicator */}
        {media.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2">
            {media.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); resetZoom(); }}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'bg-white w-6' : 'bg-white/50 w-2 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* Counter */}
        {media.length > 1 && (
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full mt-8 md:mt-0">
            {index + 1} / {media.length}
          </div>
        )}

        {/* Zoom indicator */}
        {zoom > 1 && (
          <div className="absolute bottom-6 right-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};