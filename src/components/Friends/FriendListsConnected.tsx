import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Users, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useFriendLists } from "@/hooks/useFriendLists";
import { Skeleton } from "@/components/ui/skeleton";

export function FriendListsConnected() {
  const { lists, loading, createList, deleteList } = useFriendLists();
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    await createList(newListName, newListDescription);
    setNewListName("");
    setNewListDescription("");
    setIsDialogOpen(false);
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
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Edit2 className="h-4 w-4" />
                    إدارة
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
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
    </div>
  );
}
