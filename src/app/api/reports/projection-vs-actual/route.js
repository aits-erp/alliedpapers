import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";
import Projection from "@/models/Projection";
import mongoose from "mongoose";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* --- HELPER FUNCTIONS --- */
// 1. Normalize strings: removes whitespace and converts to lowercase
const normalize = (str) => (str ? str.trim().toLowerCase() : "");

// 2. Title Case: converts "bangalore" or "BANGALORE" to "Bangalore"
const toTitleCase = (str) => {
  if (!str) return "Unknown";
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

export async function GET(req) {
  try {
    await dbConnect();
    
    // --- 1. AUTHENTICATION ---
    const token = getTokenFromHeader(req);
    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get("year"));
    const monthName = searchParams.get("month"); 

    if (!year || !monthName) {
      return NextResponse.json({ message: "Year and Month are required" }, { status: 400 });
    }

    // Convert Month Name to Date Range (for Sales Query)
    const monthIndex = new Date(`${monthName} 1, 2000`).getMonth();
    const startDate = new Date(year, monthIndex, 1);
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);
    const companyId = new mongoose.Types.ObjectId(payload.companyId);

    // --- 2. FETCH PROJECTIONS (Targets) ---
    const projectionDoc = await Projection.findOne({ 
      companyId, 
      year, 
      month: monthName 
    }).lean();

    const projectionsList = projectionDoc ? projectionDoc.rows : [];

    // --- 3. FETCH ACTUAL SALES (Achievements) ---
    const salesData = await SalesOrder.aggregate([
      {
        $match: {
          companyId: companyId,
          orderDate: { $gte: startDate, $lte: endDate },
          status: { $ne: "Cancelled" }
        }
      },
      // Join with Customer to get 'zone'
      {
        $lookup: {
          from: "customers",
          localField: "customer",
          foreignField: "_id",
          as: "customerDetails"
        }
      },
      { $unwind: "$customerDetails" }, // Flatten customer array
      { $unwind: "$items" },           // Flatten items array
      // Group by Zone and Item
      {
        $group: {
          _id: {
            zone: "$customerDetails.zone", 
            itemCode: "$items.itemCode"
          },
          totalSoldQty: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.totalAmount" },
          itemName: { $first: "$items.itemName" }
        }
      }
    ]);

    // --- 4. MERGE LOGIC (THE FIX) ---
    const dataMap = {};

    // A. Process Projections First
    projectionsList.forEach(proj => {
      const zoneKey = normalize(proj.zone);
      const itemKey = normalize(proj.productCode);
      const key = `${zoneKey}|${itemKey}`;

      if (!dataMap[key]) {
        dataMap[key] = {
          zone: proj.zone, // Store original for now, format later
          itemCode: proj.productCode,
          itemName: proj.productName,
          projectedQty: Number(proj.qty) || 0,
          actualQty: 0,
          revenue: 0
        };
      } else {
        // If duplicates exist in projection array, sum them up
        dataMap[key].projectedQty += (Number(proj.qty) || 0);
      }
    });

    // B. Process Actual Sales & Match with Projections
    salesData.forEach(sale => {
      const zoneKey = normalize(sale._id.zone);
      const itemKey = normalize(sale._id.itemCode);
      const key = `${zoneKey}|${itemKey}`;

      if (!dataMap[key]) {
        // Unplanned Sale (No projection existed)
        dataMap[key] = {
          zone: sale._id.zone,
          itemCode: sale._id.itemCode,
          itemName: sale.itemName,
          projectedQty: 0,
          actualQty: 0,
          revenue: 0
        };
      }

      // Add Sales Data to the existing entry
      dataMap[key].actualQty += sale.totalSoldQty;
      dataMap[key].revenue += sale.totalRevenue;
      
      // Ensure we have a product name if the projection didn't provide one
      if (!dataMap[key].itemName) dataMap[key].itemName = sale.itemName;
    });

    // --- 5. FORMAT OUTPUT ---
    const finalReport = Object.values(dataMap).map(row => {
      // Calculate Variance
      const difference = row.actualQty - row.projectedQty;
      
      // Calculate Performance Percentage
      let performance = 0;
      if (row.projectedQty > 0) {
        performance = ((row.actualQty / row.projectedQty) * 100).toFixed(1);
      } else if (row.actualQty > 0) {
        performance = 100; // Sales made without a target = 100% "bonus" performance
      }

      return {
        zone: toTitleCase(row.zone),       // e.g. "Bangalore"
        itemCode: row.itemCode.toUpperCase(), // e.g. "HPS65"
        itemName: row.itemName,
        projectedQty: row.projectedQty,
        actualQty: row.actualQty,
        revenue: row.revenue,
        difference: difference,
        performance: performance
      };
    });

    // Sort by Zone Name (A-Z) -> Then by Item Code
    finalReport.sort((a, b) => {
      if (a.zone === b.zone) {
        return a.itemCode.localeCompare(b.itemCode);
      }
      return a.zone.localeCompare(b.zone);
    });

    return NextResponse.json({ success: true, data: finalReport });

  } catch (error) {
    console.error("Projection Report Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
