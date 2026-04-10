import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, Users, DollarSign, Clock } from 'lucide-react';

interface EventServiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  type: 'event' | 'service';
}

export const EventServiceDetailsDialog = ({ open, onOpenChange, item, type }: EventServiceDetailsDialogProps) => {
  if (!item) return null;

  const isEvent = type === 'event';
  const title = isEvent ? item.title_ar : item.name_ar;
  const description = isEvent ? item.description_ar : item.description_ar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Image */}
          {item.image_url && (
            <div className="w-full h-64 rounded-lg overflow-hidden">
              <img 
                src={item.image_url} 
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Status Badge */}
          <Badge variant={item.status === 'pending' ? 'secondary' : 'default'}>
            {item.status === 'pending' ? 'قيد المراجعة' : item.status}
          </Badge>

          {/* Description */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">الوصف</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{description}</p>
            </CardContent>
          </Card>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isEvent ? (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">تاريخ البداية</span>
                    </div>
                    <p className="font-medium">
                      {new Date(item.start_date).toLocaleDateString('ar-SA', {
                        dateStyle: 'full'
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">تاريخ النهاية</span>
                    </div>
                    <p className="font-medium">
                      {new Date(item.end_date).toLocaleDateString('ar-SA', {
                        dateStyle: 'full'
                      })}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">الموقع</span>
                    </div>
                    <p className="font-medium">{item.location_ar || item.location}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">الحضور</span>
                    </div>
                    <p className="font-medium">
                      {item.current_attendees} / {item.max_attendees || 'غير محدود'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">السعر</span>
                    </div>
                    <p className="font-medium">
                      {item.price > 0 ? `${item.price} ريال` : 'مجاني'}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">الموقع</span>
                    </div>
                    <p className="font-medium">{item.location_ar || item.location || 'غير محدد'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">السعر</span>
                    </div>
                    <p className="font-medium">{item.price} ريال</p>
                  </CardContent>
                </Card>

                {item.duration_minutes && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">المدة</span>
                      </div>
                      <p className="font-medium">{item.duration_minutes} دقيقة</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Additional Info */}
          {isEvent && (
            <>
              {item.requires_license && (
                <Card className="border-yellow-500">
                  <CardContent className="pt-6">
                    <p className="text-sm font-medium">تتطلب هذه الفعالية رخصة</p>
                  </CardContent>
                </Card>
              )}
              
              {item.cancellation_policy && (
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">سياسة الإلغاء</h3>
                    <p className="text-sm text-muted-foreground">{item.cancellation_policy}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
