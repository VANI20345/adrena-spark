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
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useFriendGroupChats } from "@/hooks/useFriendGroupChats";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { createChat } = useFriendGroupChats();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && user) {
      loadFriends();
    }
  }, [open, user]);

  const loadFriends = async () => {
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

      const friendList = friendships?.map((f: any) => {
        const profile = f.profiles;
        return {
          id: f.friend_id === user.id ? f.user_id : f.friend_id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
        };
      }) || [];

      setFriends(friendList);
    } catch (error) {
      console.error("Error loading friends:", error);
    }
  };

  const filteredFriends = friends.filter(f =>
    f.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const newSet = new Set(prev);
      if (newSet.has(friendId)) {
        newSet.delete(friendId);
      } else {
        newSet.add(friendId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المجموعة",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const chatId = await createChat(name, Array.from(selectedFriends));
      
      if (chatId) {
        // Update visibility
        await supabase
          .from("friend_group_chats")
          .update({ 
            description,
            visibility 
          })
          .eq("id", chatId);

        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء المجموعة بنجاح",
        });
        
        onOpenChange(false);
        setName("");
        setDescription("");
        setVisibility("private");
        setSelectedFriends(new Set());
      }
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>إنشاء مجموعة جديدة</DialogTitle>
          <DialogDescription>
            أنشئ مجموعة للدردشة مع أصدقائك
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">اسم المجموعة *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="أدخل اسم المجموعة"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف مختصر للمجموعة (اختياري)"
              rows={3}
            />
          </div>

          <div>
            <Label>الخصوصية</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer">
                  خاصة - الأعضاء المدعوون فقط
                </Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer">
                  عامة - يمكن لأي شخص الانضمام
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label>إضافة أصدقاء ({selectedFriends.size} محدد)</Label>
            <div className="relative mt-2 mb-2">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن صديق..."
                className="pr-10"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-lg p-2">
              {filteredFriends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>لا يوجد أصدقاء</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                      onClick={() => toggleFriend(friend.id)}
                    >
                      <Checkbox
                        checked={selectedFriends.has(friend.id)}
                        onCheckedChange={() => toggleFriend(friend.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.full_name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1">{friend.full_name}</span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الإنشاء..." : "إنشاء المجموعة"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
