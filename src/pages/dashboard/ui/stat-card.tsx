import { type LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading = false,
  error = false,
  onRetry,
}: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : error ? (
          <div className="space-y-1">
            <p className="text-sm text-destructive">Không thể tải dữ liệu</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-xs text-primary hover:underline"
              >
                Thử lại
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
