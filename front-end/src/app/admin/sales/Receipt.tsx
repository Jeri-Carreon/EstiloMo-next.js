import type { Sale } from "./page";

export const receiptPrintStyles = `
  .receipt-print-container { display: none; }
`;

export const receiptPrintPageStyle = `
  @page { size: 80mm auto; margin: 3.5mm; }
  html, body { width: 80mm; margin: 0; padding: 0; }
  .print-receipt {
    box-sizing: border-box;
    width: 73mm;
    max-width: none !important;
    color: #000;
    font-family: Arial, sans-serif;
    font-size: 9pt;
    line-height: 1.3;
  }
`;

type ReceiptProps = {
  sale: Sale | null;
  formatPeso: (value: number) => string;
  formatDate: (value: string | Date) => string;
  getSaleStatusLabel: (status: Sale["status"]) => string;
  getAppointmentBarberName: (sale: Pick<Sale, "appointments">, serviceName: string) => string;
  vatRate: number;
};

function minutesToTime(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function Receipt({ sale, formatPeso, formatDate, getSaleStatusLabel, getAppointmentBarberName, vatRate }: ReceiptProps) {
  if (!sale) return null;

  const appointment = sale.appointments[0];
  const appointmentDate = appointment ? formatDate(appointment.appointmentDate) : formatDate(sale.createdAt);
  const appointmentTime = appointment ? `${minutesToTime(appointment.startMinutes)} - ${minutesToTime(appointment.endMinutes)}` : "—";
  const vatExempt = Boolean(sale.vatExempt || sale.payment?.vatExempt || sale.pwdDiscount || sale.payment?.pwdDiscount);
  const saleVatRate = Number(sale.vatRate ?? sale.payment?.vatRate ?? vatRate);
  const grossTotal = Number(sale.grossTotal ?? sale.totalAmount ?? 0);
  const vatAmount = Number(sale.vatAmount || sale.payment?.vatAmount || 0);
  const discount = Math.max(Number(sale.discount || 0), Number(sale.payment?.discount || 0));

  return (
    <>
      <style>{receiptPrintStyles}</style>
      <article className="print-receipt">
        <header style={{ textAlign: "center", marginBottom: 16 }}>
          <strong style={{ display: "block", fontSize: 16 }}>THE BARBS BRO</strong>
          <div>Unit F, Saranay Homes,</div><div>Congressional Rd. cor. Malapitan Rd.</div><div>Caloocan City</div>
          <br /><div>Contact No.</div><div>09178884017</div>
        </header>
        <ReceiptDivider />
        <section className="print-receipt__section" style={{ margin: "12px 0" }}>
          <ReceiptRow label="Transaction Number" value={sale.saleCode} />
          <ReceiptRow label="Customer ID" value={sale.customer.customerCode} />
          <ReceiptRow label="Customer Name" value={sale.customer.name} />
          <ReceiptRow label="Barber" value={sale.barber?.name || "—"} />
          <ReceiptRow label="Appointment Date" value={appointmentDate} />
          <ReceiptRow label="Appointment Time" value={appointmentTime} />
          <ReceiptRow label="Payment Type" value={sale.payment?.method || "—"} />
          <ReceiptRow label="Payment Status" value={sale.payment?.status || getSaleStatusLabel(sale.status)} />
        </section>
        <ReceiptDivider /><strong style={{ display: "block", margin: "10px 0" }}>SERVICES</strong><ReceiptDivider />
        <section>{sale.items.map((item) => {
          const barber = getAppointmentBarberName(sale, item.serviceName) || sale.barber?.name;
          return <div className="print-receipt__section" key={item.id} style={{ margin: "12px 0" }}>
            <strong>{item.serviceName}</strong>{barber && <div>Barber: {barber}</div>}<div>Qty: {item.quantity}</div>
            {item.quantity > 1 && <div>{formatPeso(item.price)} each</div>}<div>{formatPeso(item.subtotal)}</div>
          </div>;
        })}</section>
        <ReceiptDivider /><strong style={{ display: "block", margin: "10px 0" }}>SUMMARY</strong><ReceiptDivider />
        <section className="print-receipt__section" style={{ margin: "12px 0" }}>
          <ReceiptRow label="Subtotal" value={formatPeso(Number(sale.subtotal || 0))} />
          <ReceiptRow label={vatExempt ? "VAT (Exempt)" : `VAT (${saleVatRate * 100}%)`} value={vatExempt ? "VAT Exempt" : formatPeso(vatAmount)} />
          <ReceiptRow label="Downpayment" value={formatPeso(sale.payment?.downPayment || 0)} />
          <ReceiptRow label="Discount" value={formatPeso(discount)} />
          <ReceiptRow label="Total Payment" value={formatPeso(sale.source === "BOOKING" ? Math.max(grossTotal - Number(sale.payment?.downPayment || 0), 0) : sale.totalAmount)} />
          <ReceiptRow label="Mode of Payment" value={sale.payment?.method || "—"} />
          <ReceiptRow label="Status" value={getSaleStatusLabel(sale.status)} />
        </section>
        <ReceiptDivider /><footer style={{ textAlign: "center", marginTop: 14 }}><div>Thank you for choosing The Barbs Bro!</div><div>Please keep this receipt for your records.</div></footer>
      </article>
    </>
  );
}

function ReceiptDivider() { return <div style={{ borderTop: "1px dashed #000" }} />; }

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 5 }}><span>{label}</span><span style={{ textAlign: "right" }}>{value}</span></div>;
}
