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
  }, [postId, user?.id]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`poll-votes-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'poll_votes',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          // Only reload for other users' votes to update counts
          if (payload.new && (payload.new as any).user_id !== user?.id) {
            // Increment the specific option's count without full reload
            const newVote = payload.new as { option_id: string; user_id: string };
            setOptions(prev => prev.map(opt => 
              opt.id === newVote.option_id 
                ? { ...opt, votes_count: opt.votes_count + 1 }
                : opt
            ));
            setTotalVotes(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadPollData = async () => {
    try {
      // Load poll options first
      const { data: optionsData, error: optionsError } = await supabase
        .from('poll_options')
        .select('*')
        .eq('post_id', postId)
        .order('option_order', { ascending: true });

      if (optionsError) {
        console.error('Error loading poll options:', optionsError);
        throw optionsError;
      }

      const pollOptions = optionsData || [];
      
      // Fetch all votes for this poll to get accurate counts
      const { data: allVotesData, error: votesError } = await supabase
        .from('poll_votes')
        .select('option_id, user_id')
        .eq('post_id', postId);

      if (votesError) {
        console.error('Error loading poll votes:', votesError);
      }

      const votes = allVotesData || [];
      
      // Calculate actual vote counts from poll_votes table
      const voteCounts: Record<string, number> = {};
      votes.forEach(vote => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1;
      });

      // Update options with actual vote counts
      const updatedOptions = pollOptions.map(opt => ({
        ...opt,
        votes_count: voteCounts[opt.id] || 0
      }));

      const total = votes.length;

      // Check if current user has voted
      let userVoteData: { option_id: string } | null = null;
      if (user) {
        const userVote = votes.find(v => v.user_id === user.id);
        userVoteData = userVote ? { option_id: userVote.option_id } : null;
      }

      // Set options and totals first to show UI
      setOptions(updatedOptions);
      setTotalVotes(total);
      setUserVote(userVoteData?.option_id || null);

      // Process voters data
      if (votes.length > 0) {
        const userIds = [...new Set(votes.map(v => v.user_id))] as string[];
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profilesMap: Record<string, { full_name: string; avatar_url: string }> = {};
        (profiles || []).forEach(p => {
          profilesMap[p.user_id] = { full_name: p.full_name || (isRTL ? 'مستخدم' : 'User'), avatar_url: p.avatar_url || '' };
        });

        const votersData: Record<string, Voter[]> = {};
        votes.forEach((vote) => {
          if (!votersData[vote.option_id]) {
            votersData[vote.option_id] = [];
          }
          const profile = profilesMap[vote.user_id] || { full_name: isRTL ? 'مستخدم' : 'User', avatar_url: '' };
          votersData[vote.option_id].push({
            user_id: vote.user_id,
            full_name: profile.full_name,
            avatar_url: profile.avatar_url
          });
        });
        setVoters(votersData);
      } else {
        setVoters({});
      }
    } catch (error) {
      console.error('Error loading poll data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // loadVoters is now integrated into loadPollData for better performance

  const handleVote = async (optionId: string) => {
    if (!user || userVote) return;

    // Optimistic update - immediately update UI without refetching
    const previousOptions = [...options];
    const previousUserVote = userVote;
    const previousTotalVotes = totalVotes;
    const previousVoters = { ...voters };

    // Update options optimistically
    setOptions(prev => prev.map(opt => 
      opt.id === optionId 
        ? { ...opt, votes_count: opt.votes_count + 1 }
        : opt
    ));
    setUserVote(optionId);
    setTotalVotes(prev => prev + 1);
    
    // Add current user to voters optimistically
    setVoters(prev => ({
      ...prev,
      [optionId]: [
        ...(prev[optionId] || []),
        { user_id: user.id, full_name: isRTL ? 'أنت' : 'You', avatar_url: '' }
      ]
    }));

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

      // Update voters with actual user profile (fetch only current user's profile)
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (userProfile) {
        setVoters(prev => ({
          ...prev,
          [optionId]: [
            ...(prev[optionId] || []).filter(v => v.user_id !== user.id),
            { user_id: user.id, full_name: userProfile.full_name || (isRTL ? 'أنت' : 'You'), avatar_url: userProfile.avatar_url || '' }
          ]
        }));
      }
    } catch (error) {
      // Rollback on error
      setOptions(previousOptions);
      setUserVote(previousUserVote);
      setTotalVotes(previousTotalVotes);
      setVoters(previousVoters);
      
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
