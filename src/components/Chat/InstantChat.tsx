import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Send, 
  Users, 
  Settings, 
  Smile,
  Image as ImageIcon,
  MoreVertical,
  UserPlus,
  Volume2,
  VolumeX,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'image' | 'system';
  edited?: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'typing';
  avatar?: string;
  role?: 'admin' | 'member' | 'moderator';
}

interface ChatGroup {
  id: string;
  name: string;
  type: 'region' | 'event';
  memberCount: number;
  unreadCount?: number;
}

interface InstantChatProps {
  groupId: string;
  groupType: 'region' | 'event';
  currentUserId: string;
  currentUserName: string;
}

export const InstantChat = ({ 
  groupId, 
  groupType, 
  currentUserId, 
  currentUserName 
}: InstantChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      userId: 'system',
      userName: 'النظام',
      message: 'مرحباً بكم في المجموعة!',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      type: 'system'
    },
    {
      id: '2',
      userId: '2',
      userName: 'أحمد محمد',
      message: 'مرحبا بالجميع! متحمس للفعالية القادمة',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
      type: 'text'
    },
    {
      id: '3',
      userId: '3',
      userName: 'فاطمة علي',
      message: 'مرحباً! هل يمكن أن نتناقش حول التجهيزات المطلوبة؟',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      type: 'text'
    }
  ]);

  const [users, setUsers] = useState<ChatUser[]>([
    { id: currentUserId, name: currentUserName, status: 'online', role: 'member' },
    { id: '2', name: 'أحمد محمد', status: 'online', role: 'member' },
    { id: '3', name: 'فاطمة علي', status: 'typing', role: 'member' },
    { id: '4', name: 'سارة أحمد', status: 'offline', role: 'moderator' }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showUserList, setShowUserList] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    let typingTimer: NodeJS.Timeout;
    if (newMessage.length > 0) {
      setIsTyping(true);
      typingTimer = setTimeout(() => setIsTyping(false), 1000);
    }
    return () => clearTimeout(typingTimer);
  }, [newMessage]);

  const sendMessage = () => {
    if (!newMessage.trim()) return;

    // Check for banned words (mock implementation)
    const bannedWords = ['spam', 'سب', 'عنف'];
    const containsBannedWord = bannedWords.some(word => 
      newMessage.toLowerCase().includes(word.toLowerCase())
    );

    if (containsBannedWord) {
      toast({
        title: "رسالة محظورة",
        description: "رسالتك تحتوي على كلمات غير مناسبة",
        variant: "destructive"
      });
      return;
    }

    const message: Message = {
      id: Math.random().toString(),
      userId: currentUserId,
      userName: currentUserName,
      message: newMessage,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Play notification sound
    if (soundEnabled) {
      // In a real app, play actual sound
      console.log('Playing notification sound');
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'الآن';
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
    
    return timestamp.toLocaleDateString('ar-SA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'typing': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const onlineUsers = users.filter(u => u.status === 'online');
  const typingUsers = users.filter(u => u.status === 'typing' && u.id !== currentUserId);

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {/* Main Chat */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>
                  دردشة {groupType === 'region' ? 'المنطقة' : 'الفعالية'}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {onlineUsers.length} متصل من أصل {users.length}
                  {typingUsers.length > 0 && (
                    <span className="text-yellow-600">
                      • {typingUsers[0].name} يكتب...
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUserList(!showUserList)}
                className="lg:hidden"
              >
                <Users className="h-4 w-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Search className="h-4 w-4 mr-2" />
                    البحث في الرسائل
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    إعدادات المجموعة
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    مغادرة المجموعة
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-96">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.userId === currentUserId ? 'justify-end' : 'justify-start'
                  } ${message.type === 'system' ? 'justify-center' : ''}`}
                >
                  {message.type === 'system' ? (
                    <div className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {message.message}
                      </Badge>
                    </div>
                  ) : (
                    <div className={`max-w-xs lg:max-w-md ${
                      message.userId === currentUserId ? 'order-2' : 'order-1'
                    }`}>
                      {message.userId !== currentUserId && (
                        <p className="text-xs text-muted-foreground mb-1 px-3">
                          {message.userName}
                        </p>
                      )}
                      
                      <div className={`rounded-lg p-3 ${
                        message.userId === currentUserId
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm leading-relaxed">{message.message}</p>
                        <p className={`text-xs mt-1 ${
                          message.userId === currentUserId
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {formatTimestamp(message.timestamp)}
                          {message.edited && ' • معدلة'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <Smile className="h-4 w-4" />
              </Button>
              <Input
                placeholder="اكتب رسالتك..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className={`${showUserList || 'hidden lg:block'}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            الأعضاء ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {user.name.charAt(0)}
                    </span>
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${getStatusColor(user.status)}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.name}
                    {user.id === currentUserId && ' (أنت)'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.status === 'online' && 'متصل'}
                    {user.status === 'offline' && 'غير متصل'}
                    {user.status === 'typing' && 'يكتب...'}
                  </p>
                </div>

                {user.role && user.role !== 'member' && (
                  <Badge variant="outline" className="text-xs">
                    {user.role === 'admin' ? 'مدير' : 'مشرف'}
                  </Badge>
                )}
              </div>
            ))}

            <Button variant="outline" className="w-full mt-4" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              دعوة أعضاء
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};