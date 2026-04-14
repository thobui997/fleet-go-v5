import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Textarea,
  FormFieldWrapper,
  useToast,
} from '@shared/ui';
import { useCreateVehicleType, useUpdateVehicleType } from '@entities/vehicle-type';
import type { VehicleType } from '@entities/vehicle-type';
import {
  vehicleTypeFormSchema,
  type VehicleTypeFormValues,
  mapSupabaseError,
} from '../model/vehicle-type-form-schema';
import { SeatLayoutEditor } from './seat-layout-editor';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseSeatLayoutToFloors(
  layout: Record<string, unknown>,
  floorCount: number
): Array<{ rows: number; seats_per_row: number }> {
  return Array.from({ length: floorCount }, (_, i) => {
    const floorData = layout[`floor_${i + 1}`];
    if (floorData && typeof floorData === 'object' && !Array.isArray(floorData)) {
      const fd = floorData as Record<string, unknown>;
      return {
        rows: typeof fd.rows === 'number' ? fd.rows : 5,
        seats_per_row: typeof fd.seats_per_row === 'number' ? fd.seats_per_row : 4,
      };
    }
    return { rows: 5, seats_per_row: 4 };
  });
}

const DEFAULT_FLOOR = { rows: 5, seats_per_row: 4 } as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface VehicleTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  vehicleType: VehicleType | null;
}

export function VehicleTypeFormDialog({
  open,
  onOpenChange,
  mode,
  vehicleType,
}: VehicleTypeFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateVehicleType();
  const updateMutation = useUpdateVehicleType();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<VehicleTypeFormValues>({
    resolver: zodResolver(vehicleTypeFormSchema),
    defaultValues: {
      name: '',
      description: '',
      floors: [{ ...DEFAULT_FLOOR }],
      amenities: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'floors' });

  // Derived totals shown in the UI header
  const floors = watch('floors') ?? [];
  const totalSeats = floors.reduce(
    (sum, f) => sum + (Number(f.rows) || 0) * (Number(f.seats_per_row) || 0),
    0
  );

  // Reset form whenever the dialog opens
  React.useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && vehicleType) {
      reset({
        name: vehicleType.name,
        description: vehicleType.description ?? '',
        floors: parseSeatLayoutToFloors(vehicleType.seat_layout, vehicleType.total_floors),
        amenities: vehicleType.amenities.join(', '),
      });
    } else {
      reset({
        name: '',
        description: '',
        floors: [{ ...DEFAULT_FLOOR }],
        amenities: '',
      });
    }
  }, [open, mode, vehicleType, reset]);

  const handleFloorRowsChange = (index: number, val: number) => {
    const current = getValues('floors');
    setValue(
      'floors',
      current.map((f, i) => (i === index ? { ...f, rows: val } : f)),
      { shouldValidate: true }
    );
  };

  const handleFloorSeatsPerRowChange = (index: number, val: number) => {
    const current = getValues('floors');
    setValue(
      'floors',
      current.map((f, i) => (i === index ? { ...f, seats_per_row: val } : f)),
      { shouldValidate: true }
    );
  };

  const onSubmit = async (values: VehicleTypeFormValues) => {
    const totalFloors = values.floors.length;
    const totalSeatCount = values.floors.reduce(
      (sum, f) => sum + f.rows * f.seats_per_row,
      0
    );
    const seatLayout = Object.fromEntries(
      values.floors.map((f, i) => [
        `floor_${i + 1}`,
        { rows: f.rows, seats_per_row: f.seats_per_row },
      ])
    );
    const amenitiesArray = values.amenities
      ? values.amenities.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const payload = {
      name: values.name,
      description: values.description || null,
      total_floors: totalFloors,
      total_seats: totalSeatCount,
      seat_layout: seatLayout,
      amenities: amenitiesArray,
    };

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (vehicleType) {
        await updateMutation.mutateAsync({ id: vehicleType.id, input: payload });
      }
      onOpenChange(false);
      toast({
        title: mode === 'create' ? 'Thêm thành công' : 'Cập nhật thành công',
        description:
          mode === 'create'
            ? `Loại xe "${values.name}" đã được thêm.`
            : `Loại xe "${values.name}" đã được cập nhật.`,
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapSupabaseError(error as { code?: string }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm loại xe mới' : 'Chỉnh sửa loại xe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Scrollable field area */}
          <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            <FormFieldWrapper label="Tên loại xe" error={errors.name?.message} required>
              <Input {...register('name')} placeholder="VD: Giường nằm 40 chỗ" />
            </FormFieldWrapper>

            <FormFieldWrapper label="Mô tả" error={errors.description?.message}>
              <Textarea
                {...register('description')}
                placeholder="Mô tả ngắn về loại xe..."
                rows={2}
              />
            </FormFieldWrapper>

            {/* ── Seat Layout Section ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cấu hình chỗ ngồi</p>
                  <p className="text-xs text-muted-foreground">
                    {fields.length} tầng &middot; Tổng{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      {totalSeats}
                    </span>{' '}
                    ghế
                  </p>
                </div>

                {fields.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ ...DEFAULT_FLOOR })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Thêm tầng
                  </Button>
                )}
              </div>

              {fields.map((field, index) => {
                const floorConfig = floors[index] ?? DEFAULT_FLOOR;
                return (
                  <div key={field.id} className="relative">
                    <SeatLayoutEditor
                      floorIndex={index}
                      rows={Number(floorConfig.rows) || 0}
                      seatsPerRow={Number(floorConfig.seats_per_row) || 0}
                      onRowsChange={(val) => handleFloorRowsChange(index, val)}
                      onSeatsPerRowChange={(val) =>
                        handleFloorSeatsPerRowChange(index, val)
                      }
                      rowsError={errors.floors?.[index]?.rows?.message}
                      seatsPerRowError={errors.floors?.[index]?.seats_per_row?.message}
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-2 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Xóa tầng {index + 1}</span>
                      </Button>
                    )}
                  </div>
                );
              })}

              {errors.floors?.root && (
                <p className="text-sm text-destructive">
                  {errors.floors.root.message}
                </p>
              )}
            </div>

            <FormFieldWrapper label="Tiện nghi" error={errors.amenities?.message}>
              <Input
                {...register('amenities')}
                placeholder="VD: wifi, ac, charging"
              />
            </FormFieldWrapper>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending || totalSeats === 0}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Thêm' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
