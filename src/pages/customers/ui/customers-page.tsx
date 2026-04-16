import * as React from 'react';
import { Plus, MoreHorizontal, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Button,
  DataTable,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce } from '@shared/lib';
import { useCustomers } from '@entities/customer';
import type { Customer } from '@entities/customer';
import { CustomerFormDialog } from './customer-form-dialog';
import { CustomerDeleteDialog } from './customer-delete-dialog';
import { mapSupabaseError } from '../model/customer-form-schema';

type CustomerValue = Customer[keyof Customer];

export function CustomersPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editingCustomer, setEditingCustomer] = React.useState<
    Customer | null
  >(null);
  const [deletingCustomer, setDeletingCustomer] = React.useState<
    Customer | null
  >(null);

  const { data, isLoading, isError, error, refetch } = useCustomers({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  const customers = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'full_name',
      header: 'Họ tên',
      sortable: true,
    },
    {
      key: 'phone_number',
      header: 'Số ĐT',
    },
    {
      key: 'email',
      header: 'Email',
      cell: (value: CustomerValue) => (value != null ? String(value) : '—'),
    },
    {
      key: 'id_card_number',
      header: 'CMND/CCCD',
      cell: (value: CustomerValue) => (value != null ? String(value) : '—'),
    },
    {
      key: 'gender',
      header: 'Giới tính',
      cell: (value: CustomerValue) => {
        if (value == null) return '—';
        const genderMap: Record<string, string> = {
          male: 'Nam',
          female: 'Nữ',
          other: 'Khác',
        };
        return genderMap[value as string] ?? '—';
      },
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      cell: (value: CustomerValue) =>
        value != null
          ? new Date(value as string).toLocaleDateString('vi-VN')
          : '—',
    },
    {
      key: 'id',
      header: '',
      cell: (_value: CustomerValue, row: Customer) => (
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
                setEditingCustomer(row);
                setFormOpen(true);
              }}
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setDeletingCustomer(row);
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
          <h1 className="text-2xl font-bold tracking-tight">Khách hàng</h1>
          <p className="text-muted-foreground">
            Quản lý thông tin khách hàng
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo họ tên, số ĐT, hoặc email..."
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
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
          data={customers}
          isLoading={isLoading}
          emptyMessage="Chưa có khách hàng nào"
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

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        customer={editingCustomer}
      />

      <CustomerDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        customer={deletingCustomer}
      />
    </div>
  );
}
