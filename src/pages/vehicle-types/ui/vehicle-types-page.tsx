import * as React from 'react';
import { Plus, MoreHorizontal } from 'lucide-react';
import {
  Button,
  Badge,
  DataTable,
  Input,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@shared/ui';
import type { ColumnDef } from '@shared/ui/data-table';
import { useDebounce, formatDate } from '@shared/lib';
import { useVehicleTypes } from '@entities/vehicle-type';
import type { VehicleType } from '@entities/vehicle-type';
import { VehicleTypeFormDialog } from './vehicle-type-form-dialog';
import { VehicleTypeDeleteDialog } from './vehicle-type-delete-dialog';

type VehicleTypeValue = VehicleType[keyof VehicleType];

export function VehicleTypesPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [search, setSearch] = React.useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState<VehicleType | null>(null);
  const [mode, setMode] = React.useState<'create' | 'edit'>('create');

  const { data, isLoading } = useVehicleTypes({
    page,
    pageSize,
    search: debouncedSearch || undefined,
  });

  const vehicleTypes = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<VehicleType>[] = [
    {
      key: 'name',
      header: 'Tên loại xe',
      sortable: true,
    },
    {
      key: 'description',
      header: 'Mô tả',
      cell: (value: VehicleTypeValue) => (
        <span className="text-muted-foreground">{String(value ?? '—')}</span>
      ),
    },
    {
      key: 'total_seats',
      header: 'Số ghế',
      sortable: true,
    },
    {
      key: 'total_floors',
      header: 'Số tầng',
    },
    {
      key: 'amenities',
      header: 'Tiện nghi',
      cell: (value: VehicleTypeValue) => {
        const items = value as string[];
        if (!items || items.length === 0)
          return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {items.map((item) => (
              <Badge key={item} variant="secondary" className="text-xs">
                {item}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Ngày tạo',
      cell: (value: VehicleTypeValue) => formatDate(value as string),
    },
    {
      key: 'id',
      header: '',
      cell: (_value: VehicleTypeValue, row: VehicleType) => (
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
                setSelectedType(row);
                setMode('edit');
                setFormOpen(true);
              }}
            >
              Chỉnh sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedType(row);
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
            <h1 className="text-2xl font-bold tracking-tight">Loại xe</h1>
            <p className="text-muted-foreground">Quản lý các loại xe trong hệ thống</p>
          </div>
          <Button
            onClick={() => {
              setSelectedType(null);
              setMode('create');
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Thêm loại xe
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Input
            placeholder="Tìm kiếm theo tên..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-sm"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={vehicleTypes}
          isLoading={isLoading}
          emptyMessage="Chưa có loại xe nào"
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
      </div>

      <VehicleTypeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={mode}
        vehicleType={selectedType}
      />

      <VehicleTypeDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        vehicleType={selectedType}
      />
    </div>
  );
}

