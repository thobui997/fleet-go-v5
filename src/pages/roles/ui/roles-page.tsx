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
import { useRoles } from '@entities/role';
import type { Role } from '@entities/role';
import { RoleFormDialog } from './role-form-dialog';
import { RoleDeleteDialog } from './role-delete-dialog';
import { mapRoleError } from '../model/role-form-schema';

type RoleValue = Role[keyof Role];

export function RolesPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);

  const { data, isLoading, isError, error, refetch } = useRoles({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  const roles = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<Role>[] = [
    {
      key: 'name',
      header: 'Tên vai trò',
      sortable: true,
    },
    {
      key: 'description',
      header: 'Mô tả',
      cell: (value: RoleValue) => (value != null ? String(value) : '—'),
    },
    {
      key: 'permissions',
      header: 'Quyền',
      cell: (value: RoleValue) => {
        const perms = value as string[];
        return `${perms.length} quyền`;
      },
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      cell: (value: RoleValue) =>
        value != null
          ? new Date(String(value)).toLocaleDateString('vi-VN')
          : '—',
    },
    {
      key: 'id',
      header: '',
      cell: (_value: RoleValue, row: Role) => (
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
                setSelectedRole(row);
                setFormOpen(true);
              }}
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedRole(row);
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
          <h1 className="text-2xl font-bold tracking-tight">Vai trò</h1>
          <p className="text-muted-foreground">
            Quản lý vai trò và phân quyền hệ thống
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedRole(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm vai trò
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo tên vai trò..."
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
            {mapRoleError(error)}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={roles}
          isLoading={isLoading}
          emptyMessage="Chưa có vai trò nào"
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

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={selectedRole}
      />

      <RoleDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        role={selectedRole}
      />
    </div>
  );
}
