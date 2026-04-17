import * as React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { cn } from '@shared/lib/cn';

export function AppLayout() {
  // Sidebar collapse state (desktop) - persisted to localStorage
  const [collapsed, setCollapsed] = React.useState(() => {
    try {
      const stored = localStorage.getItem('sidebar-collapsed');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  // Mobile sidebar state - not persisted, always starts closed
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggleCollapse = () => {
    const newValue = !collapsed;
    setCollapsed(newValue);
    try {
      localStorage.setItem('sidebar-collapsed', String(newValue));
    } catch {
      // Ignore localStorage errors
    }
  };

  const openMobile = () => setMobileOpen(true);
  const closeMobile = () => setMobileOpen(false);

  // Body scroll lock when mobile sidebar is open
  React.useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Escape key closes mobile sidebar
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileOpen) {
        closeMobile();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <Sidebar
        isCollapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        isMobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />
      <div
        className={cn(
          'transition-all duration-300 h-screen flex flex-col',
          'md:ml-64', // md+: expanded default
          collapsed && 'md:ml-16', // md+: collapsed
          !collapsed && 'md:ml-64', // md+: expanded
          'ml-0' // < md: no margin
        )}
      >
        <Header onMobileMenuToggle={openMobile} />
        <main className="flex-1 overflow-hidden p-6 flex flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
