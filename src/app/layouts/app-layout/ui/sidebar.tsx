import * as React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { cn } from '@shared/lib/cn';
import { Button } from '@shared/ui/button';
import {
  LayoutDashboard,
  Truck,
  Bus,
  Wrench,
  Map,
  MapPin,
  Calendar,
  CalendarDays,
  Users,
  Shield,
  CalendarClock,
  UserCircle,
  Ticket,
  CreditCard,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

const navGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Dashboard', to: ROUTES.DASHBOARD, icon: LayoutDashboard, end: true },
      { label: 'Trips', to: ROUTES.TRIPS, icon: Calendar, end: true },
      { label: 'Trip Calendar', to: ROUTES.TRIP_CALENDAR, icon: CalendarDays, end: true },
      { label: 'My Schedule', to: ROUTES.MY_SCHEDULE, icon: CalendarClock, end: true },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Vehicles', to: ROUTES.VEHICLES, icon: Truck, end: true },
      { label: 'Vehicle Types', to: ROUTES.VEHICLE_TYPES, icon: Bus, end: true },
      { label: 'Maintenance', to: ROUTES.MAINTENANCE, icon: Wrench, end: true },
      { label: 'Routes', to: ROUTES.ROUTES, icon: Map, end: true },
      { label: 'Stations', to: ROUTES.STATIONS, icon: MapPin, end: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', to: ROUTES.EMPLOYEES, icon: Users, end: true },
      { label: 'Roles', to: ROUTES.ROLES, icon: Shield, end: true },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Customers', to: ROUTES.CUSTOMERS, icon: UserCircle, end: true },
      { label: 'Bookings', to: ROUTES.BOOKINGS, icon: Ticket, end: true },
      { label: 'Payments', to: ROUTES.PAYMENTS, icon: CreditCard, end: true },
    ],
  },
];

function NavItem({
  to,
  icon: Icon,
  label,
  end,
  isCollapsed,
  onMobileClose,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  isCollapsed: boolean;
  onMobileClose: () => void;
}) {
  const location = useLocation();

  // Check if current path starts with this link's path (for parent route highlighting)
  const isActive = end
    ? location.pathname === to
    : location.pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onMobileClose}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}

export function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-30 flex h-screen flex-col border-r bg-card transition-all duration-300',
          // Desktop: collapsed/expanded width
          'md:w-64',
          isCollapsed && 'md:w-16',
          // Mobile: hidden by default, slides in when open
          '-translate-x-full md:translate-x-0',
          isMobileOpen && 'translate-x-0'
        )}
      >
        {/* Branding */}
        <div className="flex h-16 items-center border-b px-4">
          <Truck className="h-6 w-6 shrink-0" aria-hidden="true" />
          {!isCollapsed && (
            <span className="ml-3 text-lg font-semibold">FleetGo</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-6">
              {!isCollapsed && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    end={item.end}
                    isCollapsed={isCollapsed}
                    onMobileClose={onMobileClose}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden md:flex"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>
      </aside>
    </>
  );
}
