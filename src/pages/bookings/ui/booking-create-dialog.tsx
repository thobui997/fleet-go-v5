import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';
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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { useCreateBooking } from '@entities/booking';
import { useCustomers } from '@entities/customer';
import { useTrips } from '@entities/trip';
import { useTripBookedSeats } from '@entities/ticket';
import { formatCurrency } from '@shared/lib';
import {
  bookingFormSchema,
  type BookingFormValues,
  mapBookingError,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/booking-form-schema';

// Helper function to check if trip is available for booking
const isTripAvailable = (trip: any) => trip.status === 'scheduled' || trip.status === 'in_progress';

interface BookingCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PassengerRowProps {
  index: number;
  remove: () => void;
  canRemove: boolean;
  register: any;
  errors: any;
}

function PassengerRow({ index, remove, canRemove, register, errors }: PassengerRowProps) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-start">
      <div className="space-y-1">
        <Label>Tên hành khách *</Label>
        <Input
          {...register(`tickets.${index}.passenger_name`)}
          placeholder="Nhập tên hành khách"
        />
        {errors.tickets?.[index]?.passenger_name && (
          <p className="text-xs text-destructive">
            {errors.tickets[index]?.passenger_name?.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Số ghế *</Label>
        <Input
          {...register(`tickets.${index}.seat_number`)}
          placeholder="VD: A01"
        />
        {errors.tickets?.[index]?.seat_number && (
          <p className="text-xs text-destructive">
            {errors.tickets[index]?.seat_number?.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label>Giá vé *</Label>
        <Input
          {...register(`tickets.${index}.price`, { valueAsNumber: true })}
          type="number"
          step="1000"
          placeholder="VD: 150000"
        />
        {errors.tickets?.[index]?.price && (
          <p className="text-xs text-destructive">
            {errors.tickets[index]?.price?.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <Label>ĐT</Label>
        <Input
          {...register(`tickets.${index}.passenger_phone`)}
          type="tel"
          placeholder="Số điện thoại"
        />
      </div>

      <div className="space-y-1">
        <Label>CMND</Label>
        <Input
          {...register(`tickets.${index}.passenger_id_card`)}
          placeholder="Số CMND"
        />
      </div>

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={remove}
          className="mt-6 h-9 w-9 p-0 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function BookingCreateDialog({
  open,
  onOpenChange,
}: BookingCreateDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateBooking();

  // FK dropdown queries
  const { data: customersData, isLoading: customersLoading } = useCustomers({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  // Fetch all trips, filter to scheduled/in_progress in display
  const { data: tripsData, isLoading: tripsLoading } = useTrips({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const customers = customersData?.data ?? [];
  const trips = (tripsData?.data ?? []).filter(isTripAvailable);

  const hasInitializedRef = React.useRef(false);
  const selectedTripIdRef = React.useRef<string | null>(null);

  // Fetch booked seats when trip is selected
  const { data: bookedSeats = [] } = useTripBookedSeats(selectedTripIdRef.current ?? '');

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors, isDirty },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_id: '',
      trip_id: '',
      tickets: [{ passenger_name: '', seat_number: '', passenger_phone: '', passenger_id_card: '', price: 0 }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tickets',
  });

  const watchedTripId = watch('trip_id');
  const watchedTickets = watch('tickets');

  // Update selectedTripIdRef for the query
  React.useEffect(() => {
    if (watchedTripId && watchedTripId !== selectedTripIdRef.current) {
      selectedTripIdRef.current = watchedTripId;
    }
  }, [watchedTripId]);

  // Find selected trip for price default
  const selectedTrip = React.useMemo(() => {
    if (!watchedTripId) return null;
    return trips.find(t => t.id === watchedTripId) ?? null;
  }, [watchedTripId, trips]);

  // Calculate total amount
  const totalAmount = React.useMemo(() => {
    return watchedTickets.reduce((sum, t) => sum + (t.price || 0), 0);
  }, [watchedTickets]);

  // Get default price from trip
  const getDefaultPrice = React.useCallback(() => {
    if (!selectedTrip) return 0;
    // Use price_override if available, otherwise use a default
    return selectedTrip.price_override ?? 150000; // Default price if no override
  }, [selectedTrip]);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      selectedTripIdRef.current = null;
      hasInitializedRef.current = false;
      reset({
        customer_id: '',
        trip_id: '',
        tickets: [{ passenger_name: '', seat_number: '', passenger_phone: '', passenger_id_card: '', price: getDefaultPrice() }],
        notes: '',
      });
    }
  }, [open, reset, getDefaultPrice]);

  // Close guard (skip during isPending)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty && !createMutation.isPending) {
      const confirmed = window.confirm('Form có thay đổi chưa lưu. Bạn có chắc muốn đóng?');
      if (!confirmed) return;
    }
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: BookingFormValues) => {
    try {
      const result = await createMutation.mutateAsync({
        booking: {
          customer_id: values.customer_id,
          trip_id: values.trip_id,
          booking_date: new Date().toISOString(), // Current timestamp
          status: 'pending',
          total_amount: 0, // Calculated server-side
          passenger_count: values.tickets.length,
          created_by: null,
          cancelled_at: null,
          cancelled_by: null,
          notes: values.notes || null,
        },
        tickets: values.tickets.map(t => ({
          trip_id: values.trip_id,
          seat_number: t.seat_number.trim(),
          passenger_name: t.passenger_name.trim(),
          passenger_phone: t.passenger_phone?.trim() || undefined,
          passenger_id_card: t.passenger_id_card?.trim() || undefined,
          price: t.price,
        })),
      });
      toast({
        description: `Tạo đặt vé thành công! Mã đặt vé: ${(result as any).booking_code}`,
        variant: 'success',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: mapBookingError(
          error as {
            code?: string;
            message?: string;
            details?: string;
            status?: number;
          }
        ),
      });
    }
  };

  const customerTruncated = customersData?.count ? customersData.count > customers.length : false;
  const tripTruncated = tripsData?.count ? tripsData.count > trips.length : false;

  const selectedTripVehicle = selectedTrip?.vehicle;
  const totalSeats = selectedTripVehicle?.license_plate ? null : 0; // Would need vehicle_type.total_seats

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Tạo đặt vé mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            {/* Customer Selection */}
            <Controller
              name="customer_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Khách hàng *</Label>
                  <Select
                    value={field.value || '__none__'}
                    onValueChange={(val) => field.onChange(val === '__none__' ? '' : val)}
                    disabled={customersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khách hàng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Chọn khách hàng —</SelectItem>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name} - {c.phone_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customerTruncated && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Hiển thị {customers.length} / {customersData?.count} khách hàng (hãy tìm kiếm cụ thể hơn)
                    </p>
                  )}
                  {errors.customer_id && (
                    <p className="text-sm text-destructive">{errors.customer_id.message}</p>
                  )}
                </div>
              )}
            />

            {/* Trip Selection */}
            <Controller
              name="trip_id"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Chuyến xe *</Label>
                  <Select
                    value={field.value || '__none__'}
                    onValueChange={(val) => {
                      field.onChange(val === '__none__' ? '' : val);
                    }}
                    disabled={tripsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chuyến xe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Chọn chuyến xe —</SelectItem>
                      {trips.map((t) => {
                        const origin = t.route?.origin_station?.name ?? '—';
                        const dest = t.route?.destination_station?.name ?? '—';
                        const label = `${t.route?.name ?? '—'} (${origin} → ${dest}) - ${new Date(t.departure_time).toLocaleString('vi-VN')} - ${t.vehicle?.license_plate ?? '—'}`;
                        return (
                          <SelectItem key={t.id} value={t.id}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {tripTruncated && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Hiển thị {trips.length} / {tripsData?.count} chuyến (hãy tìm kiếm cụ thể hơn)
                    </p>
                  )}
                  {errors.trip_id && (
                    <p className="text-sm text-destructive">{errors.trip_id.message}</p>
                  )}
                </div>
              )}
            />

            {/* Booked Seats Info */}
            {selectedTrip && bookedSeats.length > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">Ghế đã đặt: {bookedSeats.sort().join(', ')}</p>
                {totalSeats !== null && totalSeats > 0 && (
                  <p className="text-muted-foreground">
                    Còn trống: {totalSeats - bookedSeats.length} / {totalSeats} ghế
                  </p>
                )}
              </div>
            )}

            {/* Passengers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Danh sách hành khách *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    passenger_name: '',
                    seat_number: '',
                    passenger_phone: '',
                    passenger_id_card: '',
                    price: getDefaultPrice(),
                  })}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Thêm hành khách
                </Button>
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <PassengerRow
                    key={field.id}
                    index={index}
                    remove={() => remove(index)}
                    canRemove={fields.length > 1}
                    register={register}
                    errors={errors}
                  />
                ))}
              </div>

              {errors.tickets && (
                <p className="text-sm text-destructive">{errors.tickets.root?.message || 'Phải có ít nhất một hành khách'}</p>
              )}
            </div>

            {/* Total Amount */}
            <div className="rounded-md bg-muted p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Tổng tiền:</span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Notes */}
            <FormFieldWrapper label="Ghi chú" error={errors.notes?.message}>
              <Textarea
                {...register('notes')}
                placeholder="Ghi chú thêm (tùy chọn)"
                rows={2}
              />
            </FormFieldWrapper>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Tạo đặt vé
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
