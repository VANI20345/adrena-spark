import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import HeroSection from "@/components/Home/HeroSection";
import UpcomingEvents from "@/components/Home/UpcomingEvents";
import MyTrainings from "@/components/Home/MyTrainings";
import JoinSuggestions from "@/components/Home/JoinSuggestions";
import DiscountedEvents from "@/components/Home/DiscountedEvents";
import { FloatingTicketButton } from "@/components/Tickets/FloatingTicketButton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from 'react-router-dom';
import { useLanguageContext } from "@/contexts/LanguageContext";
import { Plus, Settings, ArrowLeft, ArrowRight } from "lucide-react";

const Index = () => {
  const { user, userRole, loading } = useAuth();
  const { language, t, isRTL } = useLanguageContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Anonymous user view
  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          {/* Signup CTA */}
          <section className="py-20">
            <div className="container mx-auto px-4">
              <Card className="overflow-hidden border-0 shadow-none bg-transparent">
                <CardContent className="p-0">
                  <div className="relative rounded-2xl overflow-hidden bg-primary px-8 py-14 sm:px-14 sm:py-16 text-center">
                    {/* Decorative circles */}
                    <div className="absolute top-0 ltr:right-0 rtl:left-0 w-40 h-40 rounded-full bg-brand-lime/10 -translate-y-1/2 ltr:translate-x-1/2 rtl:-translate-x-1/2" />
                    <div className="absolute bottom-0 ltr:left-0 rtl:right-0 w-28 h-28 rounded-full bg-brand-teal/10 translate-y-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2" />
                    
                    <div className="relative z-10">
                      <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-primary-foreground">
                        {t('index.joinToday')}
                      </h2>
                      <p className="text-base text-primary-foreground/70 mb-8 max-w-xl mx-auto font-display leading-relaxed">
                        {t('index.signUpDescription')}
                      </p>
                      <Button size="lg" variant="brand" className="rounded-xl px-8 h-12 font-semibold gap-2" asChild>
                        <Link to="/auth">
                          {t('index.signUpAsAttendee')}
                          <ArrowIcon className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
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
          {/* Provider Actions */}
          <section className="py-16">
            <div className="container mx-auto px-4">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-8 text-center text-foreground">
                  {t('index.manageServices')}
                </h2>
                <div className="grid md:grid-cols-2 gap-5">
                  <Card className="group hover:shadow-md transition-all duration-300 border-border/60">
                    <CardContent className="p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5 group-hover:bg-primary/10 transition-colors">
                        <Settings className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">
                        {t('index.manageServicesButton')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-display">
                        {t('index.viewEditServices')}
                      </p>
                      <Button size="lg" variant="outline" className="w-full rounded-xl" asChild>
                        <Link to="/manage-services">
                          {t('index.manageServicesButton')}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card className="group hover:shadow-md transition-all duration-300 border-brand-lime/20 bg-brand-lime/[0.03]">
                    <CardContent className="p-8 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-brand-lime/10 flex items-center justify-center mx-auto mb-5 group-hover:bg-brand-lime/20 transition-colors">
                        <Plus className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2 text-foreground">
                        {t('index.addNewService')}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-6 font-display">
                        {t('index.offerNewService')}
                      </p>
                      <Button size="lg" variant="brand" className="w-full rounded-xl" asChild>
                        <Link to="/create-service">
                          {t('index.addService')}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>
        </main>
        <FloatingTicketButton />
        <Footer />
      </div>
    );
  }

  // Attendee and Admin view
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
      <FloatingTicketButton />
      <Footer />
    </div>
  );
};

export default Index;
