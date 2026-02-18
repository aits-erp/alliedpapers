


// src/app/api/customers/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";

// IMPORTANT: import CompanyUser FIRST so model gets registered
import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";

import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let filter = {};

    // 🔥 agar search hai → filter
    if (search && search.trim() !== "") {
      filter = {
        customerName: {
          $regex: "^" + search,   // starts with
          $options: "i",          // case-insensitive
        },
      };
    }

    const customers = await Customer.find(filter)
      .populate({
        path: "salesEmployee",
        select: "name email phone roles",
      })
      .limit(50)
      .sort({ customerName: 1 })
      .lean();

    return NextResponse.json(customers);
  } catch (error) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}





export async function POST(req) {
  await dbConnect();

  try {
    const body = await req.json();

    const customer = new Customer({
      ...body,
      creditLimit: Number(body.creditLimit || 0),
      salesEmployee: body.salesEmployee
        ? new mongoose.Types.ObjectId(body.salesEmployee)
        : null,
    });

    await customer.save();

    const populated = await Customer.findById(customer._id)
      .populate("salesEmployee"); // ✔ ONLY VALID FIELD

    return NextResponse.json(populated, { status: 201 });

  } catch (error) {
    console.error("Populate Error:", error);
    return NextResponse.json(
      { message: error.message },
      { status: 400 }
    );
  }
}



// export async function POST(req) {
//   await dbConnect();
//   try {
//     const body = await req.json();
//     // const data = await req.json();
//     console.log("Received customer data:", body);
//     const customer = new Customer(body);
//     await customer.save();
//     const populated = await Customer.findById(customer._id)
//     .populate("salesEmployee ")
//     .populate("glAccount");
//     return NextResponse.json(populated, { status: 201 });
//   } catch (error) {
//     return NextResponse.json({ message: error.message }, { status: 500 });
//   }
// }































































// export async function GET() {
//   await dbConnect();
//   try {
//     // const customers = await Customer.find({});
//     const customers = await Customer.find().populate("glAccount");
//   return NextResponse.json(customers);
   
//   } catch (error) {
//     return NextResponse.json({ error: "Error fetching customers" }, { status: 400 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   try {
//     const data = await req.json();
//     console.log('Received customer data:', data);
//     const customer = await Customer.create(data);
//     return NextResponse.json(customer, { status: 201 });
//   } catch (error) {
//     return NextResponse.json({ error: "Error creating customer" }, { status: 400 });
//   }
// }
