import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';
import { LoginPage } from '@pages/login';
import { VehicleTypesPage } from '@pages/vehicle-types';
import { VehiclesPage } from '@pages/vehicles';
import { MaintenancePage } from '@pages/maintenance';
import { StationsPage } from '@pages/stations';
import { RoutesPage } from '@pages/routes';
import { RolesPage } from '@pages/roles';
import { AppLayout } from '@app/layouts';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground text-lg">{title} — Coming Soon</p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.DASHBOARD,
        element: <div>Dashboard — coming in Phase 7</div>,
      },
      // Placeholder routes for all modules
      { path: ROUTES.VEHICLES, element: <VehiclesPage /> },
      { path: ROUTES.VEHICLE_TYPES, element: <VehicleTypesPage /> },
      { path: ROUTES.MAINTENANCE, element: <MaintenancePage /> },
      { path: ROUTES.ROUTES, element: <RoutesPage /> },
      { path: ROUTES.STATIONS, element: <StationsPage /> },
      { path: ROUTES.TRIPS, element: <PlaceholderPage title="Trips" /> },
      { path: ROUTES.TRIP_CALENDAR, element: <PlaceholderPage title="Trip Calendar" /> },
      { path: ROUTES.EMPLOYEES, element: <PlaceholderPage title="Employees" /> },
      { path: ROUTES.ROLES, element: <RolesPage /> },
      { path: ROUTES.MY_SCHEDULE, element: <PlaceholderPage title="My Schedule" /> },
      { path: ROUTES.CUSTOMERS, element: <PlaceholderPage title="Customers" /> },
      { path: ROUTES.BOOKINGS, element: <PlaceholderPage title="Bookings" /> },
      { path: ROUTES.PAYMENTS, element: <PlaceholderPage title="Payments" /> },
    ],
  },
]);
