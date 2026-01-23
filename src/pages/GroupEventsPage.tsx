import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GroupEvents } from '@/components/Groups/GroupEvents';
import { useLanguageContext } from '@/contexts/LanguageContext';
import Navbar from '@/components/Layout/Navbar';

const GroupEventsPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguageContext();
  const isRTL = language === 'ar';

  if (!groupId) {
    return <div>Group not found</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/groups/${groupId}`)}
          className="mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
          {isRTL ? 'العودة للمجموعة' : 'Back to Group'}
        </Button>

        <div className="max-w-6xl mx-auto">
          <GroupEvents groupId={groupId} />
        </div>
      </main>
    </div>
  );
};

export default GroupEventsPage;
