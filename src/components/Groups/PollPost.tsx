import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Check, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PollOption {
  id: string;
  option_text: string;
  option_order: number;
  votes_count: number;
}

interface Voter {
  user_id: string;
  full_name: string;
  avatar_url: string;
}

interface PollPostProps {
  postId: string;
}

export const PollPost: React.FC<PollPostProps> = ({ postId }) => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const { toast } = useToast();
  const [options, setOptions] = useState<PollOption[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [voters, setVoters] = useState<Record<string, Voter[]>>({});
  const isRTL = language === 'ar';

  useEffect(() => {
    loadPollData();
    const cleanup = setupRealtimeSubscription();
    return cleanup;
  }, [postId, user]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`poll-votes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_votes',
          filter: `post_id=eq.${postId}`
        },
        () => loadPollData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPollData = async () => {
    if (!user) return;

    try {
      // Load poll options
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('post_id', postId)
        .order('option_order', { ascending: true });

      if (optionsError) throw optionsError;

      setOptions(optionsData || []);
      const total = (optionsData || []).reduce((sum, opt) => sum + opt.votes_count, 0);
      setTotalVotes(total);

      // Check if user has voted
      const { data: voteData } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle();

      setUserVote(voteData?.option_id || null);

      // Load voters for each option if anyone has voted
      if (total > 0) {
        await loadVoters(optionsData || []);
      }
    } catch (error) {
      console.error('Error loading poll data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVoters = async (pollOptions: PollOption[]) => {
    try {
      const votersData: Record<string, Voter[]> = {};

      for (const option of pollOptions) {
        if (option.votes_count === 0) continue;

        const { data: votes } = await supabase
          .from('poll_votes')
          .select('user_id')
          .eq('option_id', option.id);

        if (votes && votes.length > 0) {
          const voterProfiles = await Promise.all(
            votes.map(async (vote) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', vote.user_id)
                .maybeSingle();

              return {
                user_id: vote.user_id,
                full_name: profile?.full_name || (isRTL ? 'مستخدم' : 'User'),
                avatar_url: profile?.avatar_url || ''
              };
            })
          );

          votersData[option.id] = voterProfiles;
        }
      }

      setVoters(votersData);
    } catch (error) {
      console.error('Error loading voters:', error);
    }
  };

  const handleVote = async (optionId: string) => {
    if (!user || userVote) return;

    try {
      // Insert new vote
      const { error } = await supabase
        .from('poll_votes')
        .insert({
          post_id: postId,
          option_id: optionId,
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: isRTL ? 'تم التصويت' : 'Voted',
        description: isRTL ? 'تم تسجيل صوتك بنجاح' : 'Your vote has been recorded'
      });

      // Real-time subscription will handle the update
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: isRTL ? 'خطأ' : 'Error',
        description: isRTL ? 'حدث خطأ أثناء التصويت' : 'Error voting',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-4">{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;
  }

  return (
    <div className="space-y-3">
      {options.map((option) => {
        const percentage = totalVotes > 0 ? ((option.votes_count / totalVotes) * 100) : 0;
        const isSelected = userVote === option.id;
        const optionVoters = voters[option.id] || [];

        return (
          <Card
            key={option.id}
            className={`relative overflow-hidden transition-all ${!userVote ? 'cursor-pointer hover:shadow-md' : 'cursor-default'} ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => !userVote && handleVote(option.id)}
          >
            <div className="relative z-10 p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-1">
                  {isSelected && <Check className="w-4 h-4 text-primary" />}
                  <span className="text-sm font-medium">{option.option_text}</span>
                </div>
                {totalVotes > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">
                      {percentage.toFixed(1)}%
                    </span>
                    {optionVoters.length > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-2">
                            <Users className="w-3 h-3 mr-1" />
                            {optionVoters.length}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>
                              {isRTL ? 'المصوتون' : 'Voters'} - {option.option_text}
                            </DialogTitle>
                          </DialogHeader>
                          <ScrollArea className="max-h-[400px]">
                            <div className="space-y-3 pr-4">
                              {optionVoters.map((voter) => (
                                <div key={voter.user_id} className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={voter.avatar_url} />
                                    <AvatarFallback>{voter.full_name.charAt(0)}</AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm font-medium">{voter.full_name}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>
              {totalVotes > 0 && (
                <Progress value={percentage} className="h-1" />
              )}
            </div>
          </Card>
        );
      })}
      <div className="text-xs text-muted-foreground text-center pt-2">
        {totalVotes} {isRTL ? 'صوت' : totalVotes === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
};
