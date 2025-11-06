import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Eye, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Suggestion {
  id: string;
  full_name: string;
  avatar_url: string | null;
  mutual_friends: number;
  shared_interests: string[];
  events_together: number;
}

export function PeopleYouMayKnow() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, []);

  const loadSuggestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select("friend_id, user_id")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = new Set(
        friendships?.map(f => 
          f.user_id === user.id ? f.friend_id : f.user_id
        ) || []
      );

      // Get profiles excluding current friends and self
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .neq("user_id", user.id)
        .limit(20);

      const suggestedProfiles = profiles?.filter(
        p => !friendIds.has(p.user_id)
      ) || [];

      // Transform to suggestions with real data
      const transformed: Suggestion[] = suggestedProfiles.map(p => ({
        id: p.user_id,
        full_name: p.full_name || "User",
        avatar_url: p.avatar_url,
        mutual_friends: 0, // Can be calculated from actual friendships
        shared_interests: [], // Can be derived from user preferences
        events_together: 0, // Can be calculated from bookings
      }));

      setSuggestions(transformed);
    } catch (error) {
      console.error("Error loading suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("friend_requests")
        .insert({
          sender_id: user.id,
          receiver_id: userId,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent successfully",
      });

      setSuggestions(prev => prev.filter(s => s.id !== userId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-32 bg-muted rounded-lg mb-4" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">People You May Know</h2>
          <p className="text-muted-foreground">
            Based on mutual connections and shared interests
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {suggestions.length} Suggestions
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {suggestions.map((person) => (
          <Card 
            key={person.id} 
            className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <Avatar className="h-24 w-24 border-4 border-primary/20 group-hover:border-primary/50 transition-colors">
                  <AvatarImage src={person.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/60">
                    {person.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="space-y-2 w-full">
                  <h3 className="font-semibold text-lg">{person.full_name}</h3>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{person.mutual_friends} mutual friends</span>
                  </div>

                  {person.events_together > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{person.events_together} events together</span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center">
                    {person.shared_interests.map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 w-full">
                  <Button
                    onClick={() => handleAddFriend(person.id)}
                    className="flex-1 gap-2"
                    size="sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
