import dbConnect from "@/lib/db";
import SalesQuotation from "@/models/SalesQuotationModel";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id } = params; // No await needed
    const quotation = await SalesQuotation.findById(id)
      // .populate("customer", "_id customerCode customerName contactPersonName")
      // .populate("items.item", "_id itemCode itemName")
      // .populate("items.warehouse", "_id warehouseName warehouseCode");
    if (!quotation) {
      return NextResponse.json({ success: false, error: "Sales Quotation not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: quotation }, { status: 200 });
  } catch (error) {
    console.error("Error fetching sales quotation:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();
    console.log("Received PUT payload:", body); // Log payload
    const { customer } = body;
    if (!customer || !mongoose.Types.ObjectId.isValid(customer)) {
      return NextResponse.json({ success: false, error: "Invalid or missing customer ID" }, { status: 400 });
    }
    const quotation = await SalesQuotation.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });
    if (!quotation) {
      return NextResponse.json({ success: false, error: "Sales Quotation not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: quotation }, { status: 200 });
  } catch (error) {
    console.error("Error updating sales quotation:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { id } = params; // No await needed
    const result = await SalesQuotation.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Sales Quotation not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} }, { status: 200 });
  } catch (error) {
    console.error("Error deleting sales quotation:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}





// import dbConnect from "@/lib/db";
// import SalesQuotation from "@/models/SalesQuotationModel";

// export async function GET(request, { params }) {
//   await dbConnect();
//   const { id } = await params;
//   try {
//     const quotation = await SalesQuotation.findById(id);
//     if (!quotation) {
//       return new Response(JSON.stringify({ success: false, error: "Not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(JSON.stringify({ success: true, data: quotation }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     return new Response(JSON.stringify({ success: false, error: error.message }), {
//       status: 400,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }


// export async function PUT(request, { params }) {
//   await dbConnect();
//   try {
//     const { id } = params;
//     const body = await request.json();
//     const quotation = await SalesQuotation.findByIdAndUpdate(id, body, {
//       new: true,
//       runValidators: true,
//     });
//     if (!quotation) {
//       return new Response(
//         JSON.stringify({ success: false, error: "Not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }
//     return new Response(
//       JSON.stringify({ success: true, data: quotation }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     return new Response(
//       JSON.stringify({ success: false, error: error.message }),
//       { status: 400, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }


// export async function DELETE(request, { params }) {
//   await dbConnect();
//   try {
//     const { id } = await params;  // await params to ensure proper async access
//     const result = await SalesQuotation.deleteOne({ _id: id });
//     if (result.deletedCount === 0) {
//       return new Response(JSON.stringify({ success: false, error: "Not found" }), {
//         status: 404,
//         headers: { "Content-Type": "application/json" },
//       });
//     }
//     return new Response(JSON.stringify({ success: true, data: {} }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     return new Response(JSON.stringify({ success: false, error: error.message }), {
//       status: 400,
//       headers: { "Content-Type": "application/json" },
//     });
//   }
// }

