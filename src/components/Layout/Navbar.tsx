import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Bell, Wallet, Globe, Menu, User, LogOut, Home, Calendar, 
  Users, Briefcase, Search, PlusCircle, Settings, MessageCircle,
  LayoutDashboard, ShieldCheck, Star, Ticket, Trophy, Gift
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import adrenaLogo from '@/assets/adrena_logo.png';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationDropdown } from '@/components/Notifications/NotificationDropdown';
import DiscoverSearchDropdown from '@/components/Follow/DiscoverSearchDropdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Profile } from '@/contexts/AuthContext';

interface NavIconButtonProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
  showLabel?: boolean; // New prop to control label visibility
}

// Updated NavIconButton to optionally show labels on large screens
const NavIconButton = ({ to, icon, label, isActive, badge, showLabel = false }: NavIconButtonProps) => (
  <TooltipProvider delayDuration={100}>
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={to} className="relative">
          <Button
            variant="ghost"
            size={showLabel ? "default" : "icon"}
            className={cn(
              "relative transition-all duration-200",
              showLabel ? "px-3 h-10 gap-2" : "h-10 w-10 rounded-full",
              isActive 
                ? "bg-primary/10 text-primary hover:bg-primary/15" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {icon}
            {/* Show label on large screens when showLabel is true */}
            {showLabel && (
              <span className="hidden lg:inline text-sm font-medium">{label}</span>
            )}
            {badge && badge > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
            {isActive && !showLabel && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
            )}
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs lg:hidden">
        {label}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, t, isRTL } = useLanguageContext();
  const { user, userRole, signOut, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'attendee': return t('authentication.attendee');
      case 'provider': return t('authentication.provider');
      case 'admin': return t('authentication.admin');
      default: return '';
    }
  };

  // Main navigation icons based on role
  const getMainNavIcons = () => {
    const baseIcons = [
      { 
        to: '/', 
        icon: <Home className="h-5 w-5" />, 
        label: language === 'ar' ? 'الرئيسية' : 'Home' 
      },
    ];

    if (!user) {
      return [
        ...baseIcons,
        { 
          to: '/events', 
          icon: <Calendar className="h-5 w-5" />, 
          label: language === 'ar' ? 'الفعاليات' : 'Events' 
        },
        { 
          to: '/groups/discover-groups', 
          icon: <Users className="h-5 w-5" />, 
          label: language === 'ar' ? 'القروبات' : 'Groups' 
        },
        { 
          to: '/services', 
          icon: <Briefcase className="h-5 w-5" />, 
          label: language === 'ar' ? 'الخدمات' : 'Services' 
        },
      ];
    }

    switch (userRole) {
      case 'attendee':
        return [
          ...baseIcons,
          { 
            to: '/my-events', 
            icon: <Calendar className="h-5 w-5" />, 
            label: language === 'ar' ? 'فعالياتي' : 'My Events' 
          },
          { 
            to: '/groups', 
            icon: <Users className="h-5 w-5" />, 
            label: language === 'ar' ? 'القروبات' : 'Groups' 
          },
          { 
            to: '/services', 
            icon: <Briefcase className="h-5 w-5" />, 
            label: language === 'ar' ? 'الخدمات' : 'Services' 
          },
          // Discover is handled separately with DiscoverSearchDropdown
        ];
      case 'provider':
        return [
          ...baseIcons,
          { 
            to: '/manage-services', 
            icon: <Briefcase className="h-5 w-5" />, 
            label: language === 'ar' ? 'خدماتي' : 'My Services' 
          },
          { 
            to: '/create-service', 
            icon: <PlusCircle className="h-5 w-5" />, 
            label: language === 'ar' ? 'إضافة خدمة' : 'Add Service' 
          },
          { 
            to: '/provider-dashboard', 
            icon: <LayoutDashboard className="h-5 w-5" />, 
            label: language === 'ar' ? 'لوحة التحكم' : 'Dashboard' 
          },
        ];
      case 'admin':
        return [
          ...baseIcons,
          { 
            to: '/events', 
            icon: <Calendar className="h-5 w-5" />, 
            label: language === 'ar' ? 'الفعاليات' : 'Events' 
          },
          { 
            to: '/groups', 
            icon: <Users className="h-5 w-5" />, 
            label: language === 'ar' ? 'القروبات' : 'Groups' 
          },
          { 
            to: '/services', 
            icon: <Briefcase className="h-5 w-5" />, 
            label: language === 'ar' ? 'الخدمات' : 'Services' 
          },
          { 
            to: '/admin', 
            icon: <ShieldCheck className="h-5 w-5" />, 
            label: language === 'ar' ? 'لوحة الإدارة' : 'Admin' 
          },
        ];
      default:
        return baseIcons;
    }
  };

  const mainNavIcons = getMainNavIcons();

  // Mobile nav items with text
  const getMobileNavItems = () => {
    const items = mainNavIcons.map(item => ({
      ...item,
      title: item.label
    }));
    
    if (user) {
      items.push({
        to: '/contact',
        icon: <MessageCircle className="h-5 w-5" />,
        label: language === 'ar' ? 'تواصل معنا' : 'Contact',
        title: language === 'ar' ? 'تواصل معنا' : 'Contact'
      });
    }
    
    return items;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={adrenaLogo} alt="هواية Logo" className="w-10 h-10 object-contain" />
            <span className="text-lg font-bold text-primary hidden sm:block">
              هواية
            </span>
          </Link>

          {/* Center Navigation - Desktop */}
          <div className="hidden md:flex items-center justify-center gap-1">
            {mainNavIcons.map((item) => (
              <NavIconButton
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.to)}
                showLabel={true} // Show labels on large screens
              />
            ))}
            {/* Discover Search Dropdown - only for logged-in attendee users */}
            {user && userRole === 'attendee' && (
              <DiscoverSearchDropdown />
            )}
          </div>

          {/* Right Actions - Desktop */}
          <div className="hidden md:flex items-center gap-1">
            {/* Language Toggle */}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                    className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {language === 'ar' ? 'English' : 'العربية'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Theme Toggle */}
            <ThemeToggle />

            {user ? (
              <>
                {/* Notifications */}
                <NotificationDropdown />

                {/* Wallet */}
                <NavIconButton
                  to="/wallet"
                  icon={<Wallet className="h-5 w-5" />}
                  label={language === 'ar' ? 'المحفظة' : 'Wallet'}
                  isActive={isActive('/wallet')}
                />

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className={cn(
                        "h-10 w-10 rounded-full transition-all duration-200",
                        isActive('/profile') || isActive('/settings')
                          ? "bg-primary/10 text-primary" 
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      )}
                    >
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Profile" 
                          className="h-7 w-7 rounded-full object-cover ring-2 ring-background"
                        />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name || (language === 'ar' ? 'المستخدم' : 'User')}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userRole && getRoleText(userRole)}
                          {profile?.display_id && ` • ${profile.display_id}`}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                      </Link>
                    </DropdownMenuItem>
                    
                    {userRole !== 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to={`/${userRole}-dashboard`} className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" />
                          {language === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {userRole === 'attendee' && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/my-events" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {language === 'ar' ? 'فعالياتي' : 'My Events'}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/tickets" className="flex items-center gap-2">
                            <Ticket className="h-4 w-4" />
                            {language === 'ar' ? 'تذاكري' : 'My Tickets'}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/points" className="flex items-center gap-2">
                            <Star className="h-4 w-4" />
                            {language === 'ar' ? 'النقاط' : 'Points'}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/achievements" className="flex items-center gap-2">
                            <Trophy className="h-4 w-4" />
                            {language === 'ar' ? 'الإنجازات' : 'Achievements'}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/referral" className="flex items-center gap-2">
                            <Gift className="h-4 w-4" />
                            {language === 'ar' ? 'دعوة أصدقاء' : 'Invite Friends'}
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {userRole === 'provider' && (
                      <DropdownMenuItem asChild>
                        <Link to="/manage-services" className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4" />
                          {language === 'ar' ? 'إدارة الخدمات' : 'Manage Services'}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {userRole === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          {language === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    <DropdownMenuItem asChild>
                      <Link to="/wallet" className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        {language === 'ar' ? 'المحفظة' : 'Wallet'}
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        {language === 'ar' ? 'الإعدادات' : 'Settings'}
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm" className="rounded-full px-4">
                <Link to="/auth">
                  {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-1">
            {user && <NotificationDropdown />}
            
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "right" : "left"} className="w-72">
                <div className="mt-6 flex flex-col h-full">
                  {/* User Info */}
                  {user && profile && (
                    <div className="flex items-center gap-3 pb-4 border-b mb-4">
                      {profile.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt="Profile" 
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {profile.full_name || (language === 'ar' ? 'المستخدم' : 'User')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {userRole && getRoleText(userRole)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Navigation Links */}
                  <div className="space-y-1 flex-1">
                    {getMobileNavItems().map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive(item.to)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {item.icon}
                        {item.label}
                      </Link>
                    ))}
                    
                    {user && (
                      <>
                        <div className="h-px bg-border my-3" />
                        
                        <Link
                          to="/profile"
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive('/profile')
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <User className="h-5 w-5" />
                          {language === 'ar' ? 'الملف الشخصي' : 'Profile'}
                        </Link>
                        
                        <Link
                          to="/wallet"
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive('/wallet')
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Wallet className="h-5 w-5" />
                          {language === 'ar' ? 'المحفظة' : 'Wallet'}
                        </Link>
                        
                        <Link
                          to="/settings"
                          onClick={() => setIsMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive('/settings')
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          )}
                        >
                          <Settings className="h-5 w-5" />
                          {language === 'ar' ? 'الإعدادات' : 'Settings'}
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-4 border-t space-y-3">
                    <div className="flex items-center justify-between px-3">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'اللغة' : 'Language'}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                      >
                        <Globe className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                        {language === 'ar' ? 'English' : 'العربية'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between px-3">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'المظهر' : 'Theme'}
                      </span>
                      <ThemeToggle />
                    </div>
                    
                    {user ? (
                      <Button 
                        variant="outline" 
                        className="w-full text-destructive hover:text-destructive" 
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                        {language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
                      </Button>
                    ) : (
                      <Button className="w-full" asChild>
                        <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                          {language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;