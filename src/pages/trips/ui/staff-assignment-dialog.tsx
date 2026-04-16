import * as React from 'react';
import { Loader2, Trash2, Users, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { type TripWithDetails } from '@entities/trip';
import { formatDateTime } from '@shared/lib/format-date';
import { FK_DROPDOWN_PAGE_SIZE } from '../model/trip-form-schema';

interface StaffAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripWithDetails | null;
}

function mapTripStaffError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  }
): string {
  // Auth expiry / permission errors
  if (error.status === 401 || error.status === 403 || error.code === 'PGRST301') {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  // Constraint violations - check constraint name in message field
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

export function StaffAssignmentDialog({
  open,
  onOpenChange,
  trip,
}: StaffAssignmentDialogProps) {
  const { toast } = useToast();
  const addMutation = useAddTripStaff();
  const removeMutation = useRemoveTripStaff();

  // State for add staff form
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');
  const [selectedRole, setSelectedRole] = React.useState<StaffRole>('driver');

  // Reset state when trip changes
  React.useEffect(() => {
    if (trip?.id) {
      setSelectedEmployeeId('');
      setSelectedRole('driver');
    }
  }, [trip?.id]);

  // Queries
  const { data: staffList, isLoading: isLoadingStaff } = useTripStaff(trip?.id ?? '');
  const { data: employeesData } = useEmployees({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
    isActive: true,
  });
  const { data: conflicts } = useStaffConflicts(
    selectedEmployeeId,
    trip?.departure_time ?? '',
    trip?.estimated_arrival_time ?? '',
    trip?.id
  );

  const isPending = addMutation.isPending || removeMutation.isPending;
  const isReadOnly = trip?.status === 'completed' || trip?.status === 'cancelled';

  // Check if driver already exists in current staff
  const hasDriver = staffList?.some((s) => s.role === 'driver');

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleAddStaff = async () => {
    if (!trip || !selectedEmployeeId) return;

    try {
      await addMutation.mutateAsync({
        trip_id: trip.id,
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
    if (!trip) return;

    try {
      await removeMutation.mutateAsync({
        tripId: trip.id,
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

  // Filter active employees for dropdown
  const activeEmployees = employeesData?.data ?? [];

  const routeName = trip?.route?.name || 'N/A';
  const departureTime = trip?.departure_time ? formatDateTime(trip.departure_time) : 'N/A';
  const arrivalTime = trip?.estimated_arrival_time ? formatDateTime(trip.estimated_arrival_time) : 'N/A';
  const vehiclePlate = trip?.vehicle?.license_plate || 'N/A';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Phân công nhân viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trip Info */}
          <div className="rounded-md border bg-muted/50 p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tuyến đường:</span>{' '}
                <span className="font-medium">{routeName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Xe:</span>{' '}
                <span className="font-medium">{vehiclePlate}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Giờ đi:</span>{' '}
                <span className="font-medium">{departureTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Giờ đến:</span>{' '}
                <span className="font-medium">{arrivalTime}</span>
              </div>
            </div>
          </div>

          {/* Read-only notice */}
          {isReadOnly && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Chuyến đi đã {trip?.status === 'completed' ? 'hoàn thành' : 'hủy'}, không thể thay đổi nhân viên.
            </div>
          )}

          {/* Current Staff */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Nhân viên đã phân công</h3>
            {isLoadingStaff ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : staffList && staffList.length > 0 ? (
              <div className="space-y-2">
                {staffList.map((staff) => (
                  <div
                    key={staff.employee_id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
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
              <p className="text-sm text-muted-foreground">Chưa phân công nhân viên</p>
            )}
          </div>

          {/* Add Staff Form */}
          {!isReadOnly && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Thêm nhân viên</h3>
              <div className="grid grid-cols-2 gap-4">
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
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Chuyến đi đã có tài xế. Bạn có thể thêm tài xế thứ hai nhưng hệ thống có thể từ chối.</span>
                </div>
              )}

              {/* Conflict warning */}
              {conflicts && conflicts.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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
                Thêm
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
