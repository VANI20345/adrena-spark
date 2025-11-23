import { useEffect, useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguageContext } from "@/contexts/LanguageContext";

const JoinSuggestions = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const { user } = useAuth();
  const { language } = useLanguageContext();

  useEffect(() => {
    const fetchSuggestedGroups = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get groups user is already member of
        const { data: memberGroups, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const joinedGroupIds = memberGroups?.map(g => g.group_id) || [];

        // Get groups user is NOT member of
        let query = supabase
          .from('event_groups')
          .select(`
            id,
            group_name,
            description,
            description_ar,
            image_url,
            current_members,
            max_members,
            visibility,
            category_id,
            categories (
              name,
              name_ar
            )
          `)
          .eq('visibility', 'public')
          .is('archived_at', null)
          .order('current_members', { ascending: false })
          .limit(12);

        if (joinedGroupIds.length > 0) {
          query = query.not('id', 'in', `(${joinedGroupIds.join(',')})`);
        }

        const { data: groupsData, error: groupsError } = await query;

        if (groupsError) throw groupsError;

        setGroups(groupsData || []);
      } catch (error) {
        console.error('Error fetching suggested groups:', error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestedGroups();
  }, [user]);

  if (loading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              مقترحات للانضمام
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              قروبات جديدة يمكنك الانضمام إليها
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-48 rounded-t-lg"></div>
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (groups.length === 0) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              مقترحات للانضمام
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              قروبات جديدة يمكنك الانضمام إليها
            </p>
          </div>
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد قروبات متاحة للانضمام حالياً</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            مقترحات للانضمام
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl">
            فعاليات مميزة نقترحها خصيصاً لك بناءً على اهتماماتك
          </p>
        </div>

        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {groups.map((group) => (
              <CarouselItem key={group.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full border-primary/20">
                  <div className="relative">
                    {group.image_url ? (
                      <img 
                        src={group.image_url} 
                        alt={group.group_name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                        <Sparkles className="w-16 h-16 text-primary/30" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="w-3 h-3 ml-1" />
                        موصى به
                      </Badge>
                    </div>
                    {group.categories && (
                      <div className="absolute bottom-4 right-4">
                        <Badge variant="secondary">
                          {language === 'ar' ? group.categories.name_ar : group.categories.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {group.group_name}
                      </h3>
                      
                      {(group.description || group.description_ar) && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {language === 'ar' ? (group.description_ar || group.description) : (group.description || group.description_ar)}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{group.current_members || 0}</span>
                          {group.max_members && (
                            <span>/{group.max_members}</span>
                          )}
                          <span className="mr-1">عضو</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="px-6 pb-6">
                    <Button asChild className="w-full" size="sm">
                      <Link to={`/groups/${group.id}`}>
                        عرض التفاصيل
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>

        <div className="text-center mt-8">
          <Button asChild size="lg" variant="outline">
            <Link to="/groups">
              عرض جميع القروبات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JoinSuggestions;
