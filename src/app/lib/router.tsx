import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';
import { AppLayout } from '@app/layouts';
import { RouteWrapper } from './route-wrapper';

const LoginPage = lazy(() => import('@pages/login').then(m => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@pages/dashboard').then(m => ({ default: m.DashboardPage })));
const VehicleTypesPage = lazy(() => import('@pages/vehicle-types').then(m => ({ default: m.VehicleTypesPage })));
const VehiclesPage = lazy(() => import('@pages/vehicles').then(m => ({ default: m.VehiclesPage })));
const MaintenancePage = lazy(() => import('@pages/maintenance').then(m => ({ default: m.MaintenancePage })));
const MaintenanceFormPage = lazy(() => import('@pages/maintenance').then(m => ({ default: m.MaintenanceFormPage })));
const StationsPage = lazy(() => import('@pages/stations').then(m => ({ default: m.StationsPage })));
const RolesPage = lazy(() => import('@pages/roles').then(m => ({ default: m.RolesPage })));
const EmployeesPage = lazy(() => import('@pages/employees').then(m => ({ default: m.EmployeesPage })));
const EmployeeFormPage = lazy(() => import('@pages/employees').then(m => ({ default: m.EmployeeFormPage })));
const TripsPage = lazy(() => import('@pages/trips').then(m => ({ default: m.TripsPage })));
const TripFormPage = lazy(() => import('@pages/trips').then(m => ({ default: m.TripFormPage })));
const StaffAssignmentPage = lazy(() => import('@pages/trips').then(m => ({ default: m.StaffAssignmentPage })));
const RoutesPage = lazy(() => import('@pages/routes').then(m => ({ default: m.RoutesPage })));
const RouteFormPage = lazy(() => import('@pages/routes').then(m => ({ default: m.RouteFormPage })));
const RouteStopsPage = lazy(() => import('@pages/routes').then(m => ({ default: m.RouteStopsPage })));
const CalendarPage = lazy(() => import('@pages/trip-calendar').then(m => ({ default: m.CalendarPage })));
const MySchedulePage = lazy(() => import('@pages/my-schedule').then(m => ({ default: m.MySchedulePage })));
const CustomersPage = lazy(() => import('@pages/customers').then(m => ({ default: m.CustomersPage })));
const BookingsPage = lazy(() => import('@pages/bookings').then(m => ({ default: m.BookingsPage })));
const BookingFormPage = lazy(() => import('@pages/bookings').then(m => ({ default: m.BookingFormPage })));
const CheckInPage = lazy(() => import('@pages/check-in').then(m => ({ default: m.CheckInPage })));
const PaymentsPage = lazy(() => import('@pages/payments').then(m => ({ default: m.PaymentsPage })));

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: (
      <RouteWrapper>
        <LoginPage />
      </RouteWrapper>
    ),
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
        element: (
          <RouteWrapper>
            <DashboardPage />
          </RouteWrapper>
        ),
      },
      { path: ROUTES.VEHICLES, element: <RouteWrapper><VehiclesPage /></RouteWrapper> },
      { path: ROUTES.VEHICLE_TYPES, element: <RouteWrapper><VehicleTypesPage /></RouteWrapper> },
      { path: ROUTES.MAINTENANCE, element: <RouteWrapper><MaintenancePage /></RouteWrapper> },
      { path: ROUTES.MAINTENANCE_NEW, element: <RouteWrapper><MaintenanceFormPage /></RouteWrapper> },
      { path: ROUTES.MAINTENANCE_EDIT, element: <RouteWrapper><MaintenanceFormPage /></RouteWrapper> },
      { path: ROUTES.ROUTES, element: <RouteWrapper><RoutesPage /></RouteWrapper> },
      { path: ROUTES.ROUTES_NEW, element: <RouteWrapper><RouteFormPage /></RouteWrapper> },
      { path: ROUTES.ROUTES_EDIT, element: <RouteWrapper><RouteFormPage /></RouteWrapper> },
      { path: ROUTES.ROUTES_STOPS, element: <RouteWrapper><RouteStopsPage /></RouteWrapper> },
      { path: ROUTES.STATIONS, element: <RouteWrapper><StationsPage /></RouteWrapper> },
      { path: ROUTES.TRIPS, element: <RouteWrapper><TripsPage /></RouteWrapper> },
      { path: ROUTES.TRIPS_NEW, element: <RouteWrapper><TripFormPage /></RouteWrapper> },
      { path: ROUTES.TRIPS_EDIT, element: <RouteWrapper><TripFormPage /></RouteWrapper> },
      { path: ROUTES.TRIPS_STAFF, element: <RouteWrapper><StaffAssignmentPage /></RouteWrapper> },
      { path: ROUTES.TRIP_CALENDAR, element: <RouteWrapper><CalendarPage /></RouteWrapper> },
      { path: ROUTES.EMPLOYEES_NEW, element: <RouteWrapper><EmployeeFormPage /></RouteWrapper> },
      { path: ROUTES.EMPLOYEES_EDIT, element: <RouteWrapper><EmployeeFormPage /></RouteWrapper> },
      { path: ROUTES.EMPLOYEES, element: <RouteWrapper><EmployeesPage /></RouteWrapper> },
      { path: ROUTES.ROLES, element: <RouteWrapper><RolesPage /></RouteWrapper> },
      { path: ROUTES.MY_SCHEDULE, element: <RouteWrapper><MySchedulePage /></RouteWrapper> },
      { path: ROUTES.CUSTOMERS, element: <RouteWrapper><CustomersPage /></RouteWrapper> },
      { path: ROUTES.BOOKINGS_NEW, element: <RouteWrapper><BookingFormPage /></RouteWrapper> },
      { path: ROUTES.BOOKINGS, element: <RouteWrapper><BookingsPage /></RouteWrapper> },
      { path: ROUTES.CHECK_IN, element: <RouteWrapper><CheckInPage /></RouteWrapper> },
      { path: ROUTES.PAYMENTS, element: <RouteWrapper><PaymentsPage /></RouteWrapper> },
    ],
  },
]);
