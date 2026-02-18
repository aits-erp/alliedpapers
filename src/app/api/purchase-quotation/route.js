import dbConnect from "@/lib/db";
import PurchaseQuotation from "@/models/PurchaseQuotationModel"; // Correct import
import { NextResponse } from "next/server";
import mongoose from "mongoose";

// GET: Fetch all purchase quotations
export async function GET(request) {
  try {
    await dbConnect();
    const quotations = await PurchaseQuotation.find({})
   
    return NextResponse.json({ success: true, data: quotations }, { status: 200 });
  } catch (error) {
    console.error("GET /api/purchase-quotation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quotations: " + error.message },
      { status: 500 }
    );
  }
}

// GET: Fetch a single purchase quotation by ID
export async function GET_BY_ID(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Valid quotation ID is required" },
        { status: 422 }
      );
    }
    const quotation = await PurchaseQuotation.findById(id)
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");
    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: quotation }, { status: 200 });
  } catch (error) {
    console.error("GET /api/purchase-quotation/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quotation: " + error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new purchase quotation
export async function POST(request) {
  try {
    await dbConnect();
    const body = await request.json();
    console.log("POST /api/purchase-quotation payload:", body); // Debug payload

    // Basic validation
    if (!body.supplier || !mongoose.isValidObjectId(body.supplier)) {
      return NextResponse.json(
        { success: false, error: "Valid supplier ID is required" },
        { status: 422 }
      );
    }
    if (!body.supplierName) {
      return NextResponse.json(
        { success: false, error: "Supplier name is required" },
        { status: 422 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one valid item is required" },
        { status: 422 }
      );
    }
    for (const item of body.items) {
      if (!item.item || !mongoose.isValidObjectId(item.item)) {
        return NextResponse.json(
          { success: false, error: "Valid item ID is required for each item" },
          { status: 422 }
        );
      }
    }

    const quotation = await PurchaseQuotation.create(body);
    const populatedQuotation = await PurchaseQuotation.findById(quotation._id)
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    return NextResponse.json(
      { success: true, data: populatedQuotation, message: "Purchase quotation created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/purchase-quotation error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message).join(", ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors}` },
        { status: 422 }
      );
    }
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Reference number must be unique" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create quotation: " + error.message },
      { status: 500 }
    );
  }
}

// PUT: Update an existing purchase quotation
export async function PUT(request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || body._id;

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Valid quotation ID is required" },
        { status: 422 }
      );
    }

    // Basic validation
    if (!body.supplier || !mongoose.isValidObjectId(body.supplier)) {
      return NextResponse.json(
        { success: false, error: "Valid supplier ID is required" },
        { status: 422 }
      );
    }
    if (!body.supplierName) {
      return NextResponse.json(
        { success: false, error: "Supplier name is required" },
        { status: 422 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one valid item is required" },
        { status: 422 }
      );
    }
    for (const item of body.items) {
      if (!item.item || !mongoose.isValidObjectId(item.item)) {
        return NextResponse.json(
          { success: false, error: "Valid item ID is required for each item" },
          { status: 422 }
        );
      }
    }

    const quotation = await PurchaseQuotation.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }

    const populatedQuotation = await PurchaseQuotation.findById(quotation._id)
      .populate("supplier", "supplierCode supplierName contactPerson")
      .populate("items.item", "itemCode itemName unitPrice");

    return NextResponse.json(
      { success: true, data: populatedQuotation, message: "Purchase quotation updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("PUT /api/purchase-quotation error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message).join(", ");
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors}` },
        { status: 422 }
      );
    }
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Reference number must be unique" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update quotation: " + error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a purchase quotation
export async function DELETE(request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id || !mongoose.isValidObjectId(id)) {
      return NextResponse.json(
        { success: false, error: "Valid quotation ID is required" },
        { status: 422 }
      );
    }

    const quotation = await PurchaseQuotation.findByIdAndDelete(id);

    if (!quotation) {
      return NextResponse.json(
        { success: false, error: "Quotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Purchase quotation deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/purchase-quotation error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete quotation: " + error.message },
      { status: 500 }
    );
  }
}