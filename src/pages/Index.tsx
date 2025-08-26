import Navbar from "@/components/Layout/Navbar";
import Footer from "@/components/Layout/Footer";
import HeroSection from "@/components/Home/HeroSection";
import FeaturedEvents from "@/components/Home/FeaturedEvents";
import CategorySection from "@/components/Home/CategorySection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturedEvents />
        <CategorySection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
