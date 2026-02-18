import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
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

    // ✅ Date filter
    if (from || to) {
      const fromDate = from ? new Date(from + "T00:00:00.000Z") : null;
      const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

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

    const orders = await SalesOrder.find(match).lean();

    if (!orders.length) {
      return NextResponse.json({
        summary: {
          totalProducts: 0,
          totalQty: 0,
          totalNetAmount: 0,
          overallAverageRate: 0,
        },
        products: [],
      });
    }

    const productMap = {};

    let totalQty = 0;
    let totalNetAmount = 0;

    for (const order of orders) {
      for (const item of order.items || []) {
        const name = item.itemName || "Unknown";
        const qty = Number(item.quantity || 0);

        const lineTotal = Number(item.totalAmount || 0);
        const gst = Number(item.gstAmount || 0);
        const tds = Number(item.tdsAmount || 0);

        const net = lineTotal - gst - tds;

        if (!productMap[name]) {
          productMap[name] = {
            itemName: name,
            totalQty: 0,
            totalNetAmount: 0,
          };
        }

        productMap[name].totalQty += qty;
        productMap[name].totalNetAmount += net;

        totalQty += qty;
        totalNetAmount += net;
      }
    }

    const products = Object.values(productMap).map((p) => ({
      itemName: p.itemName,
      totalQty: p.totalQty,
      totalNetAmount: Number(p.totalNetAmount.toFixed(2)),
      averageRate:
        p.totalQty > 0
          ? Number((p.totalNetAmount / p.totalQty).toFixed(2))
          : 0,
    }));

    const overallAverageRate =
      totalQty > 0 ? Number((totalNetAmount / totalQty).toFixed(2)) : 0;

    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        totalQty,
        totalNetAmount: Number(totalNetAmount.toFixed(2)),
        overallAverageRate,
      },
      products,
    });
  } catch (error) {
    console.error("Avg Product Rate Error:", error);

    return NextResponse.json(
      {
        message: "Error generating average rate report",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
