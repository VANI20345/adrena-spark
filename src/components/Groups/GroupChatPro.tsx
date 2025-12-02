import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Send, Users, Settings, Paperclip, Image as ImageIcon, 
  Video, Mic, X, Crown, Shield, VolumeX, Volume2, LogOut,
  UserPlus, UserMinus, Ban, Flag
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useGroupMessages } from '@/hooks/useGroupMessages';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ReportMessageDialog } from '@/components/Chat/ReportMessageDialog';

interface Member {
  id: string;
  user_id: string;
  role: string;
  full_name?: string;
  is_muted: boolean;
}

interface GroupChatProProps {
  groupId: string;
  groupName: string;
  groupType: string;
  currentMembers: number;
  maxMembers: number;
  members: Member[];
  currentMember: Member;
  onMembersUpdate: () => void;
  onToggleMute: () => void;
  onLeaveGroup: () => void;
}

export const GroupChatPro: React.FC<GroupChatProProps> = ({ 
  groupId, 
  groupName,
  groupType,
  currentMembers,
  maxMembers,
  members,
  currentMember,
  onMembersUpdate,
  onToggleMute,
  onLeaveGroup
}) => {
  const { user } = useAuth();
  const { t } = useLanguageContext();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [messageToReport, setMessageToReport] = useState<any>(null);
  const { messages, isLoading, sendMessage } = useGroupMessages(groupId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = currentMember.role === 'admin' || currentMember.role === 'owner';
  const isOwner = currentMember.role === 'owner';

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
    } else {
      toast({
        title: 'خطأ',
        description: 'فشل إرسال الرسالة',
        variant: 'destructive'
      });
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const fileArray = Array.from(files);
      console.log('Files selected:', fileArray.map(f => ({ name: f.name, size: f.size, type: f.type })));
      setSelectedFiles(prev => [...prev, ...fileArray]);
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
    stopRecording();
    setAudioBlob(null);
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

  const getRoleBadge = (role: string) => {
    const badges = {
      owner: { text: 'المالك', variant: 'default' as const },
      admin: { text: 'مشرف', variant: 'secondary' as const },
      moderator: { text: 'مشرف', variant: 'secondary' as const },
      member: { text: 'عضو', variant: 'outline' as const }
    };
    return badges[role as keyof typeof badges] || badges.member;
  };

  const handleMuteMember = async (memberId: string, currentlyMuted: boolean) => {
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_muted: !currentlyMuted })
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: currentlyMuted ? 'تم إلغاء كتم العضو' : 'تم كتم العضو'
      });

      onMembersUpdate();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة الكتم',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === 'owner' || memberRole === 'admin') {
      toast({
        title: 'غير مسموح',
        description: 'لا يمكن إزالة المالك أو المشرف',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'تم بنجاح',
        description: 'تم إزالة العضو من المجموعة'
      });

      onMembersUpdate();
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إزالة العضو',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-xl font-bold">{groupName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{currentMembers} / {maxMembers}</span>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="outline">
                  {groupType === 'region' ? 'منطقة' : 'فعالية'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Members Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 ml-2" />
                  الأعضاء
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-96">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    أعضاء المجموعة ({members.length})
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10">
                              {member.full_name?.charAt(0) || 'م'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{member.full_name || 'مستخدم'}</span>
                              {getRoleIcon(member.role)}
                            </div>
                            <Badge variant={getRoleBadge(member.role).variant} className="text-xs">
                              {getRoleBadge(member.role).text}
                            </Badge>
                          </div>
                        </div>
                        
                        {isAdmin && member.user_id !== user?.id && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMuteMember(member.id, member.is_muted)}
                              title={member.is_muted ? 'إلغاء الكتم' : 'كتم'}
                            >
                              {member.is_muted ? (
                                <Volume2 className="w-4 h-4" />
                              ) : (
                                <VolumeX className="w-4 h-4" />
                              )}
                            </Button>
                            {member.role !== 'owner' && member.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.id, member.role)}
                                title="إزالة"
                              >
                                <UserMinus className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            {/* Settings */}
            {isAdmin && (
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            )}

            {/* Quick Actions */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleMute}
              title={currentMember.is_muted ? 'إلغاء كتم الإشعارات' : 'كتم الإشعارات'}
            >
              {currentMember.is_muted ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            {!isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLeaveGroup}
                title="مغادرة المجموعة"
              >
                <LogOut className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              جاري تحميل الرسائل...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>لا توجد رسائل بعد</p>
              <p className="text-sm">كن أول من يرسل رسالة!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.map((message) => {
              const isMine = message.sender_id === user?.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`flex gap-2 max-w-[75%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMine && (
                      <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
                        {message.sender_avatar ? (
                          <img src={message.sender_avatar} alt={message.sender_name} className="w-full h-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-primary/10 text-xs">
                            {message.sender_name?.charAt(0) || 'م'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}
                    
                    {/* Report Button */}
                    {!isMine && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
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
                      className={`rounded-2xl px-4 py-2 ${
                        isMine
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {!isMine && (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold opacity-80">
                            {message.sender_name || 'عضو'}
                          </span>
                          {message.sender_role && getRoleIcon(message.sender_role)}
                          <Badge 
                            variant={getRoleBadge(message.sender_role || 'member').variant} 
                            className="text-[10px] px-1.5 py-0"
                          >
                            {getRoleBadge(message.sender_role || 'member').text}
                          </Badge>
                        </div>
                      )}
                      
                      {message.content && message.content !== '📎 ملف مرفق' && (
                        <div className="mb-1 whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      )}

                      {message.attachments && message.attachments.length > 0 && (
                        <div className="space-y-2 mt-2">
                          {message.attachments.map((att) => (
                            <div key={att.id} className="rounded-lg overflow-hidden">
                              {att.file_type === 'image' && (
                                <img 
                                  src={att.file_url} 
                                  alt={att.file_name || 'صورة'}
                                  className="max-w-full max-h-80 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(att.file_url, '_blank')}
                                />
                              )}
                              {att.file_type === 'video' && (
                                <video 
                                  src={att.file_url} 
                                  controls
                                  className="max-w-full max-h-80 rounded-lg"
                                />
                              )}
                              {att.file_type === 'audio' && (
                                <audio 
                                  src={att.file_url} 
                                  controls
                                  className="w-full min-w-[200px]"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={`text-xs mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(message.created_at).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* File Preview */}
      {(selectedFiles.length > 0 || audioBlob) && (
        <div className="border-t p-3 bg-muted/30">
          <div className="flex gap-2 flex-wrap max-w-4xl mx-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border shadow-sm">
                  {file.type.startsWith('image/') ? <ImageIcon className="w-4 h-4 text-blue-500" /> : 
                   file.type.startsWith('video/') ? <Video className="w-4 h-4 text-purple-500" /> : 
                   <Paperclip className="w-4 h-4 text-gray-500" />}
                  <span className="text-sm max-w-[150px] truncate">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-destructive/10"
                    onClick={() => removeFile(index)}
                  >
                    <X className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {audioBlob && (
              <div className="flex items-center gap-2 bg-background px-3 py-2 rounded-lg border shadow-sm">
                <Mic className="w-4 h-4 text-red-500 animate-pulse" />
                <span className="text-sm">تسجيل صوتي ({formatTime(recordingTime)})</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-destructive/10"
                  onClick={() => setAudioBlob(null)}
                >
                  <X className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="border-t p-3 bg-red-500/10">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium">جاري التسجيل... {formatTime(recordingTime)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={cancelRecording}>
                إلغاء
              </Button>
              <Button variant="default" size="sm" onClick={stopRecording}>
                <Mic className="w-4 h-4 ml-2" />
                إيقاف
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t p-3 bg-card">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            ref={imageInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input
            ref={videoInputRef}
            type="file"
            multiple
            accept="video/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => imageInputRef.current?.click()}
            disabled={isRecording}
            title="إرفاق صورة"
          >
            <ImageIcon className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => videoInputRef.current?.click()}
            disabled={isRecording}
            title="إرفاق فيديو"
          >
            <Video className="w-5 h-5" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            className={isRecording ? 'bg-red-500/10 hover:bg-red-500/20' : ''}
            title={isRecording ? 'إيقاف التسجيل' : 'تسجيل صوتي'}
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'text-red-500 animate-pulse' : ''}`} />
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
            size="icon"
            className="px-6"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Report Dialog */}
      {messageToReport && (
        <ReportMessageDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          messageId={messageToReport.id}
          messageContent={messageToReport.content}
          senderId={messageToReport.sender_id}
          messageType="group"
        />
      )}
    </div>
  );
};

export default GroupChatPro;
