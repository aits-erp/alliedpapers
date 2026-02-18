import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";
import Supplier from "@/models/SupplierModels"
import { NextResponse } from "next/server";




export async function POST(req) {
  await dbConnect();
  try {
    const data = await req.json();
    console.log("Received Suppliers data:", data);

    // Validate required fields
    if (!data.supplierCode || !data.supplierName ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const suppliers = await Supplier.create(data);
    return NextResponse.json(suppliers, { status: 201 });
  } catch (error) {
    console.error("Error creating Suppliers:", error);
    return NextResponse.json(
      { error: error.message || "Error creating Suppliers" },
      { status: 400 }
    );
  }
}


export async function GET() {
  await dbConnect();
  try {
    const suppliers = await Supplier.find({});
    return NextResponse.json(suppliers, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error fetching Suppliers" }, { status: 400 });
  }
}