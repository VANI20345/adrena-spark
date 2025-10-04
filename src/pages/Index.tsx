import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import HeroSection from "@/components/Home/HeroSection";
import CategorySection from "@/components/Home/CategorySection";
import RecentEvents from "@/components/Home/RecentEvents";
import RecentServices from "@/components/Home/RecentServices";
import UserDashboard from "@/components/Home/UserDashboard";
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
        <RecentEvents />
        <RecentServices />
        <CategorySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
