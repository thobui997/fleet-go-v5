import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Trash2, Users, AlertTriangle, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  useToast,
  Skeleton,
} from '@shared/ui';
import { useTripStaff, useAddTripStaff, useRemoveTripStaff, useStaffConflicts, type StaffRole } from '@entities/trip-staff';
import { useEmployees } from '@entities/employee';
import { useTrip } from '@entities/trip';
import { formatDateTime } from '@shared/lib/format-date';
import { ROUTES } from '@shared/config/routes';
import { FK_DROPDOWN_PAGE_SIZE } from '../model/trip-form-schema';

function mapTripStaffError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  }
): string {
  if (error.status === 401 || error.status === 403 || error.code === 'PGRST301') {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  if (error.code === '23505') {
    const msg = error.message || '';
    if (msg.includes('trip_staff_pkey')) {
      return 'Nhân viên đã được phân công chuyến đi này';
    }
    if (msg.includes('idx_trip_staff_one_driver')) {
      return 'Chuyến đi đã có tài xế, không thể thêm tài xế khác';
    }
  }

  if (error.code === '23503') {
    return 'Nhân viên không tồn tại hoặc đã bị xóa';
  }

  return 'Đã xảy ra lỗi, vui lòng thử lại';
}

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy chuyến đi.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải chuyến đi. Vui lòng thử lại.';
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function StaffAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const addMutation = useAddTripStaff();
  const removeMutation = useRemoveTripStaff();

  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<StaffRole>('driver');

  React.useEffect(() => {
    if (id) {
      setSelectedEmployeeId('');
      setSelectedRole('driver');
    }
  }, [id]);

  const { data: tripData, isLoading: isTripLoading, isError: isTripError, error: tripError } = useTrip(id ?? '');
  const { data: staffList, isLoading: isLoadingStaff } = useTripStaff(id ?? '');
  const { data: employeesData } = useEmployees({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
    isActive: true,
  });
  const { data: conflicts } = useStaffConflicts(
    selectedEmployeeId,
    tripData?.departure_time ?? '',
    tripData?.estimated_arrival_time ?? '',
    id
  );

  const isPending = addMutation.isPending || removeMutation.isPending;
  const isReadOnly = tripData?.status === 'completed' || tripData?.status === 'cancelled';
  const hasDriver = staffList?.some((s) => s.role === 'driver');

  const handleAddStaff = async () => {
    if (!id || !selectedEmployeeId) return;

    try {
      await addMutation.mutateAsync({
        trip_id: id,
        employee_id: selectedEmployeeId,
        role: selectedRole,
      });
      setSelectedEmployeeId('');
      setSelectedRole('driver');
      toast({
        title: 'Thành công',
        description: 'Đã phân công nhân viên',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapTripStaffError(
          error as { code?: string; message?: string; status?: number }
        ),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStaff = async (employeeId: string) => {
    if (!id) return;

    try {
      await removeMutation.mutateAsync({
        tripId: id,
        employeeId,
      });
      toast({
        title: 'Thành công',
        description: 'Đã xóa phân công',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapTripStaffError(
          error as { code?: string; message?: string; status?: number }
        ),
        variant: 'destructive',
      });
    }
  };

  const activeEmployees = employeesData?.data ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate(ROUTES.TRIPS)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Phân công nhân viên</h1>
            {tripData && (
              <p className="text-sm text-muted-foreground">
                {tripData.route?.name || 'N/A'} • {tripData.vehicle?.license_plate || 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-6 px-1 space-y-6">

          {/* Loading skeleton */}
          {isTripLoading && (
            <div className="space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {/* Error state */}
          {isTripError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {mapFetchError(tripError)}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.TRIPS)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại danh sách
              </Button>
            </div>
          )}

          {/* Content */}
          {tripData && (
            <div className="space-y-6">

              {/* Trip info card */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Tuyến:</span>
                    <span className="ml-1 font-medium">{tripData.route?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Xe:</span>
                    <span className="ml-1 font-medium">{tripData.vehicle?.license_plate || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giờ đi:</span>
                    <span className="ml-1 font-medium">{tripData.departure_time ? formatDateTime(tripData.departure_time) : 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Giờ đến:</span>
                    <span className="ml-1 font-medium">{tripData.estimated_arrival_time ? formatDateTime(tripData.estimated_arrival_time) : 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">Trạng thái: </span>
                  <Badge variant={tripData.status === 'scheduled' ? 'default' : tripData.status === 'completed' ? 'default' : tripData.status === 'cancelled' ? 'destructive' : 'secondary'}>
                    {STATUS_LABELS[tripData.status] || tripData.status}
                  </Badge>
                </div>
              </div>

              {/* Read-only notice */}
              {isReadOnly && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                  Chuyến đi đã {tripData.status === 'completed' ? 'hoàn thành' : 'hủy'}, không thể thay đổi nhân viên.
                </div>
              )}

              {/* Assigned staff section */}
              <div className="rounded-lg border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold">Nhân viên đã phân công</h2>

                {isLoadingStaff ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : staffList && staffList.length > 0 ? (
                  <div className="space-y-2">
                    {staffList.map((staff) => (
                      <div
                        key={staff.employee_id}
                        className="flex items-center justify-between rounded-md border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {staff.employee?.profiles?.full_name || 'N/A'}
                          </span>
                          <Badge variant={staff.role === 'driver' ? 'default' : 'secondary'}>
                            {staff.role === 'driver' ? 'Tài xế' : 'Phụ xe'}
                          </Badge>
                        </div>
                        {!isReadOnly && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveStaff(staff.employee_id)}
                            disabled={isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Xóa</span>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">Chưa phân công nhân viên</p>
                )}
              </div>

              {/* Add staff section */}
              {!isReadOnly && (
                <div className="rounded-lg border bg-card p-6 space-y-4">
                  <h2 className="text-base font-semibold">Thêm nhân viên</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Nhân viên</label>
                      <Select
                        value={selectedEmployeeId}
                        onValueChange={setSelectedEmployeeId}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn nhân viên" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeEmployees.map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.profiles?.full_name || 'N/A'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Vai trò</label>
                      <Select
                        value={selectedRole}
                        onValueChange={(v) => setSelectedRole(v as StaffRole)}
                        disabled={isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="driver">Tài xế</SelectItem>
                          <SelectItem value="assistant">Phụ xe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Driver pre-check warning */}
                  {selectedRole === 'driver' && hasDriver && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>Chuyến đi đã có tài xế. Bạn có thể thêm tài xế thứ hai nhưng hệ thống có thể từ chối.</span>
                    </div>
                  )}

                  {/* Conflict warning */}
                  {conflicts && conflicts.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="font-medium">⚠️ Cảnh báo xung đột lịch:</span>
                      </div>
                      <ul className="space-y-1 ml-6">
                        {conflicts.map((conflict) => (
                          <li key={conflict.trip_id}>
                            {conflict.trip.route?.name || 'N/A'} ({formatDateTime(conflict.trip.departure_time)} - {formatDateTime(conflict.trip.estimated_arrival_time)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Button
                    onClick={handleAddStaff}
                    disabled={!selectedEmployeeId || isPending}
                    className="w-full"
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Thêm nhân viên
                  </Button>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
