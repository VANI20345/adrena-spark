import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Smile, Paperclip, Pin, Users, Calendar } from "lucide-react";

interface Message {
  id: string;
  sender: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

interface GroupChat {
  id: string;
  name: string;
  members: number;
  lastMessage: string;
  unread: number;
  event?: {
    name: string;
    date: string;
  };
}

export function GroupChats() {
  const [selectedChat, setSelectedChat] = useState<string | null>("1");
  const [messageInput, setMessageInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chats: GroupChat[] = [
    {
      id: "1",
      name: "Desert Adventure Squad",
      members: 8,
      lastMessage: "Can't wait for tomorrow!",
      unread: 3,
      event: {
        name: "Desert Safari Experience",
        date: "Tomorrow, 6:00 AM",
      },
    },
    {
      id: "2",
      name: "Close Friends",
      members: 12,
      lastMessage: "Who's up for coffee?",
      unread: 0,
    },
    {
      id: "3",
      name: "Hiking Enthusiasts",
      members: 15,
      lastMessage: "Trail conditions look perfect",
      unread: 5,
      event: {
        name: "Mountain Hike",
        date: "This Weekend",
      },
    },
  ];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: { name: "Ahmed", avatar: "" },
      content: "Hey everyone! Just confirmed my spot for tomorrow's adventure!",
      timestamp: new Date(Date.now() - 3600000),
      isOwn: false,
    },
    {
      id: "2",
      sender: { name: "You", avatar: "" },
      content: "Awesome! What time should we meet?",
      timestamp: new Date(Date.now() - 3000000),
      isOwn: true,
    },
    {
      id: "3",
      sender: { name: "Sara", avatar: "" },
      content: "The event starts at 6 AM, let's meet 15 minutes early",
      timestamp: new Date(Date.now() - 2400000),
      isOwn: false,
    },
    {
      id: "4",
      sender: { name: "Mohammed", avatar: "" },
      content: "Perfect! Don't forget to bring water and sunscreen ☀️",
      timestamp: new Date(Date.now() - 1800000),
      isOwn: false,
    },
    {
      id: "5",
      sender: { name: "You", avatar: "" },
      content: "Can't wait for tomorrow! 🎉",
      timestamp: new Date(Date.now() - 300000),
      isOwn: true,
    },
  ]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: { name: "You", avatar: "" },
      content: messageInput,
      timestamp: new Date(),
      isOwn: true,
    };

    setMessages([...messages, newMessage]);
    setMessageInput("");
  };

  const selectedChatData = chats.find(c => c.id === selectedChat);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Group Chats</h2>
        <p className="text-muted-foreground">
          Connect with friends and event participants
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <Card className="lg:col-span-1 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg">Your Chats</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`w-full p-4 text-left hover:bg-muted/50 transition-colors border-l-4 ${
                    selectedChat === chat.id
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold truncate">{chat.name}</h4>
                        {chat.unread > 0 && (
                          <Badge className="ml-2">{chat.unread}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{chat.members} members</span>
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
          {selectedChatData ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedChatData.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{selectedChatData.members} members</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Pin className="h-5 w-5" />
                  </Button>
                </div>
                {selectedChatData.event && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{selectedChatData.event.name}</p>
                        <p className="text-muted-foreground">{selectedChatData.event.date}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 h-[400px]" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.isOwn ? "flex-row-reverse" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {message.sender.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex flex-col ${
                          message.isOwn ? "items-end" : "items-start"
                        } max-w-[70%]`}
                      >
                        <span className="text-xs text-muted-foreground mb-1">
                          {message.sender.name}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            message.isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Input */}
              <CardContent className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1"
                  />
                  <Button onClick={handleSendMessage} size="icon">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a chat to start messaging
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
