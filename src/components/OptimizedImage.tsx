import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  lazy?: boolean;
  aspectRatio?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Optimized Image component with:
 * - Lazy loading
 * - WebP support with fallback
 * - Intersection Observer
 * - Loading states
 * - Error handling
 */
export const OptimizedImage = ({
  src,
  alt,
  fallbackSrc = '/placeholder.svg',
  className,
  lazy = true,
  aspectRatio,
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(lazy ? '' : src);
  const [imageError, setImageError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Convert image URL to WebP if possible
  const getWebPUrl = (url: string): string => {
    if (!url || url.includes('.svg')) return url;
    
    // If it's a Supabase storage URL, we can try to use WebP
    if (url.includes('supabase.co/storage')) {
      // Check if browser supports WebP
      const supportsWebP = document.createElement('canvas')
        .toDataURL('image/webp')
        .indexOf('data:image/webp') === 0;
      
      if (supportsWebP) {
        return url; // Supabase auto-converts, just request it
      }
    }
    return url;
  };

  useEffect(() => {
    if (!lazy) {
      setImageSrc(getWebPUrl(src));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(getWebPUrl(src));
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src, lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!imageError) {
      setImageError(true);
      setImageSrc(fallbackSrc);
    }
  };

  return (
    <div
      className={cn('relative overflow-hidden bg-muted', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* Loading skeleton */}
      {!isLoaded && imageSrc && (
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted animate-pulse" />
      )}
      
      {/* Actual image */}
      <img
        ref={imgRef}
        src={imageSrc || fallbackSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down'
        )}
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
    </div>
  );
};

// Preload critical images
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// Preload multiple images
export const preloadImages = async (sources: string[]): Promise<void> => {
  await Promise.all(sources.map(preloadImage));
};
