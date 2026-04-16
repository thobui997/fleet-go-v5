import { Badge } from '@shared/ui';
import type { TripStatus } from '@entities/trip';

interface TripStatusBadgeProps {
  status: TripStatus;
}

const STATUS_CONFIG: Record<
  TripStatus,
  { label: string; className: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  scheduled: {
    label: 'Đã lên lịch',
    className: '',
    variant: 'default',
  },
  in_progress: {
    label: 'Đang chạy',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    variant: 'outline',
  },
  completed: {
    label: 'Hoàn thành',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    variant: 'default',
  },
  cancelled: {
    label: 'Đã hủy',
    className: '',
    variant: 'destructive',
  },
};

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className || undefined}>
      {config.label}
    </Badge>
  );
}
