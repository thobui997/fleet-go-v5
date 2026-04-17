import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
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
import { useEmployees } from '@entities/employee';
import type { Employee } from '@entities/employee';
import { ROUTES } from '@shared/config/routes';
import { EmployeeDeleteDialog } from './employee-delete-dialog';
import { mapEmployeeError } from '../model/employee-form-schema';

type StatusFilter = 'all' | 'true' | 'false';

function getLicenseExpiryBadge(expiryDate: string | null) {
  if (!expiryDate) return null;
  const today = dayjs().startOf('day');
  const expiry = dayjs(expiryDate);
  const daysLeft = expiry.diff(today, 'day');
  if (daysLeft < 0)
    return <Badge variant="destructive">Hết hạn</Badge>;
  if (daysLeft <= 30)
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
        Sắp hết hạn
      </Badge>
    );
  return null;
}

export function EmployeesPage() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean;
    employee: Employee | null;
  }>({ open: false, employee: null });

  const isActive =
    statusFilter === 'all' ? undefined : statusFilter === 'true';

  const { data, isLoading, isError, error, refetch } = useEmployees({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    isActive,
  });

  const employees = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<Employee>[] = [
    {
      key: 'user_id',
      header: 'Họ và tên',
      cell: (_value, row) =>
        row.profiles?.full_name ?? '(Chưa liên kết)',
    },
    {
      key: 'profiles',
      header: 'Email',
      cell: (_value, row) => row.profiles?.email ?? '—',
    },
    {
      key: 'hire_date',
      header: 'Ngày vào làm',
      cell: (_value, row) =>
        row.hire_date ? dayjs(row.hire_date).format('DD/MM/YYYY') : '—',
    },
    {
      key: 'license_number',
      header: 'Số bằng lái',
      cell: (_value, row) => row.license_number ?? '—',
    },
    {
      key: 'license_expiry',
      header: 'Hạn bằng lái',
      cell: (_value, row) => (
        <div className="flex items-center gap-2">
          <span>
            {row.license_expiry
              ? dayjs(row.license_expiry).format('DD/MM/YYYY')
              : '—'}
          </span>
          {getLicenseExpiryBadge(row.license_expiry)}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      cell: (_value, row) =>
        row.is_active ? (
          <Badge variant="default">Hoạt động</Badge>
        ) : (
          <Badge variant="secondary">Nghỉ việc</Badge>
        ),
    },
    {
      key: 'id',
      header: '',
      cell: (_value, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                navigate(ROUTES.EMPLOYEES_EDIT.replace(':id', row.id))
              }
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() =>
                setDeleteDialog({ open: true, employee: row })
              }
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
            <h1 className="text-2xl font-bold tracking-tight">Nhân viên</h1>
            <p className="text-muted-foreground">
              Quản lý danh sách nhân viên và hồ sơ
            </p>
          </div>
          <Button
            onClick={() => navigate(ROUTES.EMPLOYEES_NEW)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm nhân viên
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Tìm theo họ tên nhân viên..."
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
              <SelectItem value="false">Nghỉ việc</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isError ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium text-destructive">
              {mapEmployeeError(error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Thử lại
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={employees}
            isLoading={isLoading}
            emptyMessage="Chưa có nhân viên nào"
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

      <EmployeeDeleteDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog((prev) => ({ ...prev, open }))
        }
        employee={deleteDialog.employee}
      />
    </div>
  );
}
