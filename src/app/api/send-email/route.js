import { NextResponse } from "next/server";
import { sendSalesOrderEmail } from "@/lib/mailer";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, orderId } = body;

    if (!email || !orderId) {
      return NextResponse.json({ success: false, message: "Email and Order ID are required" }, { status: 400 });
    }

    await dbConnect();
    const order = await SalesOrder.findById(orderId);

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    await sendSalesOrderEmail([email], order);

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
