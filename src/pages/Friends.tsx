import React, { useState } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Users, UserPlus, Activity, List, Shield, MessageCircle, TrendingUp } from 'lucide-react';
import { useFriends } from '@/hooks/useFriends';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { FriendCard } from '@/components/Friends/FriendCard';
import { FriendRequestCard } from '@/components/Friends/FriendRequestCard';
import { FriendActivityFeed } from '@/components/Friends/FriendActivityFeed';
import { PeopleYouMayKnow } from '@/components/Friends/PeopleYouMayKnow';
import { FriendListsConnected } from '@/components/Friends/FriendListsConnected';
import { PrivacyControls } from '@/components/Friends/PrivacyControls';
import { GroupChatsConnected } from '@/components/Friends/GroupChatsConnected';
import { FriendStats } from '@/components/Friends/FriendStats';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Friends = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { friends, loading: friendsLoading, unfriend, friendCount } = useFriends();
  const {
    incomingRequests,
    outgoingRequests,
    loading: requestsLoading,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    incomingCount
  } = useFriendRequests();

  const filteredFriends = friends.filter(friend =>
    friend.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-secondary/10">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">الأصدقاء</h1>
              <p className="text-muted-foreground">
                لديك {friendCount} صديق
              </p>
            </div>
            <Button onClick={() => navigate('/search-users')}>
              <Search className="ml-2 h-4 w-4" />
              البحث عن أصدقاء
            </Button>
          </div>

          <Tabs defaultValue="friends" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 gap-2">
              <TabsTrigger value="friends" className="gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">أصدقائي</span>
                <Badge variant="secondary" className="ml-1">{friendCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="discover" className="gap-2">
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">اكتشف</span>
              </TabsTrigger>
              <TabsTrigger value="lists" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">القوائم</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">الخصوصية</span>
              </TabsTrigger>
              <TabsTrigger value="chats" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                <span className="hidden sm:inline">الدردشات</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">الإحصائيات</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">النشاط</span>
              </TabsTrigger>
              <TabsTrigger value="incoming" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">واردة</span>
                {incomingCount > 0 && (
                  <Badge variant="destructive" className="mr-1">
                    {incomingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="gap-2">
                <UserPlus className="h-4 w-4" />
                <span className="hidden sm:inline">صادرة</span>
                <Badge variant="secondary" className="ml-1">{outgoingRequests.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-6">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث في قائمة الأصدقاء..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {friendsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-16 w-16 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredFriends.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      {searchTerm ? 'لا توجد نتائج' : 'لا يوجد أصدقاء بعد'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? 'جرب مصطلحات بحث مختلفة'
                        : 'ابدأ بإضافة أصدقاء جدد!'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => navigate('/search-users')}>
                        <Search className="ml-2 h-4 w-4" />
                        البحث عن أصدقاء
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredFriends.map((friend) => (
                    <FriendCard
                      key={friend.id}
                      friend={friend}
                      onUnfriend={unfriend}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="discover" className="space-y-4">
              <PeopleYouMayKnow />
            </TabsContent>

            <TabsContent value="lists" className="space-y-4">
              <FriendListsConnected />
            </TabsContent>

            <TabsContent value="privacy" className="space-y-4">
              <PrivacyControls />
            </TabsContent>

            <TabsContent value="chats" className="space-y-4">
              <GroupChatsConnected />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <FriendStats />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <FriendActivityFeed />
            </TabsContent>

            <TabsContent value="incoming" className="space-y-4">
              {requestsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-16 w-16 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-9 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : incomingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد طلبات واردة</h3>
                    <p className="text-muted-foreground">
                      لا توجد طلبات صداقة جديدة في الوقت الحالي
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {incomingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      onAccept={acceptRequest}
                      onReject={rejectRequest}
                      type="incoming"
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="outgoing" className="space-y-4">
              {requestsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-16 w-16 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                          <Skeleton className="h-9 w-20" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : outgoingRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <UserPlus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">لا توجد طلبات صادرة</h3>
                    <p className="text-muted-foreground">
                      لم ترسل أي طلبات صداقة معلقة
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {outgoingRequests.map((request) => (
                    <FriendRequestCard
                      key={request.id}
                      request={request}
                      onAccept={acceptRequest}
                      onReject={rejectRequest}
                      onCancel={cancelRequest}
                      type="outgoing"
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Friends;