import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Calendar, MessageSquare, Flag } from "lucide-react";
import { useFriendGroupChats, useFriendGroupChatMessages } from "@/hooks/useFriendGroupChats";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { ReportMessageDialog } from "@/components/Chat/ReportMessageDialog";

export function GroupChatsConnected() {
  const { user } = useAuth();
  const { chats, loading, markAsRead } = useFriendGroupChats();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedChat = chats.find(c => c.id === selectedChatId);
  const { messages, loading: messagesLoading, sendMessage } = useFriendGroupChatMessages(selectedChatId || '');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (selectedChatId) {
      markAsRead(selectedChatId);
    }
  }, [selectedChatId, messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    const success = await sendMessage(messageInput);
    if (success) {
      setMessageInput("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">المحادثات الجماعية</h2>
        <p className="text-muted-foreground">
          تواصل مع الأصدقاء والمشاركين في الفعاليات
        </p>
      </div>

      {chats.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">لا توجد محادثات جماعية</h3>
          <p className="text-muted-foreground">
            ستظهر المحادثات الجماعية للفعاليات التي تشارك فيها هنا
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat List */}
          <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg">محادثاتك</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`w-full p-4 text-right hover:bg-muted/50 transition-colors border-r-4 ${
                      selectedChatId === chat.id
                        ? "border-primary bg-muted/50"
                        : "border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/20">
                          {chat.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold truncate">{chat.name}</h4>
                          {chat.unread_count > 0 && (
                            <Badge className="mr-2">{chat.unread_count}</Badge>
                          )}
                        </div>
                        {chat.last_message && (
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.last_message}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span>{chat.member_count} {chat.member_count === 1 ? 'عضو' : 'أعضاء'}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Window */}
          <Card className="lg:col-span-2 flex flex-col bg-card/50 backdrop-blur-sm">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedChat.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{selectedChat.member_count} {selectedChat.member_count === 1 ? 'عضو' : 'أعضاء'}</span>
                      </div>
                    </div>
                  </div>
                  {selectedChat.event_id && (
                    <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div className="text-right">
                          <p className="font-medium">{selectedChat.event_name}</p>
                          {selectedChat.event_date && (
                            <p className="text-muted-foreground">
                              {format(new Date(selectedChat.event_date), 'PPP', { locale: ar })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4 h-[400px]" ref={scrollRef}>
                  {messagesLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-16 w-2/3" />
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      لا توجد رسائل. ابدأ المحادثة!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 group ${
                            message.sender_id === user?.id ? "flex-row-reverse" : ""
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender_avatar || undefined} />
                            <AvatarFallback className="text-xs">
                              {message.sender_name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Report Button */}
                          {message.sender_id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 mt-2"
                              onClick={() => {
                                setMessageToReport(message);
                                setReportDialogOpen(true);
                              }}
                              title="الإبلاغ عن الرسالة"
                            >
                              <Flag className="w-3 h-3 text-destructive" />
                            </Button>
                          )}
                          
                          <div
                            className={`flex flex-col ${
                              message.sender_id === user?.id ? "items-end" : "items-start"
                            } max-w-[70%]`}
                          >
                            <span className="text-xs text-muted-foreground mb-1">
                              {message.sender_name}
                            </span>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                message.sender_id === user?.id
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <CardContent className="border-t p-4">
                  <div className="flex items-center gap-2">
                    <Input
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="اكتب رسالة..."
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} size="icon" disabled={!messageInput.trim()}>
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                اختر محادثة لبدء المراسلة
              </div>
            )}
          </Card>
        </div>
      )}
      
      {/* Report Dialog */}
      {messageToReport && (
        <ReportMessageDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          messageId={messageToReport.id}
          messageContent={messageToReport.content}
          senderId={messageToReport.sender_id}
          messageType="friend_group"
        />
      )}
    </div>
  );
}
