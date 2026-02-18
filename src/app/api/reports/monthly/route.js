import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month"));
  const year = parseInt(searchParams.get("year"));

  if (!month || !year) {
    return new Response(
      JSON.stringify({ message: "Month & Year required" }),
      { status: 400 }
    );
  }

  // First & last day of month
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  try {
    const report = await SalesOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: start, $lte: end },
        },
      },
      // Lookup salesperson (createdBy)
      {
        $lookup: {
          from: "companyusers",
          localField: "createdBy",
          foreignField: "_id",
          as: "salesEmployee",
        },
      },
      // Lookup company
      {
        $lookup: {
          from: "companies",
          localField: "createdBy", // fallback in case createdBy is companyId
          foreignField: "_id",
          as: "createdCompany",
        },
      },
      // Add salespersonName safely
      {
        $addFields: {
          salespersonName: {
            $cond: [
              { $gt: [{ $size: "$salesEmployee" }, 0] }, // if user exists
              { $arrayElemAt: ["$salesEmployee.name", 0] },
              {
                $cond: [
                  { $gt: [{ $size: "$createdCompany" }, 0] }, // else if company exists
                  { $arrayElemAt: ["$createdCompany.companyName", 0] },
                  "Unknown Salesperson", // fallback
                ],
              },
            ],
          },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            salesperson: "$salespersonName",
          },
          totalQty: { $sum: "$items.quantity" },
          totalValue: { $sum: { $ifNull: ["$grandTotal", 0] } },
          totalDispatched: {
            $sum: {
              $cond: [{ $eq: ["$status", "Dispatched"] }, "$items.quantity", 0],
            },
          },
          totalPending: { $sum: { $ifNull: ["$openBalance", 0] } },
        },
      },
      { $sort: { "_id.salesperson": 1 } },
    ]);

    return new Response(JSON.stringify({ monthly: report }), { status: 200 });
  } catch (err) {
    console.error("Error generating monthly report:", err);
    return new Response(
      JSON.stringify({ message: "Internal Server Error" }),
      { status: 500 }
    );
  }
}
