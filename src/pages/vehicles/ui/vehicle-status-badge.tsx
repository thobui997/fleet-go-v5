import { Badge } from '@shared/ui';
import type { VehicleStatus } from '@entities/vehicle';

interface VehicleStatusBadgeProps {
  status: VehicleStatus;
}

const STATUS_CONFIG: Record<
  VehicleStatus,
  { label: string; className: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  active: {
    label: 'Đang hoạt động',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    variant: 'default',
  },
  maintenance: {
    label: 'Đang bảo trì',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
    variant: 'default',
  },
  retired: {
    label: 'Đã ngừng sử dụng',
    className: '',
    variant: 'secondary',
  },
};

export function VehicleStatusBadge({ status }: VehicleStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <Badge variant={config.variant} className={config.className || undefined}>
      {config.label}
    </Badge>
  );
}
