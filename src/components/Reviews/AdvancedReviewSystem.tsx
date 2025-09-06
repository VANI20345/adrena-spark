import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { 
  Star, 
  StarHalf, 
  Camera, 
  Upload, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  Flag,
  Filter,
  TrendingUp,
  Award,
  Verified,
  Calendar,
  User,
  Image as ImageIcon,
  X,
  Check
} from 'lucide-react';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isVerifiedBooking: boolean;
  rating: number;
  categoryRatings: {
    organization: number;
    value: number;
    safety: number;
    experience: number;
    guide: number;
  };
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  notHelpful: number;
  userVote?: 'helpful' | 'notHelpful';
  createdAt: Date;
  updatedAt?: Date;
  eventTitle: string;
  eventDate: Date;
  isRecommended: boolean;
  pros?: string[];
  cons?: string[];
  tags?: string[];
  response?: {
    text: string;
    responderName: string;
    respondedAt: Date;
  };
}

interface ReviewSummary {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  categoryAverages: {
    organization: number;
    value: number;
    safety: number;
    experience: number;
    guide: number;
  };
  recommendationRate: number;
  mostMentionedPros: string[];
  mostMentionedCons: string[];
}

interface AdvancedReviewSystemProps {
  entityId: string;
  entityType: 'event' | 'service';
  canReview?: boolean;
  userBookingId?: string;
  showWriteReview?: boolean;
  allowImages?: boolean;
  onReviewSubmitted?: (review: Review) => void;
}

