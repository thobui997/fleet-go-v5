import { Page } from '@playwright/test';

// ─── Timestamps ───────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();
const FUTURE = new Date(Date.now() + 86400000 * 2).toISOString();

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const MOCK = {
  vehicles: [
    ...Array(7).fill(null).map(() => ({ status: 'active' })),
    ...Array(3).fill(null).map(() => ({ status: 'inactive' })),
  ],

  tripsToday: [
    { id: 't1', status: 'scheduled', departure_time: NOW },
    { id: 't2', status: 'scheduled', departure_time: NOW },
    { id: 't3', status: 'scheduled', departure_time: NOW },
    { id: 't4', status: 'in_progress', departure_time: NOW },
    { id: 't5', status: 'in_progress', departure_time: NOW },
  ],

  bookingsToday: Array(8).fill(null).map((_, i) => ({
    id: `b${i}`,
    status: 'confirmed',
    booking_date: NOW,
    booking_code: `BK00${i}`,
    total_amount: 150000,
  })),

  paymentsToday: [{ amount: 5000000 }],

  revenueTrend: Array(7).fill(null).map((_, i) => ({
    amount: (i + 1) * 100000,
    paid_at: new Date(Date.now() - (6 - i) * 86400000).toISOString(),
  })),

  tripStatusThisMonth: [
    ...Array(5).fill(null).map(() => ({ status: 'scheduled' })),
    ...Array(3).fill(null).map(() => ({ status: 'in_progress' })),
    ...Array(10).fill(null).map(() => ({ status: 'completed' })),
    ...Array(2).fill(null).map(() => ({ status: 'cancelled' })),
  ],

  bookingStatusThisMonth: [
    ...Array(3).fill(null).map(() => ({ status: 'pending' })),
    ...Array(5).fill(null).map(() => ({ status: 'confirmed' })),
    ...Array(1).fill(null).map(() => ({ status: 'cancelled' })),
    ...Array(8).fill(null).map(() => ({ status: 'completed' })),
    ...Array(2).fill(null).map(() => ({ status: 'refunded' })),
  ],

  recentBookings: Array(5).fill(null).map((_, i) => ({
    id: `rb${i}`,
    booking_code: `BK10${i}`,
    status: ['pending', 'confirmed', 'cancelled', 'completed', 'refunded'][i],
    booking_date: NOW,
    total_amount: 150000 + i * 10000,
    customer: {
      id: `c${i}`,
      full_name: `Khách hàng ${i + 1}`,
      phone_number: `090${i}000000`,
    },
    trip: {
      id: `t${i}`,
      departure_time: FUTURE,
      route: {
        id: `r${i}`,
        name: `Tuyến ${i + 1}`,
        origin_station: { id: `s${i}a`, name: `Ga đi ${i + 1}` },
        destination_station: { id: `s${i}b`, name: `Ga đến ${i + 1}` },
      },
      vehicle: {
        id: `v${i}`,
        license_plate: `51A-1234${i}`,
        vehicle_type: { id: 'vt1', name: 'Xe giường nằm', seat_layout: null, total_seats: 40 },
      },
    },
  })),

  upcomingTrips: Array(5).fill(null).map((_, i) => ({
    id: `ut${i}`,
    status: ['scheduled', 'scheduled', 'in_progress', 'scheduled', 'in_progress'][i],
    departure_time: new Date(Date.now() + (i + 1) * 3600000).toISOString(),
    route: {
      id: `r${i}`,
      name: `Tuyến ${i + 1}`,
      origin_station: { id: `s${i}a`, name: `Ga xuất phát ${i + 1}` },
      destination_station: { id: `s${i}b`, name: `Ga đến ${i + 1}` },
    },
    vehicle: { id: `v${i}`, license_plate: `51B-5678${i}` },
  })),
};

// ─── Selectors ────────────────────────────────────────────────────────────────

export const DASH_SELECTORS = {
  pageTitle: 'h1:has-text("Tổng quan")',
  pageSubtitle: 'text=Xem nhanh tình hình hoạt động hôm nay',
  statCardVehicles: 'text=Tổng xe',
  statCardTrips: 'text=Chuyến hôm nay',
  statCardBookings: 'text=Đặt vé hôm nay',
  statCardRevenue: 'text=Doanh thu hôm nay',
  statValues: '.text-2xl.font-bold',
  revenueChartCard: 'text=Doanh thu 7 ngày gần nhất',
  tripStatusChartCard: 'text=Trạng thái chuyến đi',
  bookingStatusChartCard: 'text=Trạng thái đặt vé',
  recentBookingsCard: 'text=Đặt vé gần đây',
  upcomingTripsCard: 'text=Chuyến sắp khởi hành',
  errorText: 'text=Không thể tải dữ liệu',
  retryButton: 'button:has-text("Thử lại")',
  emptyBookings: 'text=Chưa có đặt vé nào',
  emptyTrips: 'text=Không có chuyến sắp khởi hành',
  emptyChart: 'text=Không có dữ liệu',
  statSkeleton: '.h-7.w-24',
  tableSkeleton: '.h-12.w-full',
};

