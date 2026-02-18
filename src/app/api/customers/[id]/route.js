import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { NextResponse } from "next/server";


// export async function GET(req) {
//   try {
//     await dbConnect();
//     const { searchParams } = new URL(req.url);
//     const search = searchParams.get("search");

//     let query = {};
//     if (search) {
//       query = {
//         $or: [
//           { customerName: { $regex: search, $options: "i" } },
//           { customerCode: { $regex: search, $options: "i" } },
//         ],
//       };
//     }

//     const customers = await Customer.find(query).select("_id customerCode customerName contactPersonName").limit(10);
//     return NextResponse.json(customers, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching customers:", error);
//     return NextResponse.json({ error: "Error fetching customers" }, { status: 400 });
//   }
// }


export async function GET(req, { params }) {
  // Extract query parameters from the URL
  const { search } = Object.fromEntries(req.nextUrl.searchParams.entries());

  // If a search query is provided, perform a search
  if (search) {
    try {
      await dbConnect();
      // Use a case-insensitive regex to match supplier names
      const customer = await Customer.find({
        name: { $regex: search, $options: "i" },
      });
      return NextResponse.json(customer, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Error searching suppliers", details: error.message },
        { status: 400 }
      );
    }
  }

  // If params contains an id, fetch a single supplier
  if  (params && params.id) {
    const { id } =  params;
    try {
      await dbConnect();
      const customers = await Customer.findById(id);
      if (!customers) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
      return NextResponse.json(customers, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Error fetching customers", details: error.message },
        { status: 400 }
      );
    }
  }

  // If no search query and no id, return all suppliers
  try {
    await dbConnect();
    const suppliers = await Supplier.find({});
    return NextResponse.json(suppliers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error fetching suppliers", details: error.message },
      { status: 400 }
    );
  }
}

export async function PUT(req, { params }) {
  const { id } = params; // Use id here
  try {
    const data = await req.json();
    const customer = await Customer.findByIdAndUpdate(id, data, { new: true }); // Update customer by id
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json(customer, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error updating customer" }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  const { id } = params; // Ensure the parameter is named id

  if (!id) {
    return NextResponse.json({ error: "Customer id is required" }, { status: 400 });
  }

  try {
    const deletedCustomer = await Customer.findByIdAndDelete(id); // Delete customer by id

    if (!deletedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({ success: "Customer deleted successfully" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Error deleting customer" }, { status: 500 });
  }
}
