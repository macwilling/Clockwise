import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import type { Invoice, Client, UserSettings } from '../contexts/DataContext';

interface GenerateInvoicePDFOptions {
  invoice: Invoice;
  client: Client;
  companyInfo?: {
    name: string;
    address: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  settings?: UserSettings | null;
}

// Helper function to convert hex color to RGB tuple
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

export const generateInvoicePDF = ({
  invoice,
  client,
  companyInfo = {
    name: 'Your Company Name',
    address: '123 Business St.\nCity, State 12345',
    phone: '(555) 123-4567',
    email: 'billing@yourcompany.com',
    website: 'www.yourcompany.com',
  },
  settings = null,
}: GenerateInvoicePDFOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Use settings or fallback to defaults
  const headerColor = settings?.pdfHeaderColor ? hexToRgb(settings.pdfHeaderColor) : [15, 40, 71]; // #0F2847
  const accentColor = settings?.pdfAccentColor ? hexToRgb(settings.pdfAccentColor) : [0, 163, 224]; // #00a3e0
  const darkGray: [number, number, number] = [64, 64, 64];
  const mediumGray: [number, number, number] = [107, 114, 128];

  // Labels from settings
  const invoiceTitle = settings?.pdfInvoiceTitle || 'INVOICE';
  const billToLabel = settings?.pdfBillToLabel || 'BILL TO';
  const dateIssuedLabel = settings?.pdfDateIssuedLabel || 'Date Issued';
  const dueDateLabel = settings?.pdfDueDateLabel || 'Due Date';
  const dateColumnLabel = settings?.pdfDateColumnLabel || 'Date';
  const descriptionColumnLabel = settings?.pdfDescriptionColumnLabel || 'Description';
  const hoursColumnLabel = settings?.pdfHoursColumnLabel || 'Hours';
  const rateColumnLabel = settings?.pdfRateColumnLabel || 'Rate';
  const amountColumnLabel = settings?.pdfAmountColumnLabel || 'Amount';
  const subtotalLabel = settings?.pdfSubtotalLabel || 'Subtotal';
  const totalLabel = settings?.pdfTotalLabel || 'Total';
  const footerText = settings?.pdfFooterText || 'Thank you for your business';

  // Margins: 0.25 inch (18 points) all around - consistent
  const margin = 18;
  let y = margin;

  // Header - Company name and contact info
  doc.setTextColor(...headerColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(companyInfo.name, margin, y);

  y += 6;
  doc.setTextColor(...darkGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const companyLines = companyInfo.address.split('\n');
  companyLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });
  
  if (companyInfo.phone) {
    doc.text(companyInfo.phone, margin, y);
    y += 4;
  }
  
  if (companyInfo.email) {
    doc.text(companyInfo.email, margin, y);
    y += 4;
  }
  
  if (companyInfo.website) {
    doc.text(companyInfo.website, margin, y);
  }

  // Invoice title and number - right side
  let rightY = margin;
  doc.setTextColor(...headerColor);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(invoiceTitle, pageWidth - margin, rightY, { align: 'right' });

  rightY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...accentColor);
  doc.text(invoice.invoiceNumber, pageWidth - margin, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mediumGray);
  doc.text(dateIssuedLabel, pageWidth - margin, rightY, { align: 'right' });
  rightY += 4;
  doc.setTextColor(...darkGray);
  doc.text(format(parseISO(invoice.dateIssued), 'MMM dd, yyyy'), pageWidth - margin, rightY, { align: 'right' });

  rightY += 7;
  doc.setTextColor(...mediumGray);
  doc.text(dueDateLabel, pageWidth - margin, rightY, { align: 'right' });
  rightY += 4;
  
  const isOverdue = new Date() > parseISO(invoice.dueDate) && invoice.status !== 'paid';
  doc.setTextColor(isOverdue ? 220 : darkGray[0], isOverdue ? 38 : darkGray[1], isOverdue ? 38 : darkGray[2]);
  doc.text(format(parseISO(invoice.dueDate), 'MMM dd, yyyy'), pageWidth - margin, rightY, { align: 'right' });