// ─── Route Helper ─────────────────────────────────────────────────────────────

type MockData = typeof MOCK;
type MockOverrides = Partial<MockData>;

export async function mockDashboardAPIs(page: Page, overrides: MockOverrides = {}) {
  const data: MockData = { ...MOCK, ...overrides };

  await page.route('**/rest/v1/**', async (route) => {
    const rawUrl = route.request().url();
    const parsedUrl = new URL(rawUrl);
    const pathParts = parsedUrl.pathname.split('/');
    const table = pathParts[pathParts.length - 1];
    const select = parsedUrl.searchParams.get('select') ?? '';
    const limit = parsedUrl.searchParams.get('limit');
    const order = parsedUrl.searchParams.get('order') ?? '';

    let body: unknown[];

    if (table === 'vehicles') {
      body = data.vehicles;
    } else if (table === 'trips') {
      if (select === 'status') {
        body = data.tripStatusThisMonth;
      } else if (limit === '5' || order.includes('departure_time.asc')) {
        body = data.upcomingTrips;
      } else {
        body = data.tripsToday;
      }
    } else if (table === 'bookings') {
      if (select === 'status') {
        body = data.bookingStatusThisMonth;
      } else if (limit === '5' || order.includes('booking_date.desc')) {
        body = data.recentBookings;
      } else {
        body = data.bookingsToday;
      }
    } else if (table === 'payments') {
      if (select.includes('paid_at')) {
        body = data.revenueTrend;
      } else {
        body = data.paymentsToday;
      }
    } else {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Content-Range': `0-${Math.max(0, body.length - 1)}/${body.length}`,
      },
      body: JSON.stringify(body),
    });
  });
}

// ─── Error Route Helpers ──────────────────────────────────────────────────────

export async function mockErrorForTable(
  page: Page,
  targetTable: string,
  mode: 'abort' | '500' | '401' = 'abort',
  fallbackData?: MockOverrides
) {
  const base = { ...MOCK, ...fallbackData };

  await page.route('**/rest/v1/**', async (route) => {
    const rawUrl = route.request().url();
    const parsedUrl = new URL(rawUrl);
    const table = parsedUrl.pathname.split('/').pop()!;

    if (table === targetTable) {
      if (mode === 'abort') {
        await route.abort('failed');
      } else if (mode === '401') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'JWT token is expired (401)',
            code: 'PGRST301',
            details: '',
            hint: '',
          }),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        });
      }
      return;
    }

    // Pass other tables through using default mock data
    const select = parsedUrl.searchParams.get('select') ?? '';
    const limit = parsedUrl.searchParams.get('limit');
    const order = parsedUrl.searchParams.get('order') ?? '';
    let body: unknown[];

    if (table === 'vehicles') {
      body = base.vehicles;
    } else if (table === 'trips') {
      if (select === 'status') body = base.tripStatusThisMonth;
      else if (limit === '5' || order.includes('departure_time.asc')) body = base.upcomingTrips;
      else body = base.tripsToday;
    } else if (table === 'bookings') {
      if (select === 'status') body = base.bookingStatusThisMonth;
      else if (limit === '5' || order.includes('booking_date.desc')) body = base.recentBookings;
      else body = base.bookingsToday;
    } else if (table === 'payments') {
      body = select.includes('paid_at') ? base.revenueTrend : base.paymentsToday;
    } else {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Content-Range': `0-${Math.max(0, body.length - 1)}/${body.length}` },
      body: JSON.stringify(body),
    });
  });
}

export async function mockAbortAll(page: Page) {
  await page.route('**/rest/v1/**', async (route) => {
    const parsedUrl = new URL(route.request().url());
    const table = parsedUrl.pathname.split('/').pop()!;
    const dashboardTables = ['vehicles', 'trips', 'bookings', 'payments'];
    if (dashboardTables.includes(table)) {
      await route.abort('failed');
    } else {
      await route.continue();
    }
  });
}

// ─── Navigate helper ──────────────────────────────────────────────────────────

export async function goToDashboard(page: Page) {
  await page.goto('/dashboard');
  await page.waitForSelector('h1:has-text("Tổng quan")', { timeout: 10000 });
}
