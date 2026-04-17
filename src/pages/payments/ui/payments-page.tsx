import * as React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
import { DateRangePicker } from '@shared/ui/form';
import type { DateRange } from '@shared/ui/form';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce, toLocalISODate } from '@shared/lib';
import { usePayments, PAYMENT_STATUSES, PAYMENT_METHODS } from '@entities/payment';
import type { PaymentWithDetails } from '@entities/payment';
import { formatCurrency, formatDateTime } from '@shared/lib';
import { PaymentDetailDialog } from './payment-detail-dialog';
import { mapPaymentError } from '../model/payment-form-schema';

type PaymentValue = PaymentWithDetails[keyof PaymentWithDetails];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  e_wallet: 'Ví điện tử',
  bank_transfer: 'Chuyển khoản',
};

export function PaymentsPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [methodFilter, setMethodFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<DateRange>({});
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedPayment, setSelectedPayment] = React.useState<PaymentWithDetails | null>(null);

  const { data, isLoading, isError, error, refetch } = usePayments({
    page,
    pageSize,
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    method: methodFilter === 'all' ? undefined : methodFilter as any,
    dateFrom: dateRange.from ? toLocalISODate(dateRange.from) : undefined,
    dateTo: dateRange.to ? toLocalISODate(dateRange.to) : undefined,
    search: debouncedSearch || undefined,
  });

  const payments = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<PaymentWithDetails>[] = [
    {
      key: 'booking',
      header: 'Mã đặt vé',
      cell: (_value: PaymentValue, row: PaymentWithDetails) =>
        row.booking?.booking_code ?? '—',
    },
    {
      key: 'id',
      header: 'Khách hàng',
      cell: (_value: PaymentValue, row: PaymentWithDetails) =>
        row.booking?.customer?.full_name ?? '—',
    },
    {
      key: 'amount',
      header: 'Số tiền',
      cell: (value: PaymentValue) =>
        formatCurrency(value as number),
    },
    {
      key: 'method',
      header: 'Phương thức',
      cell: (value: PaymentValue) => {
        const method = value as string;
        return METHOD_LABELS[method] ?? method;
      },
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (value: PaymentValue) => {
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
      key: 'paid_at',
      header: 'Ngày thanh toán',
      cell: (value: PaymentValue) =>
        value != null ? formatDateTime(value as string) : '—',
    },
    {
      key: 'booking_id',
      header: '',
      cell: (_value: PaymentValue, row: PaymentWithDetails) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedPayment(row);
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
            <h1 className="text-2xl font-bold tracking-tight">Thanh toán</h1>
            <p className="text-muted-foreground">
              Quản lý thanh toán và hoàn tiền
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Input
            placeholder="Tìm theo mã đặt vé..."
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
              {PAYMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={methodFilter}
            onValueChange={(val) => {
              setMethodFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Phương thức" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phương thức</SelectItem>
              {PAYMENT_METHODS.map((method) => (
                <SelectItem key={method} value={method}>
                  {METHOD_LABELS[method]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            value={dateRange}
            onChange={(r) => { setDateRange(r); setPage(1); }}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {mapPaymentError(
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
            data={payments}
            isLoading={isLoading}
            emptyMessage="Chưa có thanh toán nào"
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

      {selectedPayment && (
        <PaymentDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          payment={selectedPayment}
        />
      )}
    </div>
  );
}
