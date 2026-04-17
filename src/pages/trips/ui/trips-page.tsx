import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, AlertCircle, RefreshCw, Users } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useRoutes } from '@entities/route';
import { useVehicles } from '@entities/vehicle';
import { useTrips, TRIP_STATUSES, type TripWithDetails } from '@entities/trip';
import { formatDateTime } from '@shared/lib/format-date';
import type { TripStatus } from '@entities/trip';
import { TripStatusBadge } from './trip-status-badge';
import { TripDeleteDialog } from './trip-delete-dialog';
import { StaffAssignmentDialog } from './staff-assignment-dialog';
import { mapTripError, FK_DROPDOWN_PAGE_SIZE } from '../model/trip-form-schema';
import { ROUTES } from '@shared/config/routes';

type TripValue = TripWithDetails[keyof TripWithDetails];

type StatusFilter = 'all' | TripStatus;

function RouteNameCell({ route }: { route: TripWithDetails['route'] }) {
  if (!route) return '—';
  const from = route.origin_station?.name || 'N/A';
  const to = route.destination_station?.name || 'N/A';
  return `${from} → ${to}`;
}

function formatPrice(priceOverride: number | null): string {
  if (priceOverride === null) return '—';
  return `${Number(priceOverride).toLocaleString('vi-VN')} đ`;
}

export function TripsPage() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [routeFilter, setRouteFilter] = React.useState<string>('__none__');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = React.useState(false);
  const [selectedTrip, setSelectedTrip] = React.useState<TripWithDetails | null>(null);

  // FK dropdown data
  const { data: routesData } = useRoutes({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE });
  useVehicles({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE }); // Used by form dialog

  const status = statusFilter === 'all' ? undefined : statusFilter;
  const routeId = routeFilter === '__none__' ? undefined : routeFilter;

  const { data, isLoading, isError, error, refetch } = useTrips({
    page,
    pageSize,
    status,
    routeId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const trips = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<TripWithDetails>[] = [
    {
      key: 'route',
      header: 'Tuyến đường',
      cell: (_value: TripValue, row: TripWithDetails) => (
        <RouteNameCell route={row.route} />
      ),
    },
    {
      key: 'vehicle',
      header: 'Xe',
      cell: (_value: TripValue, row: TripWithDetails) =>
        row.vehicle?.license_plate || '—',
    },
    {
      key: 'departure_time',
      header: 'Giờ đi',
      cell: (value: TripValue) =>
        value != null ? formatDateTime(String(value)) : '—',
    },
    {
      key: 'estimated_arrival_time',
      header: 'Giờ đến dự kiến',
      cell: (value: TripValue) =>
        value != null ? formatDateTime(String(value)) : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (_value: TripValue, row: TripWithDetails) => (
        <TripStatusBadge status={row.status} />
      ),
    },
    {
      key: 'price_override',
      header: 'Giá vé',
      cell: (value: TripValue) => formatPrice(value as number | null),
    },
    {
      key: 'id',
      header: '',
      cell: (_value: TripValue, row: TripWithDetails) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setSelectedTrip(row);
                setStaffDialogOpen(true);
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Phân công
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/trips/${row.id}/edit`)}
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedTrip(row);
                setDeleteOpen(true);
              }}
            >
              Xóa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex-none space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản lý chuyến đi</h1>
            <p className="text-muted-foreground">
              Quản lý danh sách chuyến đi theo lịch trình
            </p>
          </div>
          <Button
            onClick={() => navigate(ROUTES.TRIPS_NEW)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm chuyến đi
          </Button>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {TRIP_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status === 'scheduled' && 'Đã lên lịch'}
                {status === 'in_progress' && 'Đang chạy'}
                {status === 'completed' && 'Hoàn thành'}
                {status === 'cancelled' && 'Đã hủy'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={routeFilter}
          onValueChange={(val) => {
            setRouteFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tuyến đường" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Tất cả tuyến đường</SelectItem>
            {routesData?.data.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {routesData && routesData.count > routesData.data.length && (
          <span className="text-xs text-muted-foreground">
            Cảnh báo: Chỉ hiển thị {routesData.data.length}/{routesData.count} tuyến đường
          </span>
        )}

        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          className="max-w-[150px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          className="max-w-[150px]"
        />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {mapTripError(
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
            data={trips}
            isLoading={isLoading}
            emptyMessage="Không có chuyến đi nào"
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

      <TripDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        trip={selectedTrip}
      />

      <StaffAssignmentDialog
        open={staffDialogOpen}
        onOpenChange={setStaffDialogOpen}
        trip={selectedTrip}
      />
    </div>
  );
}
