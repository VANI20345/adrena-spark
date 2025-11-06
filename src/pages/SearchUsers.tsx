import React, { useState } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FriendButton } from '@/components/Friends/FriendButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface UserResult {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  display_id: string | null;
}

const SearchUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (term: string) => {
    setSearchTerm(term);
    
    if (term.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, city, bio, display_id')
        .or(`full_name.ilike.%${term}%,city.ilike.%${term}%,display_id.ilike.%${term}%`)
        .neq('user_id', user?.id || '')
        .limit(20);

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast({
        title: 'خطأ',
        description: 'فشل البحث عن المستخدمين',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">البحث عن أصدقاء</h1>
            <p className="text-muted-foreground">
              ابحث عن مستخدمين جدد لإضافتهم كأصدقاء
            </p>
          </div>

          <div className="relative mb-8">
            <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو المدينة..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pr-12 h-12 text-lg"
            />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-10 w-28" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length === 0 && hasSearched ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
                <p className="text-muted-foreground">
                  لم نجد أي مستخدمين يطابقون بحثك. جرب كلمات مفتاحية مختلفة.
                </p>
              </CardContent>
            </Card>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((userResult) => (
                <Card key={userResult.user_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        className="h-16 w-16 cursor-pointer" 
                        onClick={() => navigate(`/profile/${userResult.user_id}`)}
                      >
                        <AvatarImage src={userResult.avatar_url || undefined} />
                        <AvatarFallback>{userResult.full_name[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 
                            className="font-semibold text-lg cursor-pointer hover:underline"
                            onClick={() => navigate(`/profile/${userResult.user_id}`)}
                          >
                            {userResult.full_name}
                          </h3>
                          {userResult.display_id && (
                            <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                              {userResult.display_id}
                            </span>
                          )}
                        </div>
                        {userResult.city && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {userResult.city}
                          </p>
                        )}
                        {userResult.bio && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                            {userResult.bio}
                          </p>
                        )}
                      </div>

                      <FriendButton userId={userResult.user_id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">ابدأ البحث</h3>
                <p className="text-muted-foreground">
                  أدخل اسم المستخدم أو المدينة للبحث عن أصدقاء جدد
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchUsers;