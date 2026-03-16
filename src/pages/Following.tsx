import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import FollowersGrid from '@/components/Follow/FollowersGrid';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Following = () => {
  const { userId } = useParams<{ userId: string }>();
  const { language } = useLanguageContext();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" asChild><Link to={`/user/${userId}`}><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-2xl font-bold">{language === 'ar' ? 'يتابع' : 'Following'}</h1>
        </div>
        <FollowersGrid userId={userId!} type="following" />
      </main>
      <Footer />
    </div>
  );
};

export default Following;
