import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';
import { LoginPage } from '@pages/login';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    element: (
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: '/dashboard',
        element: <div>Dashboard — coming in Phase 7</div>,
      },
    ],
  },
]);
