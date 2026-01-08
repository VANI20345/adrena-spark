import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateTicketDialog } from './CreateTicketDialog';
import { 
  Plus, 
  Users, 
  GraduationCap, 
  HelpCircle,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GroupOption {
  id: string;
  group_name: string;
  image_url: string | null;
  owner_id: string;
  owner_name: string | null;
}

interface TrainingOption {
  id: string;
  service_name: string;
  trainer_id: string;
  trainer_name: string | null;
  trainer_avatar: string | null;
}

export const NewInquiryDropdown: React.FC = () => {
  const { user } = useAuth();
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  
  const [showGroupsDialog, setShowGroupsDialog] = useState(false);
  const [showTrainingsDialog, setShowTrainingsDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const [selectedTraining, setSelectedTraining] = useState<TrainingOption | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketType, setTicketType] = useState<'group_inquiry' | 'training_inquiry'>('group_inquiry');

  // Fetch user's joined groups
  const { data: userGroups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['user-groups-for-inquiry', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: memberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);
      
      if (!memberships || memberships.length === 0) return [];
      
      const groupIds = memberships.map(m => m.group_id);
      
      const { data: groups } = await supabase
        .from('event_groups')
        .select('id, group_name, image_url, created_by')
        .in('id', groupIds);
      
      if (!groups) return [];
      
      // Fetch owner profiles
      const ownerIds = [...new Set(groups.map(g => g.created_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ownerIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);
      
      return groups.map(g => ({
        id: g.id,
        group_name: g.group_name,
        image_url: g.image_url,
        owner_id: g.created_by,
        owner_name: profilesMap.get(g.created_by) || null
      })) as GroupOption[];
    },
    enabled: !!user?.id,
  });

  // Fetch user's enrolled/booked trainings
  const { data: userTrainings = [], isLoading: loadingTrainings } = useQuery({
    queryKey: ['user-trainings-for-inquiry', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: bookings } = await supabase
        .from('service_bookings')
        .select('service_id')
        .eq('user_id', user.id)
        .in('status', ['confirmed', 'pending']);
      
      if (!bookings || bookings.length === 0) return [];
      
      const serviceIds = [...new Set(bookings.map(b => b.service_id))];
      
      const { data: services } = await supabase
        .from('services')
        .select('id, name, name_ar, provider_id, service_type')
        .in('id', serviceIds)
        .eq('service_type', 'training');
      
      if (!services || services.length === 0) return [];
      
      // Fetch trainer profiles
      const trainerIds = [...new Set(services.map(s => s.provider_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', trainerIds);
      
      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      
      return services.map(s => ({
        id: s.id,
        service_name: isRTL ? s.name_ar : s.name,
        trainer_id: s.provider_id,
        trainer_name: profilesMap.get(s.provider_id)?.full_name || null,
        trainer_avatar: profilesMap.get(s.provider_id)?.avatar_url || null
      })) as TrainingOption[];
    },
    enabled: !!user?.id,
  });

  const handleGroupSelect = (group: GroupOption) => {
    setSelectedGroup(group);
    setTicketType('group_inquiry');
    setShowGroupsDialog(false);
    setShowTicketDialog(true);
  };

  const handleTrainingSelect = (training: TrainingOption) => {
    setSelectedTraining(training);
    setTicketType('training_inquiry');
    setShowTrainingsDialog(false);
    setShowTicketDialog(true);
  };

  const handleSupportClick = () => {
    navigate('/contact');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2 relative group" size="lg">
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            <span className="hidden sm:inline">{isRTL ? 'استفسار جديد' : 'New Inquiry'}</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={isRTL ? 'start' : 'end'} className="w-64">
          <DropdownMenuLabel>
            {isRTL ? 'اختر نوع الاستفسار' : 'Choose Inquiry Type'}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowGroupsDialog(true)}
            className="cursor-pointer gap-3 py-3"
          >
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{isRTL ? 'اسأل قائد مجموعة' : 'Ask Group Leader'}</p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'اختر مجموعة للتواصل' : 'Select a group to contact'}
              </p>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={() => setShowTrainingsDialog(true)}
            className="cursor-pointer gap-3 py-3"
          >
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <GraduationCap className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{isRTL ? 'اسأل المدرب' : 'Ask Trainer'}</p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'من تدريباتك المسجلة' : 'From your enrolled trainings'}
              </p>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={handleSupportClick}
            className="cursor-pointer gap-3 py-3"
          >
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <HelpCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{isRTL ? 'الدعم الفني' : 'Support'}</p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'تواصل مع فريق الدعم' : 'Contact support team'}
              </p>
            </div>
            <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Groups Selection Dialog */}
      <Dialog open={showGroupsDialog} onOpenChange={setShowGroupsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {isRTL ? 'اختر المجموعة' : 'Select Group'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingGroups ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : userGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? 'لم تنضم لأي مجموعة بعد' : 'You haven\'t joined any groups yet'}</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setShowGroupsDialog(false);
                  navigate('/groups/discover-groups');
                }}
              >
                {isRTL ? 'اكتشف المجموعات' : 'Discover Groups'}
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-1">
                {userGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleGroupSelect(group)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={group.image_url || ''} />
                      <AvatarFallback>{group.group_name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{group.group_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {isRTL ? 'القائد: ' : 'Leader: '}{group.owner_name || (isRTL ? 'غير محدد' : 'Unknown')}
                      </p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Trainings Selection Dialog */}
      <Dialog open={showTrainingsDialog} onOpenChange={setShowTrainingsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {isRTL ? 'اختر التدريب' : 'Select Training'}
            </DialogTitle>
          </DialogHeader>
          
          {loadingTrainings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : userTrainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isRTL ? 'لم تسجل في أي تدريب بعد' : 'You haven\'t enrolled in any training yet'}</p>
              <Button 
                variant="link" 
                onClick={() => {
                  setShowTrainingsDialog(false);
                  navigate('/services/training-services');
                }}
              >
                {isRTL ? 'تصفح التدريبات' : 'Browse Trainings'}
              </Button>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2 p-1">
                {userTrainings.map((training) => (
                  <div
                    key={training.id}
                    onClick={() => handleTrainingSelect(training)}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors border"
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={training.trainer_avatar || ''} />
                      <AvatarFallback>{training.trainer_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{training.service_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {isRTL ? 'المدرب: ' : 'Trainer: '}{training.trainer_name || (isRTL ? 'غير محدد' : 'Unknown')}
                      </p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground", isRTL && "rotate-180")} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Dialog */}
      {selectedGroup && (
        <CreateTicketDialog
          open={showTicketDialog && ticketType === 'group_inquiry'}
          onClose={() => {
            setShowTicketDialog(false);
            setSelectedGroup(null);
          }}
          ticketType="group_inquiry"
          entityType="group"
          entityId={selectedGroup.id}
          targetUserId={selectedGroup.owner_id}
          targetUserName={selectedGroup.owner_name || undefined}
          entityName={selectedGroup.group_name}
        />
      )}
      
      {selectedTraining && (
        <CreateTicketDialog
          open={showTicketDialog && ticketType === 'training_inquiry'}
          onClose={() => {
            setShowTicketDialog(false);
            setSelectedTraining(null);
          }}
          ticketType="training_inquiry"
          entityType="service"
          entityId={selectedTraining.id}
          targetUserId={selectedTraining.trainer_id}
          targetUserName={selectedTraining.trainer_name || undefined}
          targetUserAvatar={selectedTraining.trainer_avatar || undefined}
          entityName={selectedTraining.service_name}
        />
      )}
    </>
  );
};
