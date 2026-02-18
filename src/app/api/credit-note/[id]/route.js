// import dbConnect from "@/lib/db";
// import CreditNote from "@/models/CreditMemo";

// export async function GET(req, context) {
//   const { id } =  await context.params;
//   await dbConnect();
//   try {
//     const creditNote = await CreditNote.findById(id);
//     if (!creditNote) {
//       return new Response(
//         JSON.stringify({ message: "Credit Note not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }
//     return new Response(JSON.stringify(creditNote), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching Credit Note:", error);
//     return new Response(
//       JSON.stringify({
//         message: "Error fetching Credit Note",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// export async function PUT(req, context) {
//   const { id } =  context.params;
//   await dbConnect();
//   try {
//     const creditData = await req.json();
//     // Update the Credit Note with new data
//     const updatedCreditNote = await CreditNote.findByIdAndUpdate(
//       id,
//       creditData,
//       { new: true }
//     );
//     if (!updatedCreditNote) {
//       return new Response(
//         JSON.stringify({ message: "Credit Note not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }
//     return new Response(
//       JSON.stringify({ message: "Credit Note updated", creditNote: updatedCreditNote }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error updating Credit Note:", error);
//     return new Response(
//       JSON.stringify({
//         message: "Error updating Credit Note",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// export async function DELETE(req, context) {
//   const { id } = context.params;
//   await dbConnect();
//   try {
//     const deletedCreditNote = await CreditNote.findByIdAndDelete(id);
//     if (!deletedCreditNote) {
//       return new Response(
//         JSON.stringify({ message: "Credit Note not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }
//     return new Response(
//       JSON.stringify({ message: "Credit Note deleted" }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error deleting Credit Note:", error);
//     return new Response(
//       JSON.stringify({
//         message: "Error deleting Credit Note",
//         error: error.message,
//       }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

import dbConnect from "@/lib/db";
import CreditNote from "@/models/CreditMemo";

export async function GET(req, context) {
  const { id } = await context.params; // await the params
  await dbConnect();
  try {
    const creditNote = await CreditNote.findById(id);
    if (!creditNote) {
      return new Response(
        JSON.stringify({ message: "Credit Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(JSON.stringify(creditNote), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching Credit Note:", error);
    return new Response(
      JSON.stringify({
        message: "Error fetching Credit Note",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function PUT(req, context) {
  const { id } = await context.params; // await the params
  await dbConnect();
  try {
    const creditData = await req.json();
    // Update the Credit Note with new data
    const updatedCreditNote = await CreditNote.findByIdAndUpdate(
      id,
      creditData,
      { new: true }
    );
    if (!updatedCreditNote) {
      return new Response(
        JSON.stringify({ message: "Credit Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ message: "Credit Note updated", creditNote: updatedCreditNote }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating Credit Note:", error);
    return new Response(
      JSON.stringify({
        message: "Error updating Credit Note",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function DELETE(req, context) {
  const { id } = await context.params; // await the params
  await dbConnect();
  try {
    const deletedCreditNote = await CreditNote.findByIdAndDelete(id);
    if (!deletedCreditNote) {
      return new Response(
        JSON.stringify({ message: "Credit Note not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ message: "Credit Note deleted" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting Credit Note:", error);
    return new Response(
      JSON.stringify({
        message: "Error deleting Credit Note",
        error: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
