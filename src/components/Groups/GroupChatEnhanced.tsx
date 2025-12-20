import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Users, Settings, Paperclip, Image, Video, Mic, X, Play, Pause, Crown, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { useToast } from '@/hooks/use-toast';

interface GroupChatEnhancedProps {
  groupId: string;
  groupName: string;
  members: Array<{
    id: string;
    user_id: string;
    role: string;
    full_name?: string;
    is_muted: boolean;
  }>;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export const GroupChatEnhanced: React.FC<GroupChatEnhancedProps> = ({ 
  groupId, 
  groupName, 
  members,
  isOwner = false,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const { messages, isLoading, sendMessage } = useGroupMessages(groupId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && selectedFiles.length === 0 && !audioBlob) return;
    
    const filesToSend = audioBlob 
      ? [...selectedFiles, new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' })]
      : selectedFiles;

    const success = await sendMessage(newMessage, filesToSend);
    if (success) {
      setNewMessage('');
      setSelectedFiles([]);
      setAudioBlob(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'لا يمكن الوصول إلى الميكروفون',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioBlob(null);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3 h-3 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-3 h-3 text-blue-500" />;
    return null;
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
        <CardTitle className="flex items-center text-lg">
          {groupName}
        </CardTitle>
        <div className="flex gap-2">
          {/* Members Sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 ml-2" />
                الأعضاء ({members.length})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>أعضاء المجموعة</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
                <div className="space-y-3">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback>
                          {member.full_name?.charAt(0) || 'م'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.full_name}</span>
                          {getRoleIcon(member.role)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {member.role === 'owner' ? 'المالك' : 
                           member.role === 'admin' ? 'مشرف' : 'عضو'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Settings (for admins) */}
          {(isOwner || isAdmin) && (
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4">
        {/* Messages Area */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              جاري تحميل الرسائل...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد رسائل بعد. كن أول من يرسل!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isMine = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isMine && (
                        <div className="text-xs font-medium mb-1 opacity-70">
                          {message.sender_name || 'عضو'}
                        </div>
                      )}
                      
                      {/* Text content */}
                      {message.content && message.content !== '📎' && (
                        <div className="mb-1">{message.content}</div>
                      )}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {message.attachments.map((att) => (
                            <div key={att.id}>
                              {att.file_type === 'image' && (
                                <img 
                                  src={att.file_url} 
                                  alt={att.file_name}
                                  className="rounded max-w-full max-h-60 object-cover"
                                />
                              )}
                              {att.file_type === 'video' && (
                                <video 
                                  src={att.file_url} 
                                  controls
                                  className="rounded max-w-full max-h-60"
                                />
                              )}
                              {att.file_type === 'audio' && (
                                <audio 
                                  src={att.file_url} 
                                  controls
                                  className="w-full"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-xs opacity-70 mt-1">
                        {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Selected Files Preview */}
        {(selectedFiles.length > 0 || audioBlob) && (
          <div className="flex gap-2 flex-wrap p-2 bg-muted rounded-lg">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="flex items-center gap-2 bg-background p-2 rounded border">
                  {file.type.startsWith('image/') ? <Image className="w-4 h-4" /> : 
                   file.type.startsWith('video/') ? <Video className="w-4 h-4" /> : 
                   <Paperclip className="w-4 h-4" />}
                  <span className="text-xs max-w-[100px] truncate">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {audioBlob && (
              <div className="flex items-center gap-2 bg-background p-2 rounded border">
                <Mic className="w-4 h-4" />
                <span className="text-xs">تسجيل صوتي</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setAudioBlob(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="flex-1 text-sm">جاري التسجيل... {formatTime(recordingTime)}</span>
            <Button variant="outline" size="sm" onClick={cancelRecording}>
              إلغاء
            </Button>
            <Button variant="default" size="sm" onClick={stopRecording}>
              إيقاف
            </Button>
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
          >
            <Mic className={`w-4 h-4 ${isRecording ? 'text-destructive' : ''}`} />
          </Button>

          <Input
            placeholder="اكتب رسالتك..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            className="flex-1"
            disabled={isLoading || isRecording}
          />
          
          <Button 
            onClick={handleSendMessage} 
            disabled={(!newMessage.trim() && selectedFiles.length === 0 && !audioBlob) || isLoading || isRecording} 
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GroupChatEnhanced;
