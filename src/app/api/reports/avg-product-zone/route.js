import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import Customer from "@/models/CustomerModel";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const companyId = searchParams.get("companyId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!companyId) {
      return NextResponse.json(
        { message: "companyId is required" },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { message: "Invalid companyId" },
        { status: 400 }
      );
    }

    await dbConnect();

    const match = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    // ✅ Date filter (orderDate OR postingDate)
    if (from || to) {
      const fromDate = from ? new Date(from) : null;
      const toDate = to ? new Date(to) : null;

      if (toDate) {
        toDate.setHours(23, 59, 59, 999);
      }

      match.$or = [
        {
          orderDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
        {
          postingDate: {
            ...(fromDate && { $gte: fromDate }),
            ...(toDate && { $lte: toDate }),
          },
        },
      ];
    }

    // ✅ Customer se zone lane ke liye populate
    const orders = await SalesOrder.find(match)
      .populate({ path: "customer", select: "zone name" }) // 👈 yahan "zone" field assume kiya
      .lean();

    if (!orders.length) {
      return NextResponse.json({
        summary: {
          totalZones: 0,
          totalProducts: 0,
          totalQty: 0,
          totalNetAmount: 0,
          overallAverageRate: 0,
        },
        records: [],
      });
    }

    const map = {}; // key: `${zone}||${itemName}`

    let totalQty = 0;
    let totalNetAmount = 0;

    for (const order of orders) {
      // 👇 Customer se zone
      const zone =
        (order.customer && order.customer.zone) ||
        "Unknown Zone";

      for (const item of order.items || []) {
        const itemName = item.itemName || "Unknown Item";
        const qty = Number(item.quantity || 0);

        const lineTotal = Number(item.totalAmount || 0);
        const gst = Number(item.gstAmount || 0);
        const tds = Number(item.tdsAmount || 0);

        const net = lineTotal - gst - tds;

        const key = `${zone}||${itemName}`;

        if (!map[key]) {
          map[key] = {
            zone,
            itemName,
            totalQty: 0,
            totalNetAmount: 0,
          };
        }

        map[key].totalQty += qty;
        map[key].totalNetAmount += net;

        totalQty += qty;
        totalNetAmount += net;
      }
    }

    const records = Object.values(map).map((r) => ({
      zone: r.zone,
      itemName: r.itemName,
      totalQty: r.totalQty,
      totalNetAmount: Number(r.totalNetAmount.toFixed(2)),
      averageRate:
        r.totalQty > 0
          ? Number((r.totalNetAmount / r.totalQty).toFixed(2))
          : 0,
    }));

    const uniqueZones = new Set(records.map((r) => r.zone));
    const uniqueProducts = new Set(records.map((r) => r.itemName));

    const overallAverageRate =
      totalQty > 0
        ? Number((totalNetAmount / totalQty).toFixed(2))
        : 0;

    return NextResponse.json({
      summary: {
        totalZones: uniqueZones.size,
        totalProducts: uniqueProducts.size,
        totalQty,
        totalNetAmount: Number(totalNetAmount.toFixed(2)),
        overallAverageRate,
      },
      records,
    });
  } catch (error) {
    console.error("Avg Product Zone Rate Error:", error);

    return NextResponse.json(
      {
        message: "Error generating average rate product-zone report",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
