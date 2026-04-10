import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@shared/auth/use-auth';
import { Menu, Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@shared/ui/button';
import { useToast } from '@shared/ui/use-toast';

export interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDark, setIsDark] = React.useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Sync dark mode state with DOM on mount
  React.useEffect(() => {
    const hasDarkClass = document.documentElement.classList.contains('dark');
    setIsDark(hasDarkClass);
  }, []);

  const handleDarkModeToggle = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      toast({
        variant: 'destructive',
        title: 'Đăng xuất thất bại',
        description: 'Vui lòng thử lại.',
      });
      // Still attempt redirect - local session may be invalid
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-20 h-14 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between">
        {/* Left side - hamburger menu (mobile only) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMobileMenuToggle}
          className="md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Right side - user actions */}
        <div className="flex items-center gap-2">
          {/* User email */}
          {user?.email && (
            <span className="max-w-[200px] truncate text-sm text-muted-foreground hidden sm:inline-block">
              {user.email}
            </span>
          )}

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDarkModeToggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {/* Logout */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
