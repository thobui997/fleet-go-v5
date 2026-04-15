import * as React from 'react';
import { Plus, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
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
  Badge,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce } from '@shared/lib';
import { useRoutes } from '@entities/route';
import type { Route } from '@entities/route';
import { RouteFormDialog } from './route-form-dialog';
import { RouteDeleteDialog } from './route-delete-dialog';
import { RouteStopsDialog } from './route-stops-dialog';
import { mapSupabaseError } from '../model/route-form-schema';

type RouteValue = Route[keyof Route];
type StatusFilter = 'all' | 'true' | 'false';

function formatDuration(interval: string): string {
  try {
    let totalMinutes = 0;

    if (interval.includes(' days ')) {
      const parts = interval.split(' days ');
      const days = parseInt(parts[0], 10);
      const timeParts = parts[1].split(':');
      totalMinutes =
        days * 1440 +
        parseInt(timeParts[0], 10) * 60 +
        parseInt(timeParts[1], 10);
    } else {
      const parts = interval.split(':');
      totalMinutes = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  } catch {
    return interval;
  }
}

export function RoutesPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRoute, setSelectedRoute] = React.useState<Route | null>(null);
  const [formMode, setFormMode] = React.useState<'create' | 'edit'>('create');
  const [stopsOpen, setStopsOpen] = React.useState(false);
  const [selectedRouteForStops, setSelectedRouteForStops] = React.useState<Route | null>(null);

  const isActive =
    statusFilter === 'all' ? undefined : statusFilter === 'true';

  const { data, isLoading, isError, error, refetch } = useRoutes({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    isActive,
  });

  const routes = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<Route>[] = [
    {
      key: 'name',
      header: 'Tên tuyến',
      sortable: true,
    },
    {
      key: 'origin_station',
      header: 'Trạm đi',
      cell: (_value: RouteValue, row: Route) =>
        row.origin_station?.name ?? '—',
    },
    {
      key: 'destination_station',
      header: 'Trạm đến',
      cell: (_value: RouteValue, row: Route) =>
        row.destination_station?.name ?? '—',
    },
    {
      key: 'distance_km',
      header: 'Khoảng cách',
      cell: (value: RouteValue) =>
        value != null ? `${value} km` : '—',
    },
    {
      key: 'estimated_duration',
      header: 'Thời gian',
      cell: (value: RouteValue) =>
        value != null ? formatDuration(String(value)) : '—',
    },
    {
      key: 'base_price',
      header: 'Giá vé',
      cell: (value: RouteValue) =>
        value != null
          ? `${Number(value).toLocaleString('vi-VN')} đ`
          : '—',
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      cell: (value: RouteValue) =>
        value ? (
          <Badge variant="default">Hoạt động</Badge>
        ) : (
          <Badge variant="secondary">Ngừng hoạt động</Badge>
        ),
    },
    {
      key: 'id',
      header: '',
      cell: (_value: RouteValue, row: Route) => (
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
                setSelectedRoute(row);
                setFormMode('edit');
                setFormOpen(true);
              }}
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedRouteForStops(row);
                setStopsOpen(true);
              }}
            >
              Điểm dừng
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedRoute(row);
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
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tuyến đường</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách tuyến đường vận chuyển
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedRoute(null);
            setFormMode('create');
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm tuyến đường
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo tên tuyến đường..."
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
            setStatusFilter(val as StatusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="true">Hoạt động</SelectItem>
            <SelectItem value="false">Ngừng hoạt động</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            {mapSupabaseError(
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
          data={routes}
          isLoading={isLoading}
          emptyMessage="Chưa có tuyến đường nào"
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

      <RouteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        route={selectedRoute}
      />

      <RouteDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        route={selectedRoute}
      />

      <RouteStopsDialog
        open={stopsOpen}
        onOpenChange={setStopsOpen}
        route={selectedRouteForStops}
      />
    </div>
  );
}
