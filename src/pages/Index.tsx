import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import HeroSection from "@/components/Home/HeroSection";
import UpcomingEvents from "@/components/Home/UpcomingEvents";
import MyTrainings from "@/components/Home/MyTrainings";
import JoinSuggestions from "@/components/Home/JoinSuggestions";
import DiscountedEvents from "@/components/Home/DiscountedEvents";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  // No automatic redirect - users access main page when logged in

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <UpcomingEvents />
        <MyTrainings />
        <JoinSuggestions />
        <DiscountedEvents />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
