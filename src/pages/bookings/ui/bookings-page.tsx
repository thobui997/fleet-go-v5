import * as React from 'react';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce } from '@shared/lib';
import { useBookings, BOOKING_STATUSES } from '@entities/booking';
import type { BookingWithDetails } from '@entities/booking';
import { formatCurrency, formatDateTime } from '@shared/lib';
import { BookingCreateDialog } from './booking-create-dialog';
import { BookingDetailDialog } from './booking-detail-dialog';
import { mapBookingError } from '../model/booking-form-schema';

type BookingValue = BookingWithDetails[keyof BookingWithDetails];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  refunded: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function BookingsPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selectedBooking, setSelectedBooking] = React.useState<BookingWithDetails | null>(null);

  const { data, isLoading, isError, error, refetch } = useBookings({
    page,
    pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    search: debouncedSearch || undefined,
  });

  const bookings = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<BookingWithDetails>[] = [
    {
      key: 'booking_code',
      header: 'Mã đặt vé',
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      cell: (_value: BookingValue, row: BookingWithDetails) =>
        row.customer?.full_name ?? '—',
    },
    {
      key: 'trip',
      header: 'Chuyến',
      cell: (_value: BookingValue, row: BookingWithDetails) => {
        const origin = row.trip?.route?.origin_station?.name ?? '—';
        const dest = row.trip?.route?.destination_station?.name ?? '—';
        return `${origin} → ${dest}`;
      },
    },
    {
      key: 'booking_date',
      header: 'Ngày đặt',
      cell: (value: BookingValue) =>
        value != null ? formatDateTime(value as string) : '—',
    },
    {
      key: 'total_amount',
      header: 'Tổng tiền',
      cell: (value: BookingValue) =>
        formatCurrency(value as number),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (value: BookingValue) => {
        const status = value as string;
        const label = STATUS_LABELS[status] ?? status;
        const colorClass = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
            {label}
          </span>
        );
      },
    },
    {
      key: 'passenger_count',
      header: 'Số KH',
    },
    {
      key: 'id',
      header: '',
      cell: (_value: BookingValue, row: BookingWithDetails) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedBooking(row);
            setDetailOpen(true);
          }}
        >
          Xem
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Đặt vé</h1>
            <p className="text-muted-foreground">
              Quản lý đặt vé của khách hàng
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo đặt vé
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Tìm theo mã đặt vé hoặc tên khách hàng..."
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {BOOKING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="Từ ngày"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
          <Input
            type="date"
            placeholder="Đến ngày"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {mapBookingError(
                error as {
                  code?: string;
                  message?: string;
                  details?: string;
                  status?: number;
                }
              )}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={bookings}
            isLoading={isLoading}
            emptyMessage="Chưa có đặt vé nào"
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: setPage,
              onPageSizeChange: (size) => {
                setPageSize(size);
                setPage(1);
              },
            }}
          />
        )}
      </div>

      <BookingCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />

      {selectedBooking && (
        <BookingDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          booking={selectedBooking}
        />
      )}
    </div>
  );
}
