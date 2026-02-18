import dbConnect from "@/lib/db.js";
import SalesQuotation from "@/models/SalesQuotationModel";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();
    console.log("Received payload:", body);
    const { customer } = body;
    if (!customer || !mongoose.Types.ObjectId.isValid(customer)) {
      return NextResponse.json({ success: false, error: "Invalid or missing customer ID" }, { status: 400 });
    }
    const salesQuotation = new SalesQuotation(body);
    await salesQuotation.save();
    return NextResponse.json({ success: true, data: salesQuotation }, { status: 201 });
  } catch (error) {
    console.error("Error creating sales quotation:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
export async function GET(request) {
  await dbConnect();
  try {
    const quotations = await SalesQuotation.find({});
    return new Response(JSON.stringify({ success: true, data: quotations }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("GET error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
