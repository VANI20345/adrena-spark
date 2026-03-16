import React from 'react';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GuestBlurOverlayProps {
  children: React.ReactNode;
  isGuest: boolean;
  title: string;
  subtitle: string;
  buttonText: string;
}

const GuestBlurOverlay: React.FC<GuestBlurOverlayProps> = ({
  children,
  isGuest,
  title,
  subtitle,
  buttonText
}) => {
  if (!isGuest) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-[60vh]">
      {/* Blurred content */}
      <div className="blur-md pointer-events-none select-none opacity-50">
        {children}
      </div>
      
      {/* Overlay with login prompt */}
      <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm z-40">
        <Card className="max-w-md mx-4 text-center shadow-2xl border-primary/20">
          <CardContent className="p-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-foreground">
              {title}
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {subtitle}
            </p>
            <Button asChild size="lg" className="w-full text-lg py-6">
              <Link to="/auth">{buttonText}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GuestBlurOverlay;
