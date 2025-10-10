import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Users, Settings, UserPlus, UserMinus, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface GroupManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
}

export function GroupManagementDialog({ open, onOpenChange, chatId }: GroupManagementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [friendSearch, setFriendSearch] = useState("");
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);

  useEffect(() => {
    if (open && chatId) {
      loadChatDetails();
      loadMembers();
      loadAvailableFriends();
    }
  }, [open, chatId]);

  const loadChatDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("friend_group_chats")
        .select("*")
        .eq("id", chatId)
        .single();

      if (error) throw error;

      setChatDetails(data);
      setName(data.name);
      setDescription(data.description || "");
      setVisibility((data.visibility || "private") as "private" | "public");
    } catch (error) {
      console.error("Error loading chat details:", error);
    }
  };

  const loadMembers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("friend_group_chat_members")
        .select(`
          *,
          profiles!friend_group_chat_members_user_id_fkey(user_id, full_name, avatar_url)
        `)
        .eq("chat_id", chatId);

      if (error) throw error;

      const memberList = data.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles.full_name,
        avatar_url: m.profiles.avatar_url,
        joined_at: m.joined_at,
      }));

      setMembers(memberList);

      const currentUserMember = memberList.find((m: any) => m.user_id === user.id);
      setIsAdmin(currentUserMember?.role === "admin");
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadAvailableFriends = async () => {
    if (!user) return;

    try {
      // Get user's friends
      const { data: friendships } = await supabase
        .from("friendships")
        .select(`
          user_id,
          friend_id,
          profiles!friendships_friend_id_fkey(user_id, full_name, avatar_url)
        `)
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq("status", "accepted");

      const friendList = friendships?.map((f: any) => ({
        id: f.friend_id === user.id ? f.user_id : f.friend_id,
        full_name: f.profiles.full_name,
        avatar_url: f.profiles.avatar_url,
      })) || [];

      // Filter out friends who are already members
      const memberIds = new Set(members.map(m => m.user_id));
      const available = friendList.filter(f => !memberIds.has(f.id));

      setAvailableFriends(available);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleUpdateSettings = async () => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("friend_group_chats")
        .update({
          name,
          description,
          visibility,
        })
        .eq("id", chatId);

      if (error) throw error;

      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات المجموعة بنجاح",
      });

      loadChatDetails();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (friendId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from("friend_group_chat_members")
        .insert({
          chat_id: chatId,
          user_id: friendId,
          role: "member",
        });

      if (error) throw error;

      toast({
        title: "تم الإضافة",
        description: "تم إضافة العضو بنجاح",
      });

      loadMembers();
      loadAvailableFriends();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin) return;

    try {
      const { error } = await supabase
        .from("friend_group_chat_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "تم الإزالة",
        description: "تم إزالة العضو من المجموعة",
      });

      loadMembers();
      loadAvailableFriends();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredFriends = availableFriends.filter(f =>
    f.full_name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>إدارة المجموعة</DialogTitle>
          <DialogDescription>
            إدارة الأعضاء والإعدادات
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">
              <Users className="h-4 w-4 ml-2" />
              الأعضاء ({members.length})
            </TabsTrigger>
            <TabsTrigger value="add" disabled={!isAdmin}>
              <UserPlus className="h-4 w-4 ml-2" />
              إضافة
            </TabsTrigger>
            <TabsTrigger value="settings" disabled={!isAdmin}>
              <Settings className="h-4 w-4 ml-2" />
              الإعدادات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                  >
                    <Avatar>
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback>{member.full_name.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{member.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        انضم {new Date(member.joined_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    {member.role === "admin" && (
                      <Badge variant="secondary">
                        <Crown className="h-3 w-3 ml-1" />
                        مشرف
                      </Badge>
                    )}
                    {isAdmin && member.user_id !== user?.id && member.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={friendSearch}
                onChange={(e) => setFriendSearch(e.target.value)}
                placeholder="ابحث عن صديق..."
                className="pr-10"
              />
            </div>
            <ScrollArea className="h-[350px]">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا يوجد أصدقاء متاحون للإضافة</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50"
                    >
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.full_name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{friend.full_name}</span>
                      <Button
                        size="sm"
                        onClick={() => handleAddMember(friend.id)}
                      >
                        <UserPlus className="h-4 w-4 ml-1" />
                        إضافة
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div>
              <Label htmlFor="edit-name">اسم المجموعة</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">الوصف</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label>الخصوصية</Label>
              <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="private" id="edit-private" />
                  <Label htmlFor="edit-private" className="cursor-pointer">
                    خاصة
                  </Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <RadioGroupItem value="public" id="edit-public" />
                  <Label htmlFor="edit-public" className="cursor-pointer">
                    عامة
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Button
              onClick={handleUpdateSettings}
              disabled={loading}
              className="w-full"
            >
              {loading ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
