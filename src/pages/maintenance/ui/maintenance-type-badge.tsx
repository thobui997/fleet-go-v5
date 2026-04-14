import { Badge } from '@shared/ui';
import type { MaintenanceType } from '@entities/maintenance-log';

interface MaintenanceTypeBadgeProps {
  type: MaintenanceType;
}

const TYPE_CONFIG: Record<
  MaintenanceType,
  {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  }
> = {
  routine: { label: 'Bảo trì định kỳ', variant: 'default' },
  repair: { label: 'Sửa chữa', variant: 'secondary' },
  inspection: { label: 'Kiểm định', variant: 'outline' },
  emergency: { label: 'Khẩn cấp', variant: 'destructive' },
};

export function MaintenanceTypeBadge({ type }: MaintenanceTypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
