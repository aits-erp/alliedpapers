import dbConnect from "@/lib/db";
import GRN from "@/models/grnModels";

// GET /api/grn/[id]: Get a single GRN by ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const grn = await GRN.findById(id);
    if (!grn) {
      return new Response(JSON.stringify({ message: "GRN not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
       
      });
    }
    console.log("edite GNR",grn);
    return new Response(JSON.stringify({ success: true, data: grn }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      
    });
   
  } catch (error) {
    console.error("Error fetching GRN:", error);
    return new Response(
      JSON.stringify({ message: "Error fetching GRN", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
 
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const data = await req.json();
    const updatedGRN = await GRN.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!updatedGRN) {
      return new Response(JSON.stringify({ message: "GRN not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "GRN updated successfully", grn: updatedGRN }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating GRN:", error);
    return new Response(
      JSON.stringify({ message: "Error updating GRN", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = await params;  // Ensure params are awaited here.
    const deletedGRN = await GRN.findByIdAndDelete(id);
    if (!deletedGRN) {
      return new Response(JSON.stringify({ message: "GRN not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({ message: "GRN deleted successfully" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error deleting GRN:", error);
    return new Response(
      JSON.stringify({ message: "Error deleting GRN", error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
