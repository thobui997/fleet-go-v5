import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@shared/ui';
import { formatDateTime } from '@shared/lib';

interface TicketQrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    seat_number: string;
    passenger_name: string;
    status: string;
    qr_code: string | null;
  } | null;
  tripInfo?: {
    route_name: string | null;
    departure_time: string;
    origin_station: string | null;
    destination_station: string | null;
  };
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Còn hiệu lực',
  used: 'Đã sử dụng',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export function TicketQrDialog({
  open,
  onOpenChange,
  ticket,
  tripInfo,
}: TicketQrDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md print:max-w-none print:border-0 print:p-0 print:bg-white">
        <DialogHeader className="print:hidden">
          <DialogTitle>Mã QR vé</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 p-6 print:p-8">
          {/* QR Code */}
          {ticket.qr_code && (
            <div className="rounded-lg border-4 border-primary/20 p-4 bg-white">
              <QRCodeSVG value={ticket.qr_code} size={200} />
            </div>
          )}

          {/* Ticket Details */}
          <div className="w-full space-y-3 text-sm print:space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Hành khách:</span>
              <span className="font-medium">{ticket.passenger_name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Số ghế:</span>
              <span className="font-medium">{ticket.seat_number}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Trạng thái:</span>
              <span className="font-medium">{STATUS_LABELS[ticket.status] || ticket.status}</span>
            </div>
            {tripInfo && (
              <>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tuyến:</span>
                  <span className="font-medium">{tripInfo.route_name ?? '—'}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Lộ trình:</span>
                  <span className="font-medium">
                    {tripInfo.origin_station ?? '—'} → {tripInfo.destination_station ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Giờ khởi hành:</span>
                  <span className="font-medium">{formatDateTime(tripInfo.departure_time)}</span>
                </div>
              </>
            )}
          </div>

          {/* Print Button - hidden when printing */}
          <Button onClick={handlePrint} className="print:hidden w-full">
            In vé
          </Button>
        </div>

        {/* Print-specific styles - show only QR and details when printing */}
        <style>{`
          @media print {
            .dialog-content {
              box-shadow: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
