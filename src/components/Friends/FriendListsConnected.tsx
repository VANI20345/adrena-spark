import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFriendLists } from "@/hooks/useFriendLists";
import { Skeleton } from "@/components/ui/skeleton";
import { FriendListManagementDialog } from "./FriendListManagementDialog";
import { useFriendGroupChats } from "@/hooks/useFriendGroupChats";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function FriendListsConnected() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lists, loading, createList, deleteList } = useFriendLists();
  const { createChat } = useFriendGroupChats();
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [manageListId, setManageListId] = useState<string | null>(null);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    await createList(newListName, newListDescription, visibility);
    setNewListName("");
    setNewListDescription("");
    setVisibility("private");
    setIsDialogOpen(false);
  };

  const handleStartChat = async (listId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return;

    // Get list members
    const { data: members } = await supabase
      .from("friend_list_members")
      .select("friend_id")
      .eq("list_id", listId);

    if (!members || members.length === 0) {
      toast({
        title: "تنبيه",
        description: "لا توجد أعضاء في هذه القائمة",
        variant: "destructive",
      });
      return;
    }

    const friendIds = members.map(m => m.friend_id);
    const chatId = await createChat(`محادثة ${list.name}`, friendIds);

    if (chatId) {
      navigate("/friends?tab=chats");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">قوائم الأصدقاء</h2>
            <p className="text-muted-foreground">
              نظم أصدقاءك في قوائم مخصصة
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">قوائم الأصدقاء</h2>
          <p className="text-muted-foreground">
            نظم أصدقاءك في قوائم مخصصة
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              إنشاء قائمة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء قائمة أصدقاء جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="list-name">اسم القائمة</Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="مثال: أصدقاء المغامرات"
                />
              </div>
              <div>
                <Label htmlFor="list-description">الوصف</Label>
                <Input
                  id="list-description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="ما هي هذه القائمة؟"
                />
              </div>
              <div>
                <Label>الخصوصية</Label>
                <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="private" id="create-private" />
                    <Label htmlFor="create-private" className="cursor-pointer">
                      خاصة
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="public" id="create-public" />
                    <Label htmlFor="create-public" className="cursor-pointer">
                      عامة
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              <Button onClick={handleCreateList} className="w-full">
                إنشاء القائمة
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {lists.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">لا توجد قوائم بعد</h3>
          <p className="text-muted-foreground mb-4">
            أنشئ قوائم لتنظيم أصدقائك
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            إنشاء أول قائمة
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <Card 
              key={list.id} 
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-card/50 backdrop-blur-sm border-2 hover:border-primary/50"
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-xl">{list.name}</CardTitle>
                    {list.description && (
                      <p className="text-sm text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                  </div>
                  <Badge variant={list.visibility === "private" ? "secondary" : "outline"}>
                    {list.visibility === 'private' ? 'خاص' : 'عام'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {list.member_count} {list.member_count === 1 ? 'عضو' : 'أعضاء'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => setManageListId(list.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                    إدارة
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 gap-2"
                    onClick={() => handleStartChat(list.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    محادثة
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteList(list.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {manageListId && (
        <FriendListManagementDialog
          open={!!manageListId}
          onOpenChange={(open) => !open && setManageListId(null)}
          listId={manageListId}
        />
      )}
    </div>
  );
}
