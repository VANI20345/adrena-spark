import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Edit2, Trash2, Users, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FriendList {
  id: string;
  name: string;
  description: string;
  member_count: number;
  visibility: "public" | "private";
}

interface Friend {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export function FriendLists() {
  const [lists, setLists] = useState<FriendList[]>([
    {
      id: "1",
      name: "Close Friends",
      description: "My closest circle",
      member_count: 12,
      visibility: "private",
    },
    {
      id: "2",
      name: "Event Buddies",
      description: "People I attend events with",
      member_count: 25,
      visibility: "public",
    },
    {
      id: "3",
      name: "Work Connections",
      description: "Professional network",
      member_count: 18,
      visibility: "private",
    },
  ]);
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleCreateList = () => {
    if (!newListName.trim()) return;

    const newList: FriendList = {
      id: Date.now().toString(),
      name: newListName,
      description: newListDescription,
      member_count: 0,
      visibility: "private",
    };

    setLists([...lists, newList]);
    setNewListName("");
    setNewListDescription("");
    setIsDialogOpen(false);

    toast({
      title: "List created",
      description: `"${newListName}" has been created successfully`,
    });
  };

  const handleDeleteList = (id: string) => {
    setLists(lists.filter(list => list.id !== id));
    toast({
      title: "List deleted",
      description: "Friend list has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Friend Lists</h2>
          <p className="text-muted-foreground">
            Organize your friends into custom groups
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Friend List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="list-name">List Name</Label>
                <Input
                  id="list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Adventure Squad"
                />
              </div>
              <div>
                <Label htmlFor="list-description">Description</Label>
                <Input
                  id="list-description"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  placeholder="What's this list for?"
                />
              </div>
              <Button onClick={handleCreateList} className="w-full">
                Create List
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
                  <p className="text-sm text-muted-foreground">
                    {list.description}
                  </p>
                </div>
                <Badge variant={list.visibility === "private" ? "secondary" : "outline"}>
                  {list.visibility}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {list.member_count} members
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Edit2 className="h-4 w-4" />
                  Manage
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Chat
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleDeleteList(list.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
