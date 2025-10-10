import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Settings, UserPlus, UserMinus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFriendLists } from "@/hooks/useFriendLists";

interface FriendListManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
}

export function FriendListManagementDialog({ open, onOpenChange, listId }: FriendListManagementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { lists, updateList, addFriendToList, removeFriendFromList } = useFriendLists();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [availableFriends, setAvailableFriends] = useState<any[]>([]);
  const [friendSearch, setFriendSearch] = useState("");
  
  const list = lists.find(l => l.id === listId);
  const [name, setName] = useState(list?.name || "");
  const [description, setDescription] = useState(list?.description || "");
  const [visibility, setVisibility] = useState<"private" | "public">(list?.visibility || "private");

  useEffect(() => {
    if (open && listId) {
      loadMembers();
      loadAvailableFriends();
    }
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
      setVisibility(list.visibility);
    }
  }, [open, listId, list]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("friend_list_members")
        .select(`
          *,
          profiles!friend_list_members_friend_id_fkey(user_id, full_name, avatar_url)
        `)
        .eq("list_id", listId);

      if (error) throw error;

      const memberList = data.map((m: any) => ({
        id: m.id,
        user_id: m.friend_id,
        full_name: m.profiles.full_name,
        avatar_url: m.profiles.avatar_url,
        added_at: m.added_at,
      }));

      setMembers(memberList);
    } catch (error) {
      console.error("Error loading members:", error);
    }
  };

  const loadAvailableFriends = async () => {
    if (!user) return;

    try {
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

      const memberIds = new Set(members.map(m => m.user_id));
      const available = friendList.filter(f => !memberIds.has(f.id));

      setAvailableFriends(available);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      await updateList(listId, name, description, visibility);
      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات القائمة بنجاح",
      });
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
    await addFriendToList(listId, friendId);
    loadMembers();
    loadAvailableFriends();
  };

  const handleRemoveMember = async (friendId: string) => {
    await removeFriendFromList(listId, friendId);
    loadMembers();
    loadAvailableFriends();
  };

  const filteredFriends = availableFriends.filter(f =>
    f.full_name.toLowerCase().includes(friendSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>إدارة القائمة</DialogTitle>
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
            <TabsTrigger value="add">
              <UserPlus className="h-4 w-4 ml-2" />
              إضافة
            </TabsTrigger>
            <TabsTrigger value="settings">
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
                        أضيف {new Date(member.added_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.user_id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
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
              <Label htmlFor="edit-name">اسم القائمة</Label>
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
