import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, AlertCircle, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import {
  Button,
  DataTable,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { formatDate } from '@shared/lib';
import { useVehicles } from '@entities/vehicle';
import {
  useMaintenanceLogs,
  MAINTENANCE_TYPES,
} from '@entities/maintenance-log';
import type {
  MaintenanceLogWithVehicle,
  MaintenanceLog,
  MaintenanceType,
} from '@entities/maintenance-log';
import { ROUTES } from '@shared/config/routes';
import { MaintenanceDeleteDialog } from './maintenance-delete-dialog';
import { MaintenanceTypeBadge } from './maintenance-type-badge';
import { FK_DROPDOWN_PAGE_SIZE } from '../model/maintenance-form-schema';

type MaintenanceLogValue = MaintenanceLogWithVehicle[keyof MaintenanceLogWithVehicle];

type TypeFilter = MaintenanceType | 'all';
type VehicleFilter = string | 'all';

const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  routine: 'Bảo trì định kỳ',
  repair: 'Sửa chữa',
  inspection: 'Kiểm định',
  emergency: 'Khẩn cấp',
};

export function MaintenancePage() {
  const { toast: _toast } = useToast();
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [vehicleFilter, setVehicleFilter] = React.useState<VehicleFilter>('all');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedLog, setSelectedLog] = React.useState<MaintenanceLog | null>(null);

  const { data, isLoading, isError, refetch } = useMaintenanceLogs({
    page,
    pageSize,
    vehicleId: vehicleFilter === 'all' ? undefined : vehicleFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
  });

  const { data: vehiclesData } = useVehicles({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const logs = data?.data ?? [];
  const total = data?.count ?? 0;
  const vehicles = vehiclesData?.data ?? [];

  const columns: ColumnDef<MaintenanceLogWithVehicle>[] = [
    {
      key: 'vehicle_id',
      header: 'Xe',
      cell: (_value: MaintenanceLogValue, row: MaintenanceLogWithVehicle) =>
        row.vehicle?.license_plate ?? '—',
    },
    {
      key: 'type',
      header: 'Loại',
      cell: (value: MaintenanceLogValue) => (
        <MaintenanceTypeBadge type={value as MaintenanceType} />
      ),
    },
    {
      key: 'description',
      header: 'Mô tả',
      cell: (value: MaintenanceLogValue) => {
        const str = value as string;
        return str.length > 60 ? str.slice(0, 60) + '…' : str;
      },
    },
    {
      key: 'cost',
      header: 'Chi phí',
      sortable: true,
      cell: (value: MaintenanceLogValue) =>
        `${(value as number).toLocaleString('vi-VN')} VND`,
    },
    {
      key: 'performed_by',
      header: 'Người thực hiện',
      cell: (value: MaintenanceLogValue) => (value as string | null) ?? '—',
    },
    {
      key: 'performed_at',
      header: 'Ngày thực hiện',
      sortable: true,
      cell: (value: MaintenanceLogValue) =>
        value ? formatDate(value as string) : '—',
    },
    {
      key: 'next_due_date',
      header: 'Bảo trì kế tiếp',
      cell: (value: MaintenanceLogValue) =>
        value ? formatDate(value as string) : '—',
    },
    {
      key: 'id',
      header: '',
      cell: (_value: MaintenanceLogValue, row: MaintenanceLogWithVehicle) => (
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
                navigate(`/maintenance/${row.id}/edit`);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedLog(row as MaintenanceLog);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
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
            <h1 className="text-2xl font-bold tracking-tight">Bảo trì</h1>
            <p className="text-muted-foreground">
              Quản lý lịch sử bảo trì của đội xe
            </p>
          </div>
          <Button onClick={() => navigate(ROUTES.MAINTENANCE_NEW)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm bảo trì
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Vehicle filter */}
          <Select
            value={vehicleFilter}
            onValueChange={(val) => {
              setVehicleFilter(val as VehicleFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Tất cả xe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả xe</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.license_plate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select
            value={typeFilter}
            onValueChange={(val) => {
              setTypeFilter(val as TypeFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tất cả loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              {MAINTENANCE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {MAINTENANCE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              Không thể tải danh sách bảo trì. Vui lòng thử lại.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            isLoading={isLoading}
            emptyMessage="Chưa có lịch sử bảo trì"
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

      <MaintenanceDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        log={selectedLog}
      />
    </div>
  );
}
