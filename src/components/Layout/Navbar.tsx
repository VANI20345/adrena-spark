import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, Wallet, Globe, Menu, Mountain, User, LogOut } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { useNotifications } from '@/hooks/useNotifications';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t, isRTL } = useLanguageContext();
  const { user, userRole, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'attendee': return t('authentication.attendee');
      case 'organizer': return t('authentication.organizer');
      case 'provider': return t('authentication.provider');
      case 'admin': return t('authentication.admin');
      default: return '';
    }
  };

  const getNavItemsForRole = (role: string | null) => {
    const baseItems = [
      { title: "الرئيسية", href: "/", titleEn: "Home" },
    ];

    if (!role) {
      return [
        ...baseItems,
        { title: "استكشاف", href: "/explore", titleEn: "Explore" },
        { title: "الخدمات", href: "/services", titleEn: "Services" },
        { title: "تواصل معنا", href: "/contact", titleEn: "Contact" },
      ];
    }

    switch (role) {
      case 'attendee':
        return [
          ...baseItems,
          { title: "استكشاف", href: "/explore", titleEn: "Explore" },
          { title: "فعالياتي", href: "/my-events", titleEn: "My Events" },
          { title: "القروبات", href: "/groups", titleEn: "Groups" },
          { title: "النقاط", href: "/points", titleEn: "Points" },
          { title: "تواصل معنا", href: "/contact", titleEn: "Contact" },
        ];
      case 'organizer':
        return [
          ...baseItems,
          { title: "إنشاء فعالية", href: "/create-event", titleEn: "Create Event" },
          { title: "القروبات", href: "/groups", titleEn: "Groups" },
          { title: "النقاط", href: "/points", titleEn: "Points" },
          { title: "تواصل معنا", href: "/contact", titleEn: "Contact" },
        ];
      case 'provider':
        return [
          ...baseItems,
          { title: "إضافة خدمة", href: "/create-service", titleEn: "Add Service" },
          { title: "إدارة الخدمات", href: "/manage-services", titleEn: "Manage Services" },
          { title: "القروبات", href: "/groups", titleEn: "Groups" },
          { title: "النقاط", href: "/points", titleEn: "Points" },
          { title: "تواصل معنا", href: "/contact", titleEn: "Contact" },
        ];
      case 'admin':
        return [
          ...baseItems,
          { title: "استكشاف", href: "/explore", titleEn: "Explore" },
          { title: "الخدمات", href: "/services", titleEn: "Services" },
          { title: "القروبات", href: "/groups", titleEn: "Groups" },
          { title: "لوحة الإدارة", href: "/admin", titleEn: "Admin Panel" },
          { title: "تواصل معنا", href: "/contact", titleEn: "Contact" },
        ];
      default:
        return baseItems;
    }
  };

  const navItems = getNavItemsForRole(userRole);

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
          <div className="hidden md:flex items-center space-x-8 rtl:space-x-reverse">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium transition-colors hover:text-primary smooth-transition px-2"
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

            {user ? (
              <>
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative" asChild>
                  <Link to="/notifications">
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* Wallet */}
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/wallet">
                    <Wallet className="w-4 h-4" />
                  </Link>
                </Button>

                {/* Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 rtl:space-x-reverse">
                      <User className="w-4 h-4" />
                      <span className="text-sm">
                        {language === "ar" ? "الملف الشخصي" : "Profile"}
                      </span>
                      {userRole && (
                        <span className="text-xs text-muted-foreground">
                          ({getRoleText(userRole)})
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        {language === "ar" ? "الملف الشخصي" : "Profile"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/${userRole}-dashboard`}>
                        {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                      </Link>
                    </DropdownMenuItem>
                    {userRole === 'attendee' && (
                      <DropdownMenuItem asChild>
                        <Link to="/my-events">
                          {language === "ar" ? "فعالياتي" : "My Events"}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {userRole === 'organizer' && (
                      <DropdownMenuItem asChild>
                        <Link to="/manage-events">
                          {language === "ar" ? "إدارة الفعاليات" : "Manage Events"}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {userRole === 'provider' && (
                      <DropdownMenuItem asChild>
                        <Link to="/manage-services">
                          {language === "ar" ? "إدارة الخدمات" : "Manage Services"}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {userRole === 'admin' && (
                      <DropdownMenuItem>
                        {language === "ar" ? "لوحة الإدارة" : "Admin Panel"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/wallet">
                        {language === "ar" ? "المحفظة" : "Wallet"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/points">
                        {language === "ar" ? "النقاط" : "Points"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/settings">
                        {language === "ar" ? "الإعدادات" : "Settings"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 ml-2" />
                      {language === "ar" ? "تسجيل الخروج" : "Sign Out"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild>
                <Link to="/auth">
                  {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                </Link>
              </Button>
            )}
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
                     {user && (
                       <>
                         <Button variant="ghost" size="icon" className="relative" asChild>
                           <Link to="/notifications">
                             <Bell className="w-4 h-4" />
                             {unreadCount > 0 && (
                               <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1">
                                 {unreadCount > 99 ? '99+' : unreadCount}
                               </span>
                             )}
                           </Link>
                         </Button>
                         <Button variant="ghost" size="icon" asChild>
                           <Link to="/wallet">
                             <Wallet className="w-4 h-4" />
                           </Link>
                         </Button>
                       </>
                     )}
                  </div>
                  
                  <div className="px-3 py-2">
                    {user ? (
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          {userRole && `${getRoleText(userRole)}`}
                        </div>
                        <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                          <Button variant="outline" className="w-full mb-2">
                            {language === "ar" ? "الملف الشخصي" : "Profile"}
                          </Button>
                        </Link>
                        <Link to={`/${userRole}-dashboard`} onClick={() => setIsMenuOpen(false)}>
                          <Button variant="outline" className="w-full mb-2">
                            {language === "ar" ? "لوحة التحكم" : "Dashboard"}
                          </Button>
                        </Link>
                        <Button variant="outline" className="w-full" onClick={handleSignOut}>
                          {language === "ar" ? "تسجيل الخروج" : "Sign Out"}
                        </Button>
                      </div>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link to="/auth">
                          {language === "ar" ? "تسجيل الدخول" : "Sign In"}
                        </Link>
                      </Button>
                    )}
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