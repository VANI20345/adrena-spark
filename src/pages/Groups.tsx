import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import { 
  MessageSquare,
  Users,
  MapPin,
  Plus,
  Settings,
  Send,
  Crown,
  UserPlus,
  Search,
  Filter
} from 'lucide-react';

interface Group {
  id: string;
  group_name: string;
  group_type: string;
  current_members: number;
  max_members: number;
  group_link?: string;
  event_id?: string;
  created_by: string;
  created_at: string;
}

const Groups = () => {
  const { user, userRole } = useAuth();
  const [regionGroups, setRegionGroups] = useState<Group[]>([]);
  const [eventGroups, setEventGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadGroups();
    }
  }, [user]);

  const loadGroups = async () => {
    try {
      // Load region groups (public)
      const { data: regionData } = await supabase
        .from('event_groups')
        .select('*')
        .eq('group_type', 'region')
        .order('created_at', { ascending: false });

      // Load event groups user is part of (based on bookings)
      const { data: eventData } = await supabase
        .from('event_groups')
        .select(`
          *,
          events(title_ar, organizer_id)
        `)
        .eq('group_type', 'event')
        .order('created_at', { ascending: false });

      setRegionGroups(regionData || []);
      setEventGroups(eventData || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    // This would involve updating group membership
    // For now, we'll just show a message
    console.log('Joining group:', groupId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedGroup) return;

    // This would involve sending a message to the chat
    // For now, we'll just add it locally
    const message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: user?.email || 'أنت',
      timestamp: new Date().toLocaleTimeString('ar-SA')
    };

    setChatMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const filteredRegionGroups = regionGroups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">القروبات</h1>
          <p className="text-muted-foreground">تواصل مع المغامرين في منطقتك وفعالياتك</p>
        </div>

        <Tabs defaultValue="region" className="space-y-6">
          <TabsList className="grid grid-cols-2 w-full max-w-md">
            <TabsTrigger value="region">قروبات المناطق</TabsTrigger>
            <TabsTrigger value="events">قروبات الفعاليات</TabsTrigger>
          </TabsList>

          <TabsContent value="region" className="space-y-6">
            <div className="flex space-x-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث عن قروب منطقة..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button variant="outline">
                <Filter className="w-4 h-4 ml-2" />
                فلترة
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sample Region Groups */}
                  {[
                    { name: 'مغامرو الرياض', members: 245, type: 'الرياض' },
                    { name: 'مستكشفو جدة', members: 189, type: 'جدة' },
                    { name: 'رحالة الدمام', members: 156, type: 'الدمام' },
                    { name: 'عشاق الطبيعة - أبها', members: 98, type: 'أبها' },
                    { name: 'مغامرو تبوك', members: 87, type: 'تبوك' },
                    { name: 'مستكشفو المدينة', members: 134, type: 'المدينة المنورة' }
                  ].map((group) => (
                    <Card key={group.name} className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          <Badge variant="outline">
                            <MapPin className="w-3 h-3 ml-1" />
                            {group.type}
                          </Badge>
                        </div>
                        <CardDescription>
                          قروب عام لمحبي المغامرة في منطقة {group.type}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 ml-2" />
                            {group.members} عضو
                          </div>
                          <Button size="sm">
                            <UserPlus className="w-4 h-4 ml-1" />
                            انضم
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>إحصائيات القروبات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center p-4 bg-primary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-primary">12</h3>
                      <p className="text-sm text-muted-foreground">قروب متاح</p>
                    </div>
                    <div className="text-center p-4 bg-secondary/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-secondary-foreground">1,247</h3>
                      <p className="text-sm text-muted-foreground">إجمالي الأعضاء</p>
                    </div>
                    <div className="text-center p-4 bg-accent/5 rounded-lg">
                      <h3 className="text-2xl font-bold text-accent-foreground">3</h3>
                      <p className="text-sm text-muted-foreground">قروباتي</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="events" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {/* Sample Event Groups */}
                  {[
                    { 
                      name: 'رحلة جبال السودة', 
                      event: 'رحلة جبال السودة - أبها',
                      members: 25, 
                      maxMembers: 30,
                      date: '2024-03-15',
                      organizer: true
                    },
                    { 
                      name: 'مخيم نجوم الصحراء', 
                      event: 'مخيم نجوم الصحراء',
                      members: 18, 
                      maxMembers: 20,
                      date: '2024-03-20',
                      organizer: false
                    }
                  ].map((group) => (
                    <Card key={group.name}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <CardDescription>{group.event}</CardDescription>
                          </div>
                          <div className="flex space-x-1">
                            {group.organizer && (
                              <Badge variant="default">
                                <Crown className="w-3 h-3 ml-1" />
                                منظم
                              </Badge>
                            )}
                            <Badge variant="outline">فعالية</Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Users className="w-4 h-4 ml-2" />
                            {group.members} / {group.maxMembers} عضو
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(group.date).toLocaleDateString('ar-SA')}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" className="flex-1">
                            <MessageSquare className="w-4 h-4 ml-1" />
                            دردشة
                          </Button>
                          {group.organizer && (
                            <Button size="sm" variant="outline">
                              <Settings className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>دردشة المجموعة</CardTitle>
                    <CardDescription>تحديد مجموعة للبدء</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground text-sm">
                        اختر مجموعة لبدء المحادثة
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Chat Interface (would be shown when a group is selected) */}
        {selectedGroup && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 ml-2" />
                دردشة: {selectedGroup.group_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {chatMessages.map((message: any) => (
                  <div key={message.id} className="flex items-start space-x-2">
                    <div className="bg-secondary p-2 rounded-lg flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{message.sender}</span>
                        <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                      </div>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-2 mt-4">
                <Input
                  placeholder="اكتب رسالتك..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button onClick={handleSendMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Groups;