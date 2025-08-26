import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bell, Wallet, Globe, Menu, X, Mountain } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [language, setLanguage] = useState("ar");

  const toggleLanguage = () => {
    setLanguage(prev => prev === "ar" ? "en" : "ar");
    // Update document direction
    document.documentElement.dir = language === "ar" ? "ltr" : "rtl";
  };

  const navItems = [
    { title: "استكشاف", href: "/explore", titleEn: "Explore" },
    { title: "الخدمات", href: "/services", titleEn: "Services" },
    { title: "عنّا", href: "/about", titleEn: "About" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg hero-gradient">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-primary">
              {language === "ar" ? "أدرينا" : "Adrena"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium transition-colors hover:text-primary smooth-transition"
              >
                {language === "ar" ? item.title : item.titleEn}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4 rtl:space-x-reverse">
            <Button variant="ghost" size="icon" onClick={toggleLanguage}>
              <Globe className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Wallet className="w-4 h-4" />
            </Button>
            <Button variant="default">
              {language === "ar" ? "تسجيل الدخول" : "Sign In"}
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={language === "ar" ? "right" : "left"}>
              <div className="mt-6 flow-root">
                <div className="space-y-2 py-6">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className="block px-3 py-2 text-base font-medium text-foreground hover:text-primary smooth-transition"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {language === "ar" ? item.title : item.titleEn}
                    </Link>
                  ))}
                  <div className="flex items-center space-x-4 rtl:space-x-reverse px-3 py-2">
                    <Button variant="ghost" size="icon" onClick={toggleLanguage}>
                      <Globe className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Bell className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Wallet className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="px-3 py-2">
                    <Button className="w-full">
                      {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;