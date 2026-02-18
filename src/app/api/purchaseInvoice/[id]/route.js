import dbConnect from "@/lib/db";
import Invoice from "@/models/InvoiceModel";

// GET /api/grn/[id]: Get a single GRN by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const invoices = await Invoice.findById(id);
    console.log("edite invoice",invoices)
    if (!invoices) {
      return new Response(JSON.stringify({ message: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: invoices }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Invoice:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching Invoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const data = await req.json();
    const updatedInvoice = await Invoice.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!updatedInvoice) {
      return new Response(JSON.stringify({ message: "Invoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "GRN updated successfully", data: updatedInvoice }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating updatedInvoice:", error);
    return new Response(
      JSON.stringify({ message: "Error updating updatedInvoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedGRN = await Invoice.findByIdAndDelete(id);
    
    if (!deletedGRN) {
      return new Response(JSON.stringify({ message: "updatedInvoice not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "updatedInvoice deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting updatedInvoice:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting updatedInvoice", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
