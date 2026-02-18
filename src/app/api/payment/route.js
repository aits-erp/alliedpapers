import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Payment from "@/models/Payment";
import SalesInvoice from "@/models/SalesInvoice";
import PurchaseInvoice from "@/models/InvoiceModel";

export async function POST(req) {
  await dbConnect();
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paymentData = await req.json();
    const { references = [], ...restData } = paymentData;

    // Create Payment entry
    const [payment] = await Payment.create([{ ...restData, references }], { session });

    // Process all invoice references
    for (const ref of references) {
      const { invoiceId, model, paidAmount } = ref;

      let InvoiceModel;
      if (model === "SalesInvoice") {
        InvoiceModel = SalesInvoice;
      } else if (model === "PurchaseInvoice") {
        InvoiceModel = PurchaseInvoice;
      } else {
        throw new Error(`Invalid model type: ${model}`);
      }

      // Fetch the invoice using the session
      const invoice = await InvoiceModel.findById(invoiceId).session(session);
      if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

      // Update amounts
      invoice.paidAmount += paidAmount;
      invoice.remainingAmount = invoice.grandTotal - invoice.paidAmount;

      // Update paymentStatus
      if (invoice.remainingAmount <= 0) {
        invoice.paymentStatus = "Paid";
        invoice.remainingAmount = 0; // Avoid negative values
      } else if (invoice.paidAmount > 0) {
        invoice.paymentStatus = "Partial";
      } else {
        invoice.paymentStatus = "Pending";
      }

      await invoice.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    return new Response(
      JSON.stringify({ message: "Payment recorded", paymentId: payment._id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Only abort the transaction if it is still active.
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error("Error in payment API:", error);
    return new Response(
      JSON.stringify({ message: "Payment failed", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