const AdvancedReviewSystem: React.FC<AdvancedReviewSystemProps> = ({
  entityId,
  entityType,
  canReview = false,
  userBookingId,
  showWriteReview = true,
  allowImages = true,
  onReviewSubmitted
}) => {
  const { t, isRTL } = useLanguageContext();
  const { toast } = useToast();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'rating' | 'helpful'>('newest');
  const [filterRating, setFilterRating] = useState<number>(0);
  const [filterVerified, setFilterVerified] = useState(false);
  
  // Review form state
  const [newReview, setNewReview] = useState({
    rating: 0,
    categoryRatings: {
      organization: 0,
      value: 0,
      safety: 0,
      experience: 0,
      guide: 0
    },
    title: '',
    comment: '',
    isRecommended: true,
    pros: [''],
    cons: [''],
    images: [] as File[]
  });
  
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState('');
  const [hoveredCategoryRating, setHoveredCategoryRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data for demonstration
  const mockReviews: Review[] = [
    {
      id: '1',
      userId: 'user-1',
      userName: 'أحمد محمد',
      userAvatar: '/api/placeholder/40/40',
      isVerifiedBooking: true,
      rating: 5,
      categoryRatings: {
        organization: 5,
        value: 4,
        safety: 5,
        experience: 5,
        guide: 5
      },
      title: 'تجربة رائعة ومنظمة بشكل ممتاز',
      comment: 'كانت رحلة هايكنج جبل طويق تجربة لا تُنسى. التنظيم كان ممتازاً والمرشد السياحي كان محترفاً جداً. المناظر الطبيعية خلابة والأمان كان أولوية قصوى.',
      images: ['/api/placeholder/200/150', '/api/placeholder/200/150'],
      helpful: 24,
      notHelpful: 1,
      createdAt: new Date('2024-02-15T10:30:00'),
      eventTitle: 'هايكنج جبل طويق المتقدم',
      eventDate: new Date('2024-02-10T08:00:00'),
      isRecommended: true,
      pros: ['تنظيم ممتاز', 'مرشد محترف', 'مناظر خلابة'],
      cons: ['وقت مبكر للانطلاق'],
      tags: ['مغامرة', 'طبيعة', 'هايكنج'],
      response: {
        text: 'شكراً لك أحمد على هذا التقييم الرائع! نسعد دائماً بتوفير تجارب استثنائية لضيوفنا الكرام.',
        responderName: 'فريق Adventure Saudi',
        respondedAt: new Date('2024-02-16T14:20:00')
      }
    },
    {
      id: '2',
      userId: 'user-2',
      userName: 'فاطمة علي',
      isVerifiedBooking: true,
      rating: 4,
      categoryRatings: {
        organization: 4,
        value: 5,
        safety: 4,
        experience: 4,
        guide: 3
      },
      title: 'تجربة جميلة مع بعض التحفظات',
      comment: 'الفعالية كانت جميلة والسعر مناسب جداً، لكن كان يمكن تحسين التواصل من قبل المرشد. بشكل عام تجربة جيدة وأنصح بها.',
      helpful: 12,
      notHelpful: 3,
      createdAt: new Date('2024-02-12T16:45:00'),
      eventTitle: 'هايكنج جبل طويق المتقدم',
      eventDate: new Date('2024-02-10T08:00:00'),
      isRecommended: true,
      pros: ['سعر مناسب', 'تجربة جميلة'],
      cons: ['تواصل المرشد يحتاج تحسين'],
      tags: ['قيمة مقابل المال']
    },
    {
      id: '3',
      userId: 'user-3',
      userName: 'خالد السعدي',
      isVerifiedBooking: false,
      rating: 3,
      categoryRatings: {
        organization: 3,
        value: 3,
        safety: 4,
        experience: 3,
        guide: 2
      },
      title: 'تجربة متوسطة',
      comment: 'الفعالية كانت عادية، لم تكن بالمستوى المتوقع. التنظيم يحتاج تحسين والخدمات المقدمة لا تتناسب مع السعر.',
      helpful: 5,
      notHelpful: 8,
      createdAt: new Date('2024-02-08T12:20:00'),
      eventTitle: 'هايكنج جبل طويق المتقدم',
      eventDate: new Date('2024-02-05T08:00:00'),
      isRecommended: false,
      cons: ['تنظيم ضعيف', 'خدمات لا تتناسب مع السعر'],
      tags: ['مخيب للآمال']
    }
  ];

  useEffect(() => {
    setReviews(mockReviews);
    calculateSummary(mockReviews);
  }, []);

  const calculateSummary = (reviewList: Review[]): void => {
    if (reviewList.length === 0) {
      setSummary(null);
      return;
    }

    const totalReviews = reviewList.length;
    const averageRating = reviewList.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
    
    const ratingDistribution = {
      5: reviewList.filter(r => r.rating === 5).length,
      4: reviewList.filter(r => r.rating === 4).length,
      3: reviewList.filter(r => r.rating === 3).length,
      2: reviewList.filter(r => r.rating === 2).length,
      1: reviewList.filter(r => r.rating === 1).length,
    };

    const categoryAverages = {
      organization: reviewList.reduce((sum, r) => sum + r.categoryRatings.organization, 0) / totalReviews,
      value: reviewList.reduce((sum, r) => sum + r.categoryRatings.value, 0) / totalReviews,
      safety: reviewList.reduce((sum, r) => sum + r.categoryRatings.safety, 0) / totalReviews,
      experience: reviewList.reduce((sum, r) => sum + r.categoryRatings.experience, 0) / totalReviews,
      guide: reviewList.reduce((sum, r) => sum + r.categoryRatings.guide, 0) / totalReviews,
    };

    const recommendationRate = (reviewList.filter(r => r.isRecommended).length / totalReviews) * 100;

    // Aggregate pros and cons
    const allPros = reviewList.flatMap(r => r.pros || []);
    const allCons = reviewList.flatMap(r => r.cons || []);
    
    const prosCount = allPros.reduce((acc, pro) => {
      acc[pro] = (acc[pro] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const consCount = allCons.reduce((acc, con) => {
      acc[con] = (acc[con] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostMentionedPros = Object.entries(prosCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pro]) => pro);
      
    const mostMentionedCons = Object.entries(consCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([con]) => con);

    setSummary({
      totalReviews,
      averageRating,
      ratingDistribution,
      categoryAverages,
      recommendationRate,
      mostMentionedPros,
      mostMentionedCons
    });
  };

  const renderStars = (rating: number, interactive: boolean = false, onRate?: (rating: number) => void, category?: string): JSX.Element => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star
            key={`full-${i}`}
            className={`w-4 h-4 fill-yellow-400 text-yellow-400 ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
            onClick={() => interactive && onRate?.(i + 1)}
            onMouseEnter={() => {
              if (interactive && category) {
                setHoveredCategory(category);
                setHoveredCategoryRating(i + 1);
              } else if (interactive) {
                setHoveredRating(i + 1);
              }
            }}
            onMouseLeave={() => {
              if (interactive && category) {
                setHoveredCategory('');
                setHoveredCategoryRating(0);
              } else if (interactive) {
                setHoveredRating(0);
              }
            }}
          />
        ))}
        
        {hasHalfStar && (
          <StarHalf className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        )}
        
        {[...Array(emptyStars)].map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={`w-4 h-4 text-gray-300 ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''
            }`}
            onClick={() => interactive && onRate?.(fullStars + (hasHalfStar ? 1 : 0) + i + 1)}
            onMouseEnter={() => {
              if (interactive && category) {
                setHoveredCategory(category);
                setHoveredCategoryRating(fullStars + (hasHalfStar ? 1 : 0) + i + 1);
              } else if (interactive) {
                setHoveredRating(fullStars + (hasHalfStar ? 1 : 0) + i + 1);
              }
            }}
            onMouseLeave={() => {
              if (interactive && category) {
                setHoveredCategory('');
                setHoveredCategoryRating(0);
              } else if (interactive) {
                setHoveredRating(0);
              }
            }}
          />
        ))}
      </div>
    );
  };

  const handleVote = (reviewId: string, voteType: 'helpful' | 'notHelpful') => {
    setReviews(prev => prev.map(review => {
      if (review.id === reviewId) {
        const updated = { ...review };
        
        // Remove previous vote if exists
        if (review.userVote === 'helpful') {
          updated.helpful -= 1;
        } else if (review.userVote === 'notHelpful') {
          updated.notHelpful -= 1;
        }
        
        // Add new vote if different from current
        if (review.userVote !== voteType) {
          if (voteType === 'helpful') {
            updated.helpful += 1;
          } else {
            updated.notHelpful += 1;
          }
          updated.userVote = voteType;
        } else {
          // Remove vote if same as current
          updated.userVote = undefined;
        }
        
        return updated;
      }
      return review;
    }));
  };

  const submitReview = async () => {
    if (newReview.rating === 0) {
      toast({
        title: t('error'),
        description: t('pleaseSelectRating'),
        variant: 'destructive'
      });
      return;
    }

    if (!newReview.comment.trim()) {
      toast({
        title: t('error'),
        description: t('pleaseWriteComment'),
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const review: Review = {
        id: Date.now().toString(),
        userId: 'current-user',
        userName: 'المستخدم الحالي',
        isVerifiedBooking: !!userBookingId,
        rating: newReview.rating,
        categoryRatings: newReview.categoryRatings,
        title: newReview.title,
        comment: newReview.comment,
        helpful: 0,
        notHelpful: 0,
        createdAt: new Date(),
        eventTitle: 'الفعالية الحالية',
        eventDate: new Date(),
        isRecommended: newReview.isRecommended,
        pros: newReview.pros.filter(p => p.trim()),
        cons: newReview.cons.filter(c => c.trim()),
        tags: []
      };

      setReviews(prev => [review, ...prev]);
      calculateSummary([review, ...reviews]);
      setShowReviewForm(false);
      
      // Reset form
      setNewReview({
        rating: 0,
        categoryRatings: {
          organization: 0,
          value: 0,
          safety: 0,
          experience: 0,
          guide: 0
        },
        title: '',
        comment: '',
        isRecommended: true,
        pros: [''],
        cons: [''],
        images: []
      });

      toast({
        title: t('reviewSubmitted'),
        description: t('thankYouForReview')
      });

      onReviewSubmitted?.(review);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failedToSubmitReview'),
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredAndSortedReviews = () => {
    let filtered = reviews;

    if (filterRating > 0) {
      filtered = filtered.filter(r => r.rating === filterRating);
    }

    if (filterVerified) {
      filtered = filtered.filter(r => r.isVerifiedBooking);
    }

    // Sort reviews
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'oldest':
          return a.createdAt.getTime() - b.createdAt.getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'helpful':
          return b.helpful - a.helpful;
        default:
          return 0;
      }
    });

    return filtered;
  };

  const addProsCons = (type: 'pros' | 'cons') => {
    setNewReview(prev => ({
      ...prev,
      [type]: [...prev[type], '']
    }));
  };

  const removeProsCons = (type: 'pros' | 'cons', index: number) => {
    setNewReview(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  const updateProsCons = (type: 'pros' | 'cons', index: number, value: string) => {
    setNewReview(prev => ({
      ...prev,
      [type]: prev[type].map((item, i) => i === index ? value : item)
    }));
  };

  const filteredReviews = getFilteredAndSortedReviews();

  return (
    <div className="w-full space-y-6">
      {/* Review Summary */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              {t('reviewSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">
                  {summary.averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center mb-2">
                  {renderStars(summary.averageRating)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('basedOnReviews')} ({summary.totalReviews})
                </p>
                <div className="mt-4">
                  <Badge variant="secondary" className="text-primary">
                    {Math.round(summary.recommendationRate)}% {t('wouldRecommend')}
                  </Badge>
                </div>
              </div>

              {/* Rating Distribution */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = summary.ratingDistribution[rating as keyof typeof summary.ratingDistribution];
                  const percentage = (count / summary.totalReviews) * 100;
                  
                  return (
                    <div key={rating} className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm w-2">{rating}</span>
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      </div>
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="text-sm text-muted-foreground w-8">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Ratings */}
            <div>
              <h4 className="font-medium mb-3">{t('categoryRatings')}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(summary.categoryAverages).map(([category, average]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{t(category)}</span>
                      <span className="text-sm font-medium">{average.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(average)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Most Mentioned Pros/Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {summary.mostMentionedPros.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-green-600" />
                    {t('mostLiked')}
                  </h4>
                  <div className="space-y-2">
                    {summary.mostMentionedPros.map((pro, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {pro}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {summary.mostMentionedCons.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ThumbsDown className="w-4 h-4 text-red-600" />
                    {t('needsImprovement')}
                  </h4>
                  <div className="space-y-2">
                    {summary.mostMentionedCons.map((con, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {con}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Write Review Button */}
      {canReview && showWriteReview && !showReviewForm && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-medium mb-2">{t('shareYourExperience')}</h3>
            <p className="text-muted-foreground mb-4">{t('helpOthersDecide')}</p>
            <Button onClick={() => setShowReviewForm(true)} size="lg">
              <Star className="w-4 h-4 mr-2" />
              {t('writeReview')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Write Review Form */}
      {showReviewForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('writeReview')}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowReviewForm(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Rating */}
            <div className="space-y-2">
              <Label>{t('overallRating')}</Label>
              <div className="flex items-center gap-2">
                {renderStars(
                  hoveredRating || newReview.rating,
                  true,
                  (rating) => setNewReview(prev => ({ ...prev, rating }))
                )}
                <span className="text-sm text-muted-foreground ml-2">
                  {hoveredRating || newReview.rating} / 5
                </span>
              </div>
            </div>

            {/* Category Ratings */}
            <div className="space-y-4">
              <Label>{t('detailedRatings')}</Label>
              {Object.entries(newReview.categoryRatings).map(([category, rating]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{t(category)}</span>
                  <div className="flex items-center gap-2">
                    {renderStars(
                      (hoveredCategory === category ? hoveredCategoryRating : rating),
                      true,
                      (newRating) => setNewReview(prev => ({
                        ...prev,
                        categoryRatings: { ...prev.categoryRatings, [category]: newRating }
                      })),
                      category
                    )}
                    <span className="text-sm text-muted-foreground w-12">
                      {hoveredCategory === category ? hoveredCategoryRating : rating} / 5
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Review Title */}
            <div className="space-y-2">
              <Label htmlFor="reviewTitle">{t('reviewTitle')}</Label>
              <Input
                id="reviewTitle"
                placeholder={t('reviewTitlePlaceholder')}
                value={newReview.title}
                onChange={(e) => setNewReview(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            {/* Review Comment */}
            <div className="space-y-2">
              <Label htmlFor="reviewComment">{t('yourReview')}</Label>
              <Textarea
                id="reviewComment"
                placeholder={t('reviewCommentPlaceholder')}
                value={newReview.comment}
                onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                rows={4}
              />
            </div>

            {/* Pros */}
            <div className="space-y-2">
              <Label>{t('whatDidYouLike')}</Label>
              {newReview.pros.map((pro, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={t('addPro')}
                    value={pro}
                    onChange={(e) => updateProsCons('pros', index, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeProsCons('pros', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addProsCons('pros')}
              >
                + {t('addAnother')}
              </Button>
            </div>

            {/* Cons */}
            <div className="space-y-2">
              <Label>{t('whatCouldBeImproved')}</Label>
              {newReview.cons.map((con, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={t('addCon')}
                    value={con}
                    onChange={(e) => updateProsCons('cons', index, e.target.value)}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeProsCons('cons', index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addProsCons('cons')}
              >
                + {t('addAnother')}
              </Button>
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <Label>{t('wouldYouRecommend')}</Label>
              <div className="flex gap-4">
                <Button
                  variant={newReview.isRecommended ? "default" : "outline"}
                  onClick={() => setNewReview(prev => ({ ...prev, isRecommended: true }))}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" />
                  {t('yes')}
                </Button>
                <Button
                  variant={!newReview.isRecommended ? "default" : "outline"}
                  onClick={() => setNewReview(prev => ({ ...prev, isRecommended: false }))}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" />
                  {t('no')}
                </Button>
              </div>
            </div>

            {/* Image Upload */}
            {allowImages && (
              <div className="space-y-2">
                <Label>{t('addPhotos')}</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">{t('dragPhotosHere')}</p>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    {t('chooseFiles')}
                  </Button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowReviewForm(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={submitReview}
                disabled={isSubmitting || newReview.rating === 0}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    {t('submitReview')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sorting */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">{t('filters')}:</span>
            </div>
            
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(Number(e.target.value))}
              className="text-sm border rounded px-2 py-1"
            >
              <option value={0}>{t('allRatings')}</option>
              <option value={5}>5 ⭐</option>
              <option value={4}>4 ⭐</option>
              <option value={3}>3 ⭐</option>
              <option value={2}>2 ⭐</option>
              <option value={1}>1 ⭐</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filterVerified}
                onChange={(e) => setFilterVerified(e.target.checked)}
              />
              {t('verifiedOnly')}
            </label>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm">{t('sortBy')}:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="newest">{t('newest')}</option>
                <option value="oldest">{t('oldest')}</option>
                <option value="rating">{t('highestRated')}</option>
                <option value="helpful">{t('mostHelpful')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">{t('noReviews')}</h3>
              <p className="text-muted-foreground">{t('beFirstToReview')}</p>
            </CardContent>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarImage src={review.userAvatar} />
                        <AvatarFallback>
                          {review.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{review.userName}</h4>
                          {review.isVerifiedBooking && (
                            <Badge variant="secondary" className="text-xs">
                              <Verified className="w-3 h-3 mr-1" />
                              {t('verifiedBooking')}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-sm text-muted-foreground">
                            {review.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon">
                      <Flag className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Review Title */}
                  {review.title && (
                    <h3 className="font-medium text-lg">{review.title}</h3>
                  )}

                  {/* Review Content */}
                  <p className="text-muted-foreground leading-relaxed">
                    {review.comment}
                  </p>

                  {/* Pros and Cons */}
                  {(review.pros?.length || review.cons?.length) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {review.pros && review.pros.length > 0 && (
                        <div>
                          <h5 className="font-medium text-green-700 mb-2 flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {t('pros')}
                          </h5>
                          <ul className="space-y-1">
                            {review.pros.map((pro, index) => (
                              <li key={index} className="text-sm text-green-600">
                                • {pro}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {review.cons && review.cons.length > 0 && (
                        <div>
                          <h5 className="font-medium text-red-700 mb-2 flex items-center gap-1">
                            <ThumbsDown className="w-4 h-4" />
                            {t('cons')}
                          </h5>
                          <ul className="space-y-1">
                            {review.cons.map((con, index) => (
                              <li key={index} className="text-sm text-red-600">
                                • {con}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80"
                        />
                      ))}
                    </div>
                  )}

                  {/* Recommendation */}
                  {review.isRecommended !== undefined && (
                    <div className="flex items-center gap-2">
                      {review.isRecommended ? (
                        <Badge variant="secondary" className="text-green-700">
                          <ThumbsUp className="w-3 h-3 mr-1" />
                          {t('recommends')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-700">
                          <ThumbsDown className="w-3 h-3 mr-1" />
                          {t('doesNotRecommend')}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Review Footer */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(review.id, 'helpful')}
                        className={review.userVote === 'helpful' ? 'text-green-600' : ''}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" />
                        {t('helpful')} ({review.helpful})
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleVote(review.id, 'notHelpful')}
                        className={review.userVote === 'notHelpful' ? 'text-red-600' : ''}
                      >
                        <ThumbsDown className="w-4 h-4 mr-1" />
                        {t('notHelpful')} ({review.notHelpful})
                      </Button>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {review.eventTitle} • {review.eventDate.toLocaleDateString()}
                    </div>
                  </div>

                  {/* Organizer Response */}
                  {review.response && (
                    <div className="bg-muted/50 rounded-lg p-4 mt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{t('organizerResponse')}</span>
                        <Badge variant="outline" className="text-xs">
                          {review.response.responderName}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.response.text}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {review.response.respondedAt.toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdvancedReviewSystem;