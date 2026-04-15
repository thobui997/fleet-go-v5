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
import { useStations } from '@entities/station';
import type { Station } from '@entities/station';
import { StationFormDialog } from './station-form-dialog';
import { StationDeleteDialog } from './station-delete-dialog';
import { mapSupabaseError } from '../model/station-form-schema';

type StationValue = Station[keyof Station];
type StatusFilter = 'all' | 'true' | 'false';

export function StationsPage() {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [searchInput, setSearchInput] = React.useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all');
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedStation, setSelectedStation] = React.useState<Station | null>(
    null
  );

  const isActive =
    statusFilter === 'all'
      ? undefined
      : statusFilter === 'true';

  const { data, isLoading, isError, error, refetch } = useStations({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    isActive,
  });

  const stations = data?.data ?? [];
  const total = data?.count ?? 0;

  const columns: ColumnDef<Station>[] = [
    {
      key: 'name',
      header: 'Tên trạm',
      sortable: true,
    },
    {
      key: 'code',
      header: 'Mã trạm',
      cell: (value: StationValue) => (value != null ? String(value) : '—'),
    },
    {
      key: 'city',
      header: 'Thành phố',
    },
    {
      key: 'province',
      header: 'Tỉnh/TP',
      cell: (value: StationValue) => (value != null ? String(value) : '—'),
    },
    {
      key: 'is_active',
      header: 'Trạng thái',
      cell: (value: StationValue) =>
        value ? (
          <Badge variant="default">Hoạt động</Badge>
        ) : (
          <Badge variant="secondary">Ngừng hoạt động</Badge>
        ),
    },
    {
      key: 'id',
      header: '',
      cell: (_value: StationValue, row: Station) => (
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
                setSelectedStation(row);
                setFormOpen(true);
              }}
            >
              Sửa
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                setSelectedStation(row);
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
          <h1 className="text-2xl font-bold tracking-tight">Trạm xe</h1>
          <p className="text-muted-foreground">
            Quản lý danh sách trạm dừng và bến xe
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedStation(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm trạm
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Tìm theo tên hoặc thành phố..."
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
              error as { code?: string; message?: string; details?: string; status?: number }
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
          data={stations}
          isLoading={isLoading}
          emptyMessage="Chưa có trạm nào"
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

      <StationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        station={selectedStation}
      />

      <StationDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        station={selectedStation}
      />
    </div>
  );
}
