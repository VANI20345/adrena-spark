import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SuggestedGroup {
  id: string;
  group_name: string;
  image_url: string | null;
  current_members: number;
  event_count: number;
  gender_restriction: string | null;
  min_age: number | null;
  max_age: number | null;
  city_id: string | null;
  city_name: string | null;
  city_name_ar: string | null;
  organizer_name: string | null;
  organizer_avatar: string | null;
  interests: { id: string; name: string; name_ar: string }[];
}

interface UserProfile {
  gender: string | null;
  birth_date: string | null;
  interests: string[] | null;
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function useSuggestedGroups(limit = 6) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['suggested-groups', user?.id, limit],
    queryFn: async (): Promise<SuggestedGroup[]> => {
      if (!user?.id) return [];

      // 1. Get current user's profile (gender, birth_date, interests)
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('gender, birth_date, interests')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      const profile: UserProfile = userProfile || { gender: null, birth_date: null, interests: null };
      const userAge = profile.birth_date ? calculateAge(profile.birth_date) : null;
      const userGender = profile.gender;
      const userInterests = profile.interests || [];

      // 2. Get groups user is already member of or created
      const [{ data: createdGroups }, { data: memberGroups }] = await Promise.all([
        supabase.from('groups').select('id').eq('created_by', user.id),
        supabase.from('group_memberships').select('group_id').eq('user_id', user.id),
      ]);

      const excludeGroupIds = [
        ...(createdGroups?.map(g => g.id) || []),
        ...(memberGroups?.map(m => m.group_id) || []),
      ];

      // 3. Fetch all available groups with their interests and organizer info
      let query = supabase
        .from('groups')
        .select(`
          id,
          group_name,
          image_url,
          current_members,
          gender_restriction,
          min_age,
          max_age,
          city_id,
          created_by,
          cities!city_id(name, name_ar),
          group_interests(
            interest_id,
            interest_categories:interest_id(id, name, name_ar)
          )
        `)
        .is('archived_at', null)
        .order('current_members', { ascending: false });

      if (excludeGroupIds.length > 0) {
        query = query.not('id', 'in', `(${excludeGroupIds.join(',')})`);
      }

      const { data: groups, error: groupsError } = await query.limit(50);

      if (groupsError) throw groupsError;
      if (!groups || groups.length === 0) return [];

      // 4. Get organizer profiles
      const organizerIds = [...new Set(groups.map(g => g.created_by))];
      const { data: organizers } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', organizerIds);

      const organizerMap = new Map(organizers?.map(o => [o.user_id, o]) || []);

      // 5. Get event counts for groups
      const groupIds = groups.map(g => g.id);
      const { data: eventCounts } = await supabase
        .from('events')
        .select('group_id')
        .in('group_id', groupIds)
        .eq('status', 'approved');

      const eventCountMap = (eventCounts || []).reduce((acc, e) => {
        acc[e.group_id] = (acc[e.group_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // 6. Filter groups based on user restrictions and rank by interest match
      const filteredGroups = groups
        .map(group => {
          // Check gender restriction
          if (group.gender_restriction && userGender) {
            if (group.gender_restriction !== 'both' && group.gender_restriction !== userGender) {
              return null; // User doesn't match gender restriction
            }
          }

          // Check age restriction
          if (userAge !== null) {
            if (group.min_age && userAge < group.min_age) return null;
            if (group.max_age && userAge > group.max_age) return null;
          }

          // Map interests
          const groupInterests = (group.group_interests || [])
            .map((gi: any) => gi.interest_categories)
            .filter(Boolean) as { id: string; name: string; name_ar: string }[];

          // Calculate interest match score
          const groupInterestNames = groupInterests.map(i => i.name);
          const matchingInterests = userInterests.filter(ui => groupInterestNames.includes(ui));
          const interestScore = matchingInterests.length;

          // Get organizer info
          const organizer = organizerMap.get(group.created_by);

          // Get city info
          const cities = group.cities as { name: string; name_ar: string } | null;

          return {
            id: group.id,
            group_name: group.group_name,
            image_url: group.image_url,
            current_members: group.current_members || 0,
            event_count: eventCountMap[group.id] || 0,
            gender_restriction: group.gender_restriction,
            min_age: group.min_age,
            max_age: group.max_age,
            city_id: group.city_id,
            city_name: cities?.name || null,
            city_name_ar: cities?.name_ar || null,
            organizer_name: organizer?.full_name || null,
            organizer_avatar: organizer?.avatar_url || null,
            interests: groupInterests,
            _interestScore: interestScore,
          };
        })
        .filter((g): g is NonNullable<typeof g> => g !== null)
        // Sort by interest match score (descending), then by member count
        .sort((a, b) => {
          if (b._interestScore !== a._interestScore) {
            return b._interestScore - a._interestScore;
          }
          return b.current_members - a.current_members;
        })
        .slice(0, limit)
        .map(({ _interestScore, ...rest }) => rest);

      return filteredGroups;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
