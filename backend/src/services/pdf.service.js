const PDFDocument = require('pdfkit');

// Helper function to format currency
const formatCurrency = (amount) => `Rs. ${amount.toLocaleString('en-IN')}`;

// Generate Invoice PDF
const generateInvoicePDF = (invoice, order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(24).fillColor('#ed751a').text('SAHAA TRADERS', 50, 50);
      doc.fontSize(10).fillColor('#666')
        .text('Quality Groceries Since 1990', 50, 80)
        .text('123 Market Street, Jaipur, Rajasthan - 302001', 50, 95)
        .text('Phone: +91 98765 43210 | Email: billing@sahaatraders.com', 50, 110)
        .text('GSTIN: 08ABCDE1234F1Z5', 50, 125);

      // Invoice Title
      doc.fontSize(20).fillColor('#333').text('TAX INVOICE', 400, 50, { align: 'right' });

      // Invoice Details Box
      doc.rect(350, 80, 200, 80).stroke('#ddd');
      doc.fontSize(10).fillColor('#666')
        .text('Invoice Number:', 360, 90)
        .text('Invoice Date:', 360, 110)
        .text('Due Date:', 360, 130)
        .text('Order Number:', 360, 150);

      doc.fillColor('#333')
        .text(invoice.invoice_number, 450, 90)
        .text(new Date(invoice.created_at).toLocaleDateString('en-IN'), 450, 110)
        .text(new Date(invoice.due_date || Date.now()).toLocaleDateString('en-IN'), 450, 130)
        .text(order.order_number, 450, 150);

      // Divider
      doc.moveTo(50, 180).lineTo(550, 180).stroke('#ed751a');

      // Bill To / Ship To
      const yPos = 200;
      doc.fontSize(12).fillColor('#ed751a').text('Bill To:', 50, yPos);
      doc.fontSize(10).fillColor('#333')
        .text(order.customer_name, 50, yPos + 20)
        .text(order.billing_address || order.shipping_address, 50, yPos + 35, { width: 200 });

      doc.fontSize(12).fillColor('#ed751a').text('Ship To:', 300, yPos);
      doc.fontSize(10).fillColor('#333')
        .text(order.customer_name, 300, yPos + 20)
        .text(order.shipping_address, 300, yPos + 35, { width: 200 });

      // Items Table Header
      const tableTop = 310;
      doc.rect(50, tableTop, 500, 25).fill('#f5f5f5');

      doc.fontSize(10).fillColor('#333')
        .text('#', 60, tableTop + 8)
        .text('Description', 80, tableTop + 8)
        .text('HSN', 260, tableTop + 8)
        .text('Qty', 310, tableTop + 8)
        .text('Rate', 350, tableTop + 8)
        .text('Tax', 410, tableTop + 8)
        .text('Amount', 470, tableTop + 8);

      // Items
      let itemY = tableTop + 30;
      const items = order.items || [];

      items.forEach((item, index) => {
        const itemTotal = item.quantity * item.unit_price;
        const taxAmount = itemTotal * (item.tax_rate / 100);

        doc.fontSize(9).fillColor('#333')
          .text(index + 1, 60, itemY)
          .text(`${item.product_name}\n${item.variant_name}`, 80, itemY, { width: 170 })
          .text(item.hsn_code || '-', 260, itemY)
          .text(item.quantity, 310, itemY)
          .text(formatCurrency(item.unit_price), 350, itemY)
          .text(`${item.tax_rate}%`, 410, itemY)
          .text(formatCurrency(itemTotal + taxAmount), 470, itemY);

        itemY += 35;

        // Draw line
        doc.moveTo(50, itemY - 5).lineTo(550, itemY - 5).stroke('#eee');
      });

      // Totals
      const totalsY = Math.max(itemY + 20, 450);

      doc.rect(350, totalsY, 200, 120).stroke('#ddd');

      doc.fontSize(10).fillColor('#666')
        .text('Subtotal:', 360, totalsY + 10)
        .text('Tax (GST):', 360, totalsY + 30)
        .text('Discount:', 360, totalsY + 50)
        .text('Shipping:', 360, totalsY + 70);

      doc.fontSize(12).fillColor('#333').text('TOTAL:', 360, totalsY + 95);

      doc.fontSize(10).fillColor('#333')
        .text(formatCurrency(order.subtotal), 480, totalsY + 10, { align: 'right', width: 60 })
        .text(formatCurrency(order.tax_amount), 480, totalsY + 30, { align: 'right', width: 60 })
        .text(`-${formatCurrency(order.discount_amount || 0)}`, 480, totalsY + 50, { align: 'right', width: 60 })
        .text(formatCurrency(order.shipping_charge || 0), 480, totalsY + 70, { align: 'right', width: 60 });

      doc.fontSize(12).fillColor('#ed751a')
        .text(formatCurrency(invoice.total_amount), 480, totalsY + 95, { align: 'right', width: 60 });

      // Payment Status
      const statusY = totalsY + 130;
      doc.rect(350, statusY, 200, 40).fill(invoice.payment_status === 'paid' ? '#dcfce7' : '#fef3c7');
      doc.fontSize(10)
        .fillColor(invoice.payment_status === 'paid' ? '#15803d' : '#b45309')
        .text(`Payment Status: ${invoice.payment_status.toUpperCase()}`, 360, statusY + 8);

      if (invoice.payment_status !== 'paid') {
        doc.text(`Balance Due: ${formatCurrency(invoice.total_amount - (invoice.paid_amount || 0))}`, 360, statusY + 23);
      }

      // Amount in Words
      doc.fontSize(10).fillColor('#666')
        .text('Amount in Words:', 50, totalsY + 10)
        .fillColor('#333')
        .text(numberToWords(invoice.total_amount), 50, totalsY + 25, { width: 280 });

      // Bank Details
      const bankY = totalsY + 80;
      doc.fontSize(10).fillColor('#ed751a').text('Bank Details:', 50, bankY);
      doc.fontSize(9).fillColor('#333')
        .text('Bank: State Bank of India', 50, bankY + 15)
        .text('Account Name: Sahaa Traders', 50, bankY + 30)
        .text('Account No: 1234567890', 50, bankY + 45)
        .text('IFSC: SBIN0001234', 50, bankY + 60);

      // Footer
      const footerY = 750;
      doc.moveTo(50, footerY).lineTo(550, footerY).stroke('#ddd');

      doc.fontSize(8).fillColor('#666')
        .text('Terms & Conditions:', 50, footerY + 10)
        .text('1. Goods once sold will not be taken back.', 50, footerY + 22)
        .text('2. Payment due within 30 days of invoice date.', 50, footerY + 34)
        .text('3. Interest @18% p.a. will be charged on delayed payments.', 50, footerY + 46);

      doc.fontSize(10).fillColor('#333')
        .text('For Sahaa Traders', 450, footerY + 10)
        .text('Authorized Signatory', 450, footerY + 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate Purchase Order PDF
const generatePurchaseOrderPDF = (po) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(24).fillColor('#ed751a').text('SAHAA TRADERS', 50, 50);
      doc.fontSize(10).fillColor('#666')
        .text('Quality Groceries Since 1990', 50, 80)
        .text('123 Market Street, Jaipur, Rajasthan - 302001', 50, 95);

      // PO Title
      doc.fontSize(20).fillColor('#333').text('PURCHASE ORDER', 350, 50, { align: 'right' });

      // PO Details
      doc.rect(350, 80, 200, 60).stroke('#ddd');
      doc.fontSize(10).fillColor('#666')
        .text('PO Number:', 360, 90)
        .text('Date:', 360, 110)
        .text('Expected:', 360, 130);

      doc.fillColor('#333')
        .text(po.po_number, 450, 90)
        .text(new Date(po.created_at).toLocaleDateString('en-IN'), 450, 110)
        .text(po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN') : '-', 450, 130);

      // Divider
      doc.moveTo(50, 160).lineTo(550, 160).stroke('#ed751a');

      // Supplier Details
      doc.fontSize(12).fillColor('#ed751a').text('Supplier:', 50, 180);
      doc.fontSize(10).fillColor('#333')
        .text(po.supplier_name, 50, 200)
        .text(po.supplier_address || '', 50, 215, { width: 200 })
        .text(`Phone: ${po.supplier_phone || '-'}`, 50, 245)
        .text(`Email: ${po.supplier_email || '-'}`, 50, 260);

      // Ship To
      doc.fontSize(12).fillColor('#ed751a').text('Ship To:', 300, 180);
      doc.fontSize(10).fillColor('#333')
        .text('Sahaa Traders', 300, 200)
        .text('123 Market Street', 300, 215)
        .text('Jaipur, Rajasthan - 302001', 300, 230);

      // Items Table
      const tableTop = 300;
      doc.rect(50, tableTop, 500, 25).fill('#f5f5f5');

      doc.fontSize(10).fillColor('#333')
        .text('#', 60, tableTop + 8)
        .text('Product / Variant', 90, tableTop + 8)
        .text('SKU', 280, tableTop + 8)
        .text('Qty', 350, tableTop + 8)
        .text('Unit Price', 400, tableTop + 8)
        .text('Total', 480, tableTop + 8);

      let itemY = tableTop + 30;
      const items = po.items || [];

      items.forEach((item, index) => {
        const total = item.quantity * item.unit_price;

        doc.fontSize(9).fillColor('#333')
          .text(index + 1, 60, itemY)
          .text(`${item.product_name}\n${item.variant_name}`, 90, itemY, { width: 180 })
          .text(item.sku || '-', 280, itemY)
          .text(item.quantity, 350, itemY)
          .text(formatCurrency(item.unit_price), 400, itemY)
          .text(formatCurrency(total), 480, itemY);

        itemY += 35;
        doc.moveTo(50, itemY - 5).lineTo(550, itemY - 5).stroke('#eee');
      });

      // Total
      const totalY = Math.max(itemY + 20, 500);
      doc.rect(350, totalY, 200, 50).stroke('#ddd');

      doc.fontSize(10).fillColor('#666')
        .text('Subtotal:', 360, totalY + 10)
        .text('TOTAL:', 360, totalY + 30);

      doc.fillColor('#333')
        .text(formatCurrency(po.total_amount), 480, totalY + 10, { align: 'right', width: 60 });

      doc.fontSize(12).fillColor('#ed751a')
        .text(formatCurrency(po.total_amount), 480, totalY + 30, { align: 'right', width: 60 });

      // Notes
      if (po.notes) {
        doc.fontSize(10).fillColor('#666').text('Notes:', 50, totalY + 10);
        doc.fillColor('#333').text(po.notes, 50, totalY + 25, { width: 280 });
      }

      // Footer
      const footerY = 700;
      doc.moveTo(50, footerY).lineTo(550, footerY).stroke('#ddd');

      doc.fontSize(8).fillColor('#666')
        .text('Terms & Conditions:', 50, footerY + 10)
        .text('1. Please confirm receipt of this PO within 24 hours.', 50, footerY + 22)
        .text('2. Delivery should include packing slip with PO reference.', 50, footerY + 34)
        .text('3. Quality inspection will be done on receipt.', 50, footerY + 46);

      doc.fontSize(10).fillColor('#333')
        .text('For Sahaa Traders', 450, footerY + 10)
        .text('Purchase Manager', 450, footerY + 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Number to words converter for Indian numbering
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

  if (num === 0) return 'Zero Rupees Only';

  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };

  const integer = Math.floor(num);
  const decimal = Math.round((num - integer) * 100);

  let words = '';

  if (integer >= 10000000) {
    words += convertLessThanThousand(Math.floor(integer / 10000000)) + ' Crore ';
    integer %= 10000000;
  }

  if (integer >= 100000) {
    words += convertLessThanThousand(Math.floor(integer / 100000)) + ' Lakh ';
    integer %= 100000;
  }

  if (integer >= 1000) {
    words += convertLessThanThousand(Math.floor(integer / 1000)) + ' Thousand ';
    integer %= 1000;
  }

  if (integer > 0) {
    words += convertLessThanThousand(integer);
  }

  words += ' Rupees';

  if (decimal > 0) {
    words += ' and ' + convertLessThanThousand(decimal) + ' Paise';
  }

  return words.trim() + ' Only';
}

module.exports = {
  generateInvoicePDF,
  generatePurchaseOrderPDF,
};
