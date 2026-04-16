import { useQuery } from '@tanstack/react-query';
import {
  fetchDashboardStats,
  fetchRecentBookings,
  fetchUpcomingTrips,
  fetchRevenueTrend,
  fetchTripStatusBreakdown,
  fetchBookingStatusBreakdown,
} from './dashboard.api';

/**
 * TanStack Query hook for fetching dashboard stats.
 * Stales after 30 seconds to balance freshness with performance.
 *
 * @returns UseQueryResult with DashboardStats data
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: fetchDashboardStats,
    staleTime: 30_000, // 30 seconds
    retry: 1,
  });
}

/**
 * TanStack Query hook for fetching recent bookings.
 * No staleTime — always fetch fresh data on mount/refetch.
 *
 * @returns UseQueryResult with RecentBooking[] data
 */
export function useRecentBookings() {
  return useQuery({
    queryKey: ['dashboard', 'recent-bookings'],
    queryFn: fetchRecentBookings,
    retry: 1,
  });
}

/**
 * TanStack Query hook for fetching upcoming trips.
 * No staleTime — always fetch fresh data on mount/refetch.
 *
 * @returns UseQueryResult with UpcomingTrip[] data
 */
export function useUpcomingTrips() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-trips'],
    queryFn: fetchUpcomingTrips,
    retry: 1,
  });
}

/**
 * TanStack Query hook for fetching revenue trend (last 7 days).
 * Stales after 5 minutes — chart data is heavier than stats.
 *
 * @returns UseQueryResult with RevenueDataPoint[] data
 */
export function useRevenueTrend() {
  return useQuery({
    queryKey: ['dashboard', 'revenue-trend'],
    queryFn: fetchRevenueTrend,
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  });
}

/**
 * TanStack Query hook for fetching trip status breakdown.
 * Stales after 5 minutes — chart data is heavier than stats.
 *
 * @returns UseQueryResult with StatusCount[] data
 */
export function useTripStatusBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'trip-status'],
    queryFn: fetchTripStatusBreakdown,
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  });
}

/**
 * TanStack Query hook for fetching booking status breakdown.
 * Stales after 5 minutes — chart data is heavier than stats.
 *
 * @returns UseQueryResult with StatusCount[] data
 */
export function useBookingStatusBreakdown() {
  return useQuery({
    queryKey: ['dashboard', 'booking-status'],
    queryFn: fetchBookingStatusBreakdown,
    staleTime: 5 * 60_000, // 5 minutes
    retry: 1,
  });
}
