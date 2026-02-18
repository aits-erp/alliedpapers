import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendSalesOrderEmail(toEmails, salesOrder) {
  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: toEmails.join(","),
    subject: `New Sales Order Created: ${salesOrder.salesNumber}`,
    html: `
      <h3>New Sales Order Created</h3>
      <p><strong>Customer:</strong> ${salesOrder.customerName}</p>
      <p><strong>Order Number:</strong> ${salesOrder.salesNumber}</p>
      <p><strong>Order Date:</strong> ${salesOrder.orderDate.toDateString()}</p>
      <p><strong>Grand Total:</strong> ₹${salesOrder.grandTotal.toFixed(2)}</p>
    `
  };

  await transporter.sendMail(mailOptions);
}
