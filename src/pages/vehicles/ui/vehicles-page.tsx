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
  useToast,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce, formatDate } from '@shared/lib';
import { useVehicles } from '@entities/vehicle';
import type { VehicleWithType, VehicleStatus, Vehicle } from '@entities/vehicle';
import { VehicleFormDialog } from './vehicle-form-dialog';
import { VehicleDeleteDialog } from './vehicle-delete-dialog';
import { VehicleStatusBadge } from './vehicle-status-badge';

type VehicleWithTypeValue = VehicleWithType[keyof VehicleWithType];

type StatusFilter = VehicleStatus | 'all';

export function VehiclesPage() {
  const { toast: _toast } = useToast();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const search = useDebounce(searchInput, 300);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedVehicle, setSelectedVehicle] = React.useState<Vehicle | null>(null);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');

  const { data, isLoading, isError, refetch } = useVehicles({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const vehicles = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<VehicleWithType>[] = [
    {
      key: 'license_plate',
      header: 'Biển số',
      sortable: true,
    },
    {
      key: 'vehicle_type_id',
      header: 'Loại xe',
      cell: (_value: VehicleWithTypeValue, row: VehicleWithType) =>
        row.vehicle_type?.name ?? '—',
    },
    {
      key: 'year_manufactured',
      header: 'Năm SX',
      cell: (value: VehicleWithTypeValue) =>
        value != null ? String(value) : '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: (value: VehicleWithTypeValue) => (
        <VehicleStatusBadge status={value as VehicleStatus} />
      ),
    },
    {
      key: 'current_mileage',
      header: 'Số km',
      sortable: true,
      cell: (value: VehicleWithTypeValue) =>
        value != null
          ? (value as number).toLocaleString('vi-VN')
          : '—',
    },
    {
      key: 'next_maintenance_date',
      header: 'Bảo trì kế tiếp',
      cell: (value: VehicleWithTypeValue) =>
        value ? formatDate(value as string) : '—',
    },
    {
      key: 'created_at',
      header: 'Tạo lúc',
      cell: (value: VehicleWithTypeValue) => formatDate(value as string),
    },
    {
      key: 'id',
      header: '',
      cell: (_value: VehicleWithTypeValue, row: VehicleWithType) => (
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
                setSelectedVehicle(row as Vehicle);
                setMode('edit');
                setFormOpen(true);
              }}
            >
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedVehicle(row as Vehicle);
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
          <h1 className="text-2xl font-bold tracking-tight">Xe</h1>
          <p className="text-muted-foreground">Quản lý danh sách xe trong đội xe</p>
        </div>
        <Button
          onClick={() => {
            setSelectedVehicle(null);
            setMode('create');
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm xe
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo biển số…"
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
            <SelectItem value="active">Đang hoạt động</SelectItem>
            <SelectItem value="maintenance">Đang bảo trì</SelectItem>
            <SelectItem value="retired">Đã ngừng sử dụng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm font-medium text-destructive">
            Không thể tải danh sách xe. Vui lòng thử lại.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={vehicles}
          isLoading={isLoading}
          emptyMessage="Chưa có xe nào"
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

      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={mode}
        vehicle={selectedVehicle}
      />

      <VehicleDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        vehicle={selectedVehicle}
      />
    </div>
  );
}
