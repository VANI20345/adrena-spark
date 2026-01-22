import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchUsers, useSuggestedUsers } from '@/hooks/useFollow';
import { useLanguageContext } from '@/contexts/LanguageContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowRight, Users, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoverSearchDropdownProps {
  className?: string;
}

const DiscoverSearchDropdown: React.FC<DiscoverSearchDropdownProps> = ({ className }) => {
  const { language } = useLanguageContext();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchUsers(searchTerm);
  const { data: suggestions } = useSuggestedUsers(5);

  // Show suggestions if no search, otherwise show search results
  const displayUsers = searchTerm.length >= 2 ? searchResults : suggestions;

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleUserClick = (userId: string) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(`/user/${userId}`);
  };

  const handleSearchMore = () => {
    setIsOpen(false);
    navigate('/discover-people');
  };

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={cn("h-10 w-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted", className)}
      >
        <Search className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <motion.div
        initial={{ width: 40, opacity: 0.5 }}
        animate={{ width: 280, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        <Input
          ref={inputRef}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={isRTL ? 'ابحث عن مستخدمين...' : 'Search users...'}
          className="pr-10 rtl:pr-4 rtl:pl-10 h-10 rounded-full bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setIsOpen(false); setSearchTerm(''); }}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 h-8 w-8 rounded-full",
            isRTL ? "left-1" : "right-1"
          )}
        >
          <X className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Dropdown Results */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className={cn(
            "absolute top-12 w-80 bg-popover border border-border rounded-xl shadow-xl overflow-hidden z-50",
            isRTL ? "left-0" : "right-0"
          )}
        >
          {/* Header */}
          <div className="p-3 border-b bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground">
              {searchTerm.length >= 2 
                ? (isRTL ? 'نتائج البحث' : 'Search Results')
                : (isRTL ? 'مقترحات' : 'Suggestions')}
            </p>
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : displayUsers && displayUsers.length > 0 ? (
              displayUsers.slice(0, 5).map((user) => (
                <motion.button
                  key={user.user_id}
                  whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
                  onClick={() => handleUserClick(user.user_id)}
                  className="w-full flex items-center gap-3 p-3 text-left rtl:text-right transition-colors"
                >
                  <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                    <AvatarImage src={user.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-semibold">
                      {user.full_name?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{user.full_name || user.display_id}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.display_id}</p>
                  </div>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              ))
            ) : searchTerm.length >= 2 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{isRTL ? 'لا توجد نتائج' : 'No users found'}</p>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{isRTL ? 'اكتب للبحث...' : 'Type to search...'}</p>
              </div>
            )}
          </div>

          {/* Footer - All Findings */}
          <div className="p-2 border-t bg-muted/30">
            <Button
              variant="ghost"
              onClick={handleSearchMore}
              className="w-full justify-between text-sm font-medium text-primary hover:text-primary"
            >
              <span>{isRTL ? 'جميع النتائج' : 'All Findings'}</span>
              <ArrowRight className={cn("h-4 w-4", isRTL && "rotate-180")} />
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default DiscoverSearchDropdown;
