import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import { NextResponse } from "next/server";

// GET /api/suppliers?search=...  OR GET /api/suppliers/[id]
export async function GET(req, { params }) {
  // Extract query parameters from the URL
  const { search } = Object.fromEntries(req.nextUrl.searchParams.entries());

  // If a search query is provided, perform a search
  if (search) {
    try {
      await dbConnect();
      // Use a case-insensitive regex to match supplier names
      const suppliers = await Supplier.find({
        name: { $regex: search, $options: "i" },
      });
      return NextResponse.json(suppliers, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Error searching suppliers", details: error.message },
        { status: 400 }
      );
    }
  }

  // If params contains an id, fetch a single supplier
  if (params && params.id) {
    const { id } = params;
    try {
      await dbConnect();
      const supplier = await Supplier.findById(id);
      if (!supplier) {
        return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
      }
      return NextResponse.json(supplier, { status: 200 });
    } catch (error) {
      return NextResponse.json(
        { error: "Error fetching supplier", details: error.message },
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

// PUT /api/suppliers/[id]
export async function PUT(req, { params }) {
  const { id } = await params;
  try {
    const data = await req.json();
    await dbConnect();
    const supplier = await Supplier.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(supplier, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Error updating supplier", details: error.message },
      { status: 400 }
    );
  }
}

// DELETE /api/suppliers/[id]
export async function DELETE(req, { params }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "Supplier ID is required" },
      { status: 400 }
    );
  }
  try {
    await dbConnect();
    const deletedSupplier = await Supplier.findByIdAndDelete(id);
    if (!deletedSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: "Supplier deleted successfully", deletedId: id },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Error deleting supplier", details: error.message },
      { status: 500 }
    );
  }
}




// import dbConnect from "@/lib/db.js";
// import Supplier from "@/models/SupplierModels";
// import { NextResponse } from "next/server";

// export async function GET(req, { params }) {
//   const { id } = params;
//   try {
//     await dbConnect();
//     const supplier = await Supplier.findById(id);

//     if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
//     const suppliers =  await Supplier.find({
//       name: { $regex: name, $options: "i" },
//     });
//     return NextResponse.json(supplier,suppliers, { status: 200 });
    
    
//   } catch (error) {
//     return NextResponse.json({ error: "Error fetching supplier" }, { status: 400 });
//   }
// }




// export async function PUT(req, { params }) {
//   const { id } = params;
//   try {
//     const data = await req.json();
//     const supplier = await Supplier.findByIdAndUpdate(
//       id,
//       data,
//       { new: true, runValidators: true }
//     );
//     if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
//     return NextResponse.json(supplier, { status: 200 });
//   } catch (error) {
//     return NextResponse.json({ 
//       error: "Error updating supplier",
//       details: error.message 
//     }, { status: 400 });
//   }
// }

// export async function DELETE(req, { params }) {
//   const { id } = params;

//   if (!id) {
//     return NextResponse.json({ error: "Supplier ID is required" }, { status: 400 });
//   }

//   try {
//     const deletedSupplier = await Supplier.findByIdAndDelete(id);
    
//     if (!deletedSupplier) {
//       return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
//     }

//     return NextResponse.json({ 
//       success: "Supplier deleted successfully",
//       deletedId: id 
//     }, { status: 200 });
    
//   } catch (error) {
//     return NextResponse.json({ 
//       error: "Error deleting supplier",
//       details: error.message 
//     }, { status: 500 });
//   }
// }