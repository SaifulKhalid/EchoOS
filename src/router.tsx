import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { ROUTES } from '@/config/constants';

/**
 * Route table. Every authenticated page is lazy-loaded (code splitting) and
 * rendered inside the AppLayout shell behind the ProtectedRoute guard.
 * The login page is eager since it is the entry point for signed-out users.
 */

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ChatPage = lazy(() => import('@/pages/ChatPage'));
const TimelinePage = lazy(() => import('@/pages/TimelinePage'));
const MoviesPage = lazy(() => import('@/pages/MoviesPage'));
const FoodPage = lazy(() => import('@/pages/FoodPage'));
const TravelPage = lazy(() => import('@/pages/TravelPage'));
const NotesPage = lazy(() => import('@/pages/NotesPage'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const SearchPage = lazy(() => import('@/pages/SearchPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.chat, element: <ChatPage /> },
      { path: ROUTES.timeline, element: <TimelinePage /> },
      { path: ROUTES.movies, element: <MoviesPage /> },
      { path: ROUTES.food, element: <FoodPage /> },
      { path: ROUTES.travel, element: <TravelPage /> },
      { path: ROUTES.notes, element: <NotesPage /> },
      { path: ROUTES.wishlist, element: <WishlistPage /> },
      { path: ROUTES.search, element: <SearchPage /> },
      { path: ROUTES.analytics, element: <AnalyticsPage /> },
      { path: ROUTES.settings, element: <SettingsPage /> },
    ],
  },
  { path: '/404', element: <NotFoundPage /> },
  { path: '*', element: <Navigate to="/404" replace /> },
]);
