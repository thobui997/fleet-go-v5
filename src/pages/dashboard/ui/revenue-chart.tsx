import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@shared/lib/format-currency';
import type { RevenueDataPoint } from '../model/types';

interface RevenueChartProps {
  data: RevenueDataPoint[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
}

/**
 * Y-axis tick formatter using abbreviated format.
 * Converts large numbers to readable "tr" (million) or "k" (thousand) suffixes.
 */
function formatYAxis(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}tr`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return `${value}`;
}

export function RevenueChart({ data, loading, error, onRetry }: RevenueChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
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
          <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
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

  if (!data || data.length === 0 || data.every((d) => d.amount === 0)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
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
        <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']}
              labelFormatter={(label) => {
                const point = data.find((d) => d.date === label);
                return point ? point.fullDate : label;
              }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
