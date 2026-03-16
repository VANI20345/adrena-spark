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
import SectionHeader from './SectionHeader';

const JoinSuggestions = () => {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const { user } = useAuth();
  const { language } = useLanguageContext();

  useEffect(() => {
    const fetchSuggestedGroups = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: memberGroups, error: memberError } = await supabase
          .from('group_memberships')
          .select('group_id')
          .eq('user_id', user.id);
        if (memberError) throw memberError;
        const joinedGroupIds = memberGroups?.map(g => g.group_id) || [];
        let query = supabase
          .from('event_groups')
          .select(`id, group_name, description, description_ar, image_url, current_members, max_members, visibility, category_id, categories (name, name_ar)`)
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
      } finally { setLoading(false); }
    };
    fetchSuggestedGroups();
  }, [user]);

  const title = language === 'ar' ? 'مقترحات للانضمام' : 'Join Suggestions';
  const subtitle = language === 'ar' ? 'فعاليات مميزة نقترحها خصيصاً لك بناءً على اهتماماتك' : 'Curated suggestions based on your interests';

  if (loading) {
    return (
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <SectionHeader title={title} accentColor="lime" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-44 rounded-t-lg"></div>
                <div className="p-4 space-y-3">
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
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <SectionHeader title={title} accentColor="lime" />
          <div className="text-center py-10">
            <p className="text-muted-foreground">{language === 'ar' ? 'لا توجد قروبات متاحة للانضمام حالياً' : 'No groups available'}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="container mx-auto px-4">
        <SectionHeader title={title} subtitle={subtitle} accentColor="lime" />

        <Carousel opts={{ align: "start", loop: true }} className="w-full">
          <CarouselContent className="-ml-4">
            {groups.map((group) => (
              <CarouselItem key={group.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300 h-full border-transparent hover:border-[hsl(var(--brand-lime)/0.35)]">
                  <div className="relative">
                    {group.image_url ? (
                      <img src={group.image_url} alt={group.group_name} className="w-full h-44 object-cover" />
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-[hsl(var(--brand-lime)/0.12)] to-primary/10 flex items-center justify-center">
                        <Sparkles className="w-14 h-14 text-[hsl(var(--brand-lime)/0.3)]" />
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <Badge variant="lime" className="text-xs">
                        <Sparkles className="w-3 h-3 ml-1" />
                        {language === 'ar' ? 'موصى به' : 'Recommended'}
                      </Badge>
                    </div>
                    {group.categories && (
                      <div className="absolute bottom-3 right-3">
                        <Badge variant="secondary" className="text-xs">
                          {language === 'ar' ? group.categories.name_ar : group.categories.name}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                        {group.group_name}
                      </h3>
                      {(group.description || group.description_ar) && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {language === 'ar' ? (group.description_ar || group.description) : (group.description || group.description_ar)}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{group.current_members || 0}</span>
                        {group.max_members && <span>/{group.max_members}</span>}
                        <span className="mr-1">{language === 'ar' ? 'عضو' : 'members'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="px-4 pb-4">
                    <Button asChild className="w-full" size="sm" variant="brand">
                      <Link to={`/groups/${group.id}`}>{language === 'ar' ? 'عرض التفاصيل' : 'View Details'}</Link>
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
          <Button asChild size="lg" variant="outline" className="border-[hsl(var(--brand-lime)/0.3)] hover:border-[hsl(var(--brand-lime))]">
            <Link to="/groups">{language === 'ar' ? 'عرض جميع القروبات' : 'View All Groups'}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default JoinSuggestions;
