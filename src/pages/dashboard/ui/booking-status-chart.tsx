import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { StatusCount } from '../model/types';

interface BookingStatusChartProps {
  data: StatusCount[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

// Color map for booking statuses
const BOOKING_STATUS_COLORS: Record<string, string> = {
  pending: '#eab308',
  confirmed: '#3b82f6',
  cancelled: '#ef4444',
  completed: '#22c55e',
  refunded: '#6b7280',
};

// Vietnamese labels for booking statuses
const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  refunded: 'Đã hoàn tiền',
};

export function BookingStatusChart({ data, loading, error, onRetry }: BookingStatusChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái đặt vé</CardTitle>
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
          <CardTitle>Trạng thái đặt vé</CardTitle>
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
          <CardTitle>Trạng thái đặt vé</CardTitle>
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
        <CardTitle>Trạng thái đặt vé</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="status"
              tickFormatter={(status) => BOOKING_STATUS_LABELS[status] || status}
              tick={{ fontSize: 12 }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: any) => [`${value} vé`, 'Số lượng']}
            />
            <Bar dataKey="count">
              {data.map((entry) => (
                <Cell
                  key={`cell-${entry.status}`}
                  fill={BOOKING_STATUS_COLORS[entry.status] ?? '#6b7280'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
