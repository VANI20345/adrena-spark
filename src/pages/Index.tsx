import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import HeroSection from "@/components/Home/HeroSection";
import UpcomingEvents from "@/components/Home/UpcomingEvents";
import MyTrainings from "@/components/Home/MyTrainings";
import JoinSuggestions from "@/components/Home/JoinSuggestions";
import DiscountedEvents from "@/components/Home/DiscountedEvents";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { useLanguageContext } from "@/contexts/LanguageContext";
import { Plus, Settings } from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const { language, t } = useLanguageContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Anonymous user view
  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          {/* Signup Advertisement Section */}
          <div className="container mx-auto px-4 py-16">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-12 text-center">
                <h2 className="text-3xl font-bold mb-4">
                  {t('index.joinToday')}
                </h2>
                <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                  {t('index.signUpDescription')}
                </p>
                <Button size="lg" asChild>
                  <Link to="/auth">
                    {t('index.signUpAsAttendee')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Provider view
  if (userRole === 'provider') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          {/* Provider Actions Section */}
          <div className="container mx-auto px-4 py-16">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-center">
                {t('index.manageServices')}
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-8 text-center">
                    <Settings className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-3">
                      {t('index.manageServicesButton')}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t('index.viewEditServices')}
                    </p>
                    <Button size="lg" variant="outline" className="w-full" asChild>
                      <Link to="/manage-services">
                        {t('index.manageServicesButton')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="hover:shadow-lg transition-shadow border-primary/20 bg-primary/5">
                  <CardContent className="p-8 text-center">
                    <Plus className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-xl font-semibold mb-3">
                      {t('index.addNewService')}
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      {t('index.offerNewService')}
                    </p>
                    <Button size="lg" className="w-full" asChild>
                      <Link to="/create-service">
                        {t('index.addService')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Attendee and Admin view (default)
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
