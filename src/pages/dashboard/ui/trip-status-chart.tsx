import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { StatusCount } from '../model/types';

interface TripStatusChartProps {
  data: StatusCount[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

// Color map for trip statuses
const TRIP_STATUS_COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#f59e0b',
  completed: '#22c55e',
  cancelled: '#ef4444',
};

// Vietnamese labels for trip statuses
const TRIP_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Lên lịch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function TripStatusChart({ data, loading, error, onRetry }: TripStatusChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái chuyến đi</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái chuyến đi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Không thể tải dữ liệu
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state guard
  if (!data || data.length === 0 || data.reduce((sum, d) => sum + d.count, 0) === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái chuyến đi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-sm text-muted-foreground">Không có dữ liệu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trạng thái chuyến đi</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="count"
              nameKey="status"
            >
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.status}`}
                  fill={TRIP_STATUS_COLORS[entry.status] ?? '#6b7280'}
                />
              ))}
            </Pie>
            <Legend
              formatter={(status) => TRIP_STATUS_LABELS[status] || status}
            />
            <Tooltip
              formatter={(value: any) => [`${value} chuyến`, 'Số lượng']}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