  // Divider line
  y = Math.max(y, rightY) + 12;
  doc.setDrawColor(...accentColor);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  // Bill To section
  y += 10;
  doc.setTextColor(...accentColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(billToLabel, margin, y);

  y += 5;
  doc.setTextColor(...headerColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(client.name, margin, y);

  y += 5;
  doc.setTextColor(...darkGray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${client.billingFirstName} ${client.billingLastName}`, margin, y);

  if (client.addressStreet) {
    y += 4;
    doc.text(client.addressStreet, margin, y);
  }
  if (client.addressLine2) {
    y += 4;
    doc.text(client.addressLine2, margin, y);
  }
  if (client.addressCity || client.addressState || client.addressZip) {
    y += 4;
    const cityStateZip = [client.addressCity, client.addressState, client.addressZip]
      .filter(Boolean)
      .join(', ');
    doc.text(cityStateZip, margin, y);
  }
  
  if (client.billingEmail) {
    y += 4;
    doc.setTextColor(...mediumGray);
    doc.setFontSize(8);
    doc.text(client.billingEmail, margin, y);
  }

  // Line items table
  y += 14;

  // Build table data - simple chronological list
  const tableData = invoice.lineItems.map((item) => [
    format(parseISO(item.date), 'MM/dd/yyyy'),
    item.description,
    item.hours.toFixed(2),
    `$${item.rate.toFixed(2)}`,
    `$${item.subtotal.toFixed(2)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [[dateColumnLabel, descriptionColumnLabel, hoursColumnLabel, rateColumnLabel, amountColumnLabel]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: headerColor,
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
    },
    bodyStyles: {
      textColor: darkGray,
      fontSize: 9,
      cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto', halign: 'right' },
      3: { cellWidth: 'auto', halign: 'right' },
      4: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    margin: { left: margin, right: margin },
    tableWidth: 'auto',
    didParseCell: function(data) {
      // Align header cells to match their column data
      if (data.section === 'head') {
        if (data.column.index === 2 || data.column.index === 3 || data.column.index === 4) {
          data.cell.styles.halign = 'right';
        }
      }
    },
  });

  // Calculate totals position
  let currentY = (doc as any).lastAutoTable.finalY + 12;

  // Totals section
  const totalsX = pageWidth - margin - 60;
  let totalsY = currentY;

  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text(subtotalLabel, totalsX, totalsY);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });

  totalsY += 8;
  doc.setDrawColor(...headerColor);
  doc.setLineWidth(0.5);
  doc.line(totalsX, totalsY, pageWidth - margin, totalsY);

  totalsY += 7;
  doc.setFontSize(12);
  doc.setTextColor(...headerColor);
  doc.setFont('helvetica', 'bold');
  doc.text(totalLabel, totalsX, totalsY);
  doc.text(`$${invoice.total.toFixed(2)}`, pageWidth - margin, totalsY, { align: 'right' });

  currentY = totalsY + 12;

  // Payment Instructions (if enabled and provided)
  if (settings?.pdfShowPaymentInstructions && settings?.pdfPaymentInstructions) {
    const paymentLines = settings.pdfPaymentInstructions.split('\n');
    
    // Check if we have enough space, otherwise add new page
    const neededSpace = (paymentLines.length * 4) + 15;
    if (currentY + neededSpace > pageHeight - margin - 15) {
      doc.addPage();
      currentY = margin;
    }

    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(...headerColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Instructions', margin, currentY);
    
    currentY += 5;
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    paymentLines.forEach((line) => {
      doc.text(line, margin, currentY);
      currentY += 4;
    });
    
    currentY += 4;
  }

  // Terms & Conditions (if enabled and provided)
  if (settings?.pdfShowTerms && settings?.pdfTerms) {
    const termsLines = settings.pdfTerms.split('\n');
    
    // Check if we have enough space, otherwise add new page
    const neededSpace = (termsLines.length * 4) + 15;
    if (currentY + neededSpace > pageHeight - margin - 15) {
      doc.addPage();
      currentY = margin;
    }

    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(...headerColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions', margin, currentY);
    
    currentY += 5;
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'normal');
    termsLines.forEach((line) => {
      doc.text(line, margin, currentY);
      currentY += 4;
    });
  }

  // Footer
  const footerY = pageHeight - margin;
  doc.setFontSize(8);
  doc.setTextColor(...mediumGray);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });

  return doc;
};

export const downloadInvoicePDF = (options: GenerateInvoicePDFOptions) => {
  const doc = generateInvoicePDF(options);
  doc.save(`${options.invoice.invoiceNumber}.pdf`);
};

export const getInvoicePDFBlob = (options: GenerateInvoicePDFOptions): Blob => {
  const doc = generateInvoicePDF(options);
  return doc.output('blob');
};
