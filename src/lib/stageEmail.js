// /src/lib/stageEmail.js

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

/** Map every stage to a recipient list (or leave empty to skip) */
const stageRecipients = {
  "ETD Pending":                       ["gaurav@alliedpapers.com","vaishali@aitsind.com"],
  "ETD Confirmation from plant":       ["gaurav@alliedpapers.com"],
  "ETD notification for SC-cremika":   ["gaurav@alliedpapers.com"],
  "SC to concerned sales & customer":  ["gaurav@alliedpapers.com"],
  "Material in QC-OK/NOK":             ["gaurav@alliedpapers.com"],
  "Dispatch with qty":                 ["gaurav@alliedpapers.com"],
  "Delivered to customer":             ["gaurav@alliedpapers.com"],
};

/**
 * Send stage‑change email (no send if stage has no recipients)
 * @param {Object} order  — the Mongoose order doc (after update)
 * @param {String} oldStage — previous stage string
 */
export async function sendStageChangeEmail(order, oldStage) {
  const newStage = order.statusStages;
  if (newStage === oldStage) return; // nothing changed

  const to = stageRecipients[newStage] || [];
  if (to.length === 0) return;       // stage not mapped → skip

  const mailOptions = {
    from: `"ERP System" <${process.env.SMTP_USER}>`,
    to: to.join(","),
    subject: `Sales Order ${order.salesNumber} moved to "${newStage}"`,
    html: `
      <h3>Sales Order Stage Updated</h3>
      <p><b>Sales Order:</b> ${order.salesNumber}</p>
      <p><b>Customer:</b> ${order.customerName}</p>
      <p><b>Previous Stage:</b> ${oldStage}</p>
      <p><b>New Stage:</b> ${newStage}</p>
      <p><b>Total:</b> ₹${order.grandTotal.toFixed(2)}</p>
    `,
  };

  await transporter.sendMail(mailOptions);
}
