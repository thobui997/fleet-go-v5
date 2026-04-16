import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';
import { LoginPage } from '@pages/login';
import { DashboardPage } from '@pages/dashboard';
import { VehicleTypesPage } from '@pages/vehicle-types';
import { VehiclesPage } from '@pages/vehicles';
import { MaintenancePage } from '@pages/maintenance';
import { StationsPage } from '@pages/stations';
import { RoutesPage } from '@pages/routes';
import { RolesPage } from '@pages/roles';
import { EmployeesPage } from '@pages/employees';
import { TripsPage } from '@pages/trips';
import { CalendarPage } from '@pages/trip-calendar';
import { MySchedulePage } from '@pages/my-schedule';
import { CustomersPage } from '@pages/customers';
import { BookingsPage } from '@pages/bookings';
import { CheckInPage } from '@pages/check-in';
import { PaymentsPage } from '@pages/payments';
import { AppLayout } from '@app/layouts';

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
        element: <DashboardPage />,
      },
      { path: ROUTES.VEHICLES, element: <VehiclesPage /> },
      { path: ROUTES.VEHICLE_TYPES, element: <VehicleTypesPage /> },
      { path: ROUTES.MAINTENANCE, element: <MaintenancePage /> },
      { path: ROUTES.ROUTES, element: <RoutesPage /> },
      { path: ROUTES.STATIONS, element: <StationsPage /> },
      { path: ROUTES.TRIPS, element: <TripsPage /> },
      { path: ROUTES.TRIP_CALENDAR, element: <CalendarPage /> },
      { path: ROUTES.EMPLOYEES, element: <EmployeesPage /> },
      { path: ROUTES.ROLES, element: <RolesPage /> },
      { path: ROUTES.MY_SCHEDULE, element: <MySchedulePage /> },
      { path: ROUTES.CUSTOMERS, element: <CustomersPage /> },
      { path: ROUTES.BOOKINGS, element: <BookingsPage /> },
      { path: ROUTES.CHECK_IN, element: <CheckInPage /> },
      { path: ROUTES.PAYMENTS, element: <PaymentsPage /> },
    ],
  },
]);
