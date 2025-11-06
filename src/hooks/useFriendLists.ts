import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface FriendList {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  visibility: 'public' | 'private';
  member_count: number;
  created_at: string;
}

export const useFriendLists = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lists, setLists] = useState<FriendList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }

    fetchLists();
  }, [user]);

  const fetchLists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friend_lists')
        .select(`
          *,
          friend_list_members(count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const listsWithCount: FriendList[] = (data || []).map((list: any) => ({
        id: list.id,
        user_id: list.user_id,
        name: list.name,
        description: list.description,
        visibility: list.visibility,
        member_count: list.friend_list_members?.[0]?.count || 0,
        created_at: list.created_at
      }));

      setLists(listsWithCount);
    } catch (error: any) {
      console.error('Error fetching friend lists:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحميل قوائم الأصدقاء',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createList = async (name: string, description?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('friend_lists')
        .insert({
          user_id: user.id,
          name,
          description: description || null,
          visibility: 'private'
        });

      if (error) throw error;

      toast({
        title: 'تم الإنشاء',
        description: 'تم إنشاء القائمة بنجاح'
      });

      fetchLists();
    } catch (error: any) {
      console.error('Error creating list:', error);
      toast({
        title: 'خطأ',
        description: 'فشل إنشاء القائمة',
        variant: 'destructive'
      });
    }
  };

  const updateList = async (listId: string, name: string, description?: string) => {
    try {
      const { error } = await supabase
        .from('friend_lists')
        .update({
          name,
          description: description || null
        })
        .eq('id', listId);

      if (error) throw error;

      toast({
        title: 'تم التحديث',
        description: 'تم تحديث القائمة بنجاح'
      });

      fetchLists();
    } catch (error: any) {
      console.error('Error updating list:', error);
      toast({
        title: 'خطأ',
        description: 'فشل تحديث القائمة',
        variant: 'destructive'
      });
    }
  };

  const deleteList = async (listId: string) => {
    try {
      const { error } = await supabase
        .from('friend_lists')
        .delete()
        .eq('id', listId);

      if (error) throw error;

      toast({
        title: 'تم الحذف',
        description: 'تم حذف القائمة بنجاح'
      });

      fetchLists();
    } catch (error: any) {
      console.error('Error deleting list:', error);
      toast({
        title: 'خطأ',
        description: 'فشل حذف القائمة',
        variant: 'destructive'
      });
    }
  };

  const addFriendToList = async (listId: string, friendId: string) => {
    try {
      const { error } = await supabase
        .from('friend_list_members')
        .insert({
          list_id: listId,
          friend_id: friendId
        });

      if (error) throw error;

      toast({
        title: 'تمت الإضافة',
        description: 'تمت إضافة الصديق للقائمة'
      });

      fetchLists();
    } catch (error: any) {
      console.error('Error adding friend to list:', error);
      toast({
        title: 'خطأ',
        description: 'فشلت إضافة الصديق',
        variant: 'destructive'
      });
    }
  };

  const removeFriendFromList = async (listId: string, friendId: string) => {
    try {
      const { error } = await supabase
        .from('friend_list_members')
        .delete()
        .eq('list_id', listId)
        .eq('friend_id', friendId);

      if (error) throw error;

      toast({
        title: 'تمت الإزالة',
        description: 'تمت إزالة الصديق من القائمة'
      });

      fetchLists();
    } catch (error: any) {
      console.error('Error removing friend from list:', error);
      toast({
        title: 'خطأ',
        description: 'فشلت إزالة الصديق',
        variant: 'destructive'
      });
    }
  };

  return {
    lists,
    loading,
    refetch: fetchLists,
    createList,
    updateList,
    deleteList,
    addFriendToList,
    removeFriendFromList
  };
};
