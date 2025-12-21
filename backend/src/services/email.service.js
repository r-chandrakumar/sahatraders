const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Email templates
const templates = {
  orderConfirmation: (order) => ({
    subject: `Order Confirmation - ${order.order_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed751a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-size: 18px; font-weight: bold; color: #ed751a; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sahaa Traders</h1>
            <p>Order Confirmation</p>
          </div>
          <div class="content">
            <h2>Thank you for your order!</h2>
            <p>Hi ${order.customer_name},</p>
            <p>Your order has been confirmed and is being processed.</p>

            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString('en-IN')}</p>

              <h4>Items:</h4>
              ${order.items.map(item => `
                <div class="item">
                  <span>${item.product_name} - ${item.variant_name} × ${item.quantity}</span>
                  <span>₹${(item.quantity * item.unit_price).toLocaleString()}</span>
                </div>
              `).join('')}

              <div style="margin-top: 15px; text-align: right;">
                <p>Subtotal: ₹${order.subtotal.toLocaleString()}</p>
                <p>Tax: ₹${order.tax_amount.toLocaleString()}</p>
                ${order.discount_amount > 0 ? `<p>Discount: -₹${order.discount_amount.toLocaleString()}</p>` : ''}
                <p>Shipping: ₹${order.shipping_charge.toLocaleString()}</p>
                <p class="total">Total: ₹${order.total_amount.toLocaleString()}</p>
              </div>
            </div>

            <div class="order-details">
              <h4>Shipping Address:</h4>
              <p>${order.shipping_address}</p>
            </div>

            <p>We'll send you another email when your order ships.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
            <p>If you have any questions, contact us at support@sahaatraders.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  orderShipped: (order, trackingInfo) => ({
    subject: `Your Order Has Shipped - ${order.order_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed751a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .tracking { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; text-align: center; }
          .tracking-number { font-size: 24px; font-weight: bold; color: #ed751a; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sahaa Traders</h1>
            <p>Your Order Has Shipped!</p>
          </div>
          <div class="content">
            <p>Hi ${order.customer_name},</p>
            <p>Great news! Your order ${order.order_number} is on its way.</p>

            ${trackingInfo ? `
            <div class="tracking">
              <p>Tracking Number:</p>
              <p class="tracking-number">${trackingInfo.tracking_number}</p>
              <p>Carrier: ${trackingInfo.carrier}</p>
            </div>
            ` : ''}

            <div class="tracking">
              <h4>Delivery Address:</h4>
              <p>${order.shipping_address}</p>
            </div>

            <p>Expected delivery within 3-5 business days.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  orderDelivered: (order) => ({
    subject: `Order Delivered - ${order.order_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Order Delivered!</h1>
          </div>
          <div class="content">
            <p>Hi ${order.customer_name},</p>
            <p>Your order ${order.order_number} has been delivered.</p>
            <p>We hope you enjoy your purchase!</p>
            <p>Thank you for shopping with Sahaa Traders.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  invoiceGenerated: (invoice, order) => ({
    subject: `Invoice ${invoice.invoice_number} - Sahaa Traders`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed751a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .invoice-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sahaa Traders</h1>
            <p>Invoice</p>
          </div>
          <div class="content">
            <p>Hi ${order.customer_name},</p>
            <p>Please find your invoice details below.</p>

            <div class="invoice-box">
              <p><strong>Invoice Number:</strong> ${invoice.invoice_number}</p>
              <p><strong>Order Number:</strong> ${order.order_number}</p>
              <p><strong>Date:</strong> ${new Date(invoice.created_at).toLocaleDateString('en-IN')}</p>
              <p><strong>Amount:</strong> ₹${invoice.total_amount.toLocaleString()}</p>
              <p><strong>Status:</strong> ${invoice.payment_status.toUpperCase()}</p>
            </div>

            <p>A PDF copy of your invoice is attached to this email.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  paymentReceived: (payment, invoice) => ({
    subject: `Payment Received - ${invoice.invoice_number}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #22c55e; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .payment-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; text-align: center; }
          .amount { font-size: 32px; font-weight: bold; color: #22c55e; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Received</h1>
          </div>
          <div class="content">
            <p>Thank you for your payment!</p>

            <div class="payment-box">
              <p>Amount Received:</p>
              <p class="amount">₹${payment.amount.toLocaleString()}</p>
              <p>Payment Method: ${payment.payment_method.replace('_', ' ').toUpperCase()}</p>
              <p>Date: ${new Date(payment.payment_date).toLocaleDateString('en-IN')}</p>
            </div>

            <p><strong>Invoice:</strong> ${invoice.invoice_number}</p>
            <p><strong>Invoice Status:</strong> ${invoice.payment_status.toUpperCase()}</p>
            ${invoice.balance_due > 0 ? `<p><strong>Balance Due:</strong> ₹${invoice.balance_due.toLocaleString()}</p>` : ''}
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  lowStockAlert: (items) => ({
    subject: 'Low Stock Alert - Sahaa Traders Admin',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .item { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ef4444; }
          .stock { color: #ef4444; font-weight: bold; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Low Stock Alert</h1>
          </div>
          <div class="content">
            <p>The following items are running low on stock:</p>

            ${items.map(item => `
              <div class="item">
                <strong>${item.product_name} - ${item.variant_name}</strong>
                <p>SKU: ${item.sku}</p>
                <p>Current Stock: <span class="stock">${item.current_stock}</span></p>
                <p>Reorder Level: ${item.reorder_level}</p>
              </div>
            `).join('')}

            <p>Please restock these items soon.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders Admin System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  enquiryReceived: (enquiry) => ({
    subject: `New Enquiry Received - ${enquiry.type.toUpperCase()}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .details { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Enquiry</h1>
            <p>${enquiry.type.toUpperCase()}</p>
          </div>
          <div class="content">
            <div class="details">
              <p><strong>Name:</strong> ${enquiry.name}</p>
              <p><strong>Phone:</strong> ${enquiry.phone}</p>
              <p><strong>Email:</strong> ${enquiry.email || 'Not provided'}</p>
              ${enquiry.product_name ? `<p><strong>Product:</strong> ${enquiry.product_name}</p>` : ''}
              <p><strong>Message:</strong></p>
              <p style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${enquiry.message}</p>
            </div>

            <p>Please respond to this enquiry at your earliest.</p>
          </div>
          <div class="footer">
            <p>Sahaa Traders Admin System</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  enquiryAutoReply: (enquiry) => ({
    subject: 'Thank you for your enquiry - Sahaa Traders',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ed751a; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Sahaa Traders</h1>
          </div>
          <div class="content">
            <p>Hi ${enquiry.name},</p>
            <p>Thank you for reaching out to us!</p>
            <p>We have received your enquiry and our team will get back to you within 24 hours.</p>

            <p><strong>Your message:</strong></p>
            <p style="background: white; padding: 15px; border-radius: 4px;">${enquiry.message}</p>

            <p>In the meantime, feel free to browse our products at <a href="https://sahaatraders.com">sahaatraders.com</a></p>
          </div>
          <div class="footer">
            <p>Sahaa Traders | Quality Groceries Since 1990</p>
            <p>Phone: +91 98765 43210 | Email: support@sahaatraders.com</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Send email function
const sendEmail = async (to, templateName, data, attachments = []) => {
  try {
    const transporter = createTransporter();
    const template = templates[templateName](data);

    const mailOptions = {
      from: `"Sahaa Traders" <${process.env.SMTP_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
      attachments,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
};

// Send to multiple recipients
const sendBulkEmail = async (recipients, templateName, data, attachments = []) => {
  const results = [];
  for (const recipient of recipients) {
    const result = await sendEmail(recipient, templateName, data, attachments);
    results.push({ recipient, ...result });
  }
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  templates,
};
