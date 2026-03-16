import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Star, ThumbsUp, MessageCircle, User, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  timestamp: Date;
  helpfulCount: number;
  isHelpful?: boolean;
  eventId?: string;
  serviceId?: string;
}

interface ReviewSystemProps {
  entityId: string;
  entityType: 'event' | 'service';
  canReview?: boolean;
  userBookingId?: string;
}

export const ReviewSystem = ({ 
  entityId, 
  entityType, 
  canReview = false,
  userBookingId 
}: ReviewSystemProps) => {
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      userId: '1',
      userName: 'أحمد محمد',
      rating: 5,
      comment: 'فعالية رائعة جداً! التنظيم كان ممتاز والموقع خلاب. أنصح الجميع بالمشاركة.',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      helpfulCount: 12,
      eventId: entityType === 'event' ? entityId : undefined,
      serviceId: entityType === 'service' ? entityId : undefined,
    },
    {
      id: '2',
      userId: '2', 
      userName: 'فاطمة علي',
      rating: 4,
      comment: 'استمتعت كثيراً، لكن كان هناك تأخير في البداية. عموماً تجربة جيدة.',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      helpfulCount: 8,
      eventId: entityType === 'event' ? entityId : undefined,
      serviceId: entityType === 'service' ? entityId : undefined,
    }
  ]);

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: ''
  });

  const { toast } = useToast();

  const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: (reviews.filter(r => r.rating === star).length / reviews.length) * 100
  }));

  const handleSubmitReview = () => {
    if (newReview.rating === 0) {
      toast({
        title: "تقييم مطلوب",
        description: "الرجاء اختيار تقييم قبل الإرسال",
        variant: "destructive"
      });
      return;
    }

    const review: Review = {
      id: Math.random().toString(),
      userId: 'current-user',
      userName: 'أنا',
      rating: newReview.rating,
      comment: newReview.comment,
      timestamp: new Date(),
      helpfulCount: 0,
      eventId: entityType === 'event' ? entityId : undefined,
      serviceId: entityType === 'service' ? entityId : undefined,
    };

    setReviews(prev => [review, ...prev]);
    setNewReview({ rating: 0, comment: '' });
    setShowReviewForm(false);
    
    toast({
      title: "تم إرسال التقييم",
      description: "شكراً لك على مشاركة تجربتك!",
    });
  };

  const handleHelpful = (reviewId: string) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId 
        ? { 
            ...review, 
            helpfulCount: review.isHelpful ? review.helpfulCount - 1 : review.helpfulCount + 1,
            isHelpful: !review.isHelpful 
          }
        : review
    ));
  };

  const renderStars = (rating: number, interactive = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={() => interactive && onRate && onRate(star)}
          />
        ))}
      </div>
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            التقييمات والمراجعات
          </CardTitle>
          <CardDescription>
            آراء المشاركين في هذا {entityType === 'event' ? 'الحدث' : 'الخدمة'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Average Rating */}
            <div className="text-center space-y-2">
              <div className="text-4xl font-bold text-primary">
                {averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(averageRating))}
              <p className="text-sm text-muted-foreground">
                من {reviews.length} مراجعة
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-2">{star}</span>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Write Review */}
      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>اكتب مراجعتك</CardTitle>
            <CardDescription>
              شارك تجربتك مع الآخرين
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showReviewForm ? (
              <Button onClick={() => setShowReviewForm(true)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                اكتب مراجعة
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">التقييم</label>
                  <div className="mt-2">
                    {renderStars(
                      newReview.rating, 
                      true, 
                      (rating) => setNewReview(prev => ({ ...prev, rating }))
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">التعليق (اختياري)</label>
                  <Textarea
                    placeholder="اكتب تجربتك مع هذا الحدث..."
                    value={newReview.comment}
                    onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSubmitReview}>
                    إرسال التقييم
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowReviewForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>جميع المراجعات ({reviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد مراجعات بعد</p>
                <p className="text-sm">كن أول من يشارك تجربته!</p>
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="border-b last:border-b-0 pb-6 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{review.userName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(review.rating)}
                            <span className="text-sm text-muted-foreground">
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(review.timestamp)}
                        </div>
                      </div>

                      {review.comment && (
                        <p className="text-sm leading-relaxed">
                          {review.comment}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHelpful(review.id)}
                          className={review.isHelpful ? 'text-primary' : ''}
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          مفيد ({review.helpfulCount})
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};