import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return new Response(JSON.stringify({ message: "Date required" }), { status: 400 });
  }

  const start = new Date(date);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  try {
    const report = await SalesOrder.aggregate([
      { $match: { orderDate: { $gte: start, $lte: end } } },

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
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },

      // Add safe fields
      {
        $addFields: {
          salespersonName: {
            $cond: [
              { $gt: [{ $size: "$salesEmployee" }, 0] }, // if user found
              { $arrayElemAt: ["$salesEmployee.name", 0] }, // use first user's name
              { $ifNull: [{ $arrayElemAt: ["$company.companyName", 0] }, "Unknown Salesperson"] }, // else use company
            ],
          },
          companyName: { $ifNull: [{ $arrayElemAt: ["$company.companyName", 0] }, "Unknown Company"] },
          itemsQuantity: {
            $sum: {
              $map: {
                input: { $ifNull: ["$items", []] },
                as: "item",
                in: { $ifNull: ["$$item.quantity", 0] },
              },
            },
          },
        },
      },

      // Group by date + salesperson + company
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
            salesperson: "$salespersonName",
            company: "$companyName",
          },
          totalQty: { $sum: "$itemsQuantity" },
          totalValue: { $sum: { $ifNull: ["$grandTotal", 0] } },
          totalDispatched: {
            $sum: { $cond: [{ $eq: ["$status", "Dispatched"] }, "$itemsQuantity", 0] },
          },
          totalPending: { $sum: { $ifNull: ["$openBalance", 0] } },
        },
      },

      { $sort: { "_id.salesperson": 1, "_id.company": 1 } },
    ]);

    return new Response(JSON.stringify({ datewise: report }), { status: 200 });
  } catch (err) {
    console.error("Error generating datewise report:", err);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}
