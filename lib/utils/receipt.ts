import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Condominium, Building, Unit, Expense, ExpenseEntry, PaymentMethod } from "@/lib/types";

interface ReceiptData {
  condominium: Condominium;
  building?: Building;
  unit?: Unit;
  expense: Expense;
  entry: ExpenseEntry;
  paymentMethod?: PaymentMethod | null;
}

function formatDate(dateString?: string | null): string {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("es-VE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function generatePaymentReceipt(data: ReceiptData): void {
  const { condominium, building, unit, expense, entry, paymentMethod } = data;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(24, 24, 27);
  doc.text("RECIBO DE PAGO", pageWidth - margin, y, { align: "right" });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Recibo #${entry.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, y + 16, {
    align: "right",
  });
  doc.text(`Fecha de emisión: ${formatDate(new Date().toISOString())}`, pageWidth - margin, y + 30, {
    align: "right",
  });

  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(condominium.name, margin, y + 8);

  y += 60;

  // Condominium info
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(condominium.address, margin, y);
  y += 18;

  // Resident / Unit info box
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", textColor: [39, 39, 39] } },
    body: [
      ["Edificio:", building?.name ?? "—"],
      ["Unidad:", unit ? `Unidad ${unit.num}` : "—"],
      ["Propietario:", unit?.owner ? `ID ${unit.owner.slice(0, 8)}` : "—"],
      ["Fecha de pago:", formatDate(entry.paid_at)],
      ["Método de pago:", paymentMethod?.name ?? "—"],
      ["Referencia:", entry.payment_reference ?? "—"],
    ],
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  y = finalY + 24;

  // Expense info
  doc.setFontSize(12);
  doc.setTextColor(24, 24, 27);
  doc.setFont("helvetica", "bold");
  doc.text(expense.title, margin, y);
  doc.setFont("helvetica", "normal");
  y += 16;

  if (expense.description) {
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const splitDescription = doc.splitTextToSize(expense.description, pageWidth - margin * 2);
    doc.text(splitDescription, margin, y);
    y += splitDescription.length * 11 + 8;
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Vencimiento: ${formatDate(expense.due_date)}`, margin, y);
  if (expense.period_start && expense.period_end) {
    doc.text(
      `Período: ${formatDate(expense.period_start)} — ${formatDate(expense.period_end)}`,
      margin,
      y + 12
    );
  }
  y += 28;

  // Items table
  const items = expense.items && expense.items.length > 0 ? expense.items : [
    { id: "default", description: expense.title, amount: expense.amount },
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    head: [["Concepto", "Monto"]],
    body: [
      ...items.map((item) => [item.description, formatCurrency(item.amount)]),
      ["TOTAL", formatCurrency(expense.amount)],
    ],
    didParseCell: (hookData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataRow = hookData.row as any;
      if (dataRow.index === items.length) {
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.fillColor = [244, 244, 245];
        hookData.cell.styles.textColor = [24, 24, 27];
      }
    },
  });

  const itemsFinalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Footer note
  const footerY = itemsFinalY + 30;
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Este recibo es comprobante del pago registrado en el sistema.", margin, footerY);
  doc.text("Condominio Gestión - Gestión transparente de tu comunidad.", margin, footerY + 12);

  doc.save(`recibo-${entry.id.slice(0, 8)}.pdf`);
}
