// import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";
// import { NextResponse } from "next/server";




// export async function POST(req) {
//   await dbConnect();
//   try {
//     const data = await req.json();
//     console.log("Received customer data:", data);

//     // Validate required fields
//     if (!data.customerCode || !data.customerName || !data.emailId) {
//       return NextResponse.json(
//         { error: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const customer = await Customer.create(data);
//     return NextResponse.json(customer, { status: 201 });
//   } catch (error) {
//     console.error("Error creating customer:", error);
//     return NextResponse.json(
//       { error: error.message || "Error creating customer" },
//       { status: 400 }
//     );
//   }
// }




























































// src/app/api/customers/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";

// IMPORTANT: import CompanyUser FIRST so model gets registered
import CompanyUser from "@/models/CompanyUser";
import Customer from "@/models/CustomerModel";

import mongoose from "mongoose";

export async function GET() {
  try {
    await dbConnect();

    // DEBUG: show registered models (temporary - remove in production)
    console.log("Registered mongoose models:", mongoose.modelNames());

    // Now run the query/populate
    const customers = await Customer.find({})
      .populate({
        path: "salesEmployee",
        select: "name email phone roles",
      })
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
    // const data = await req.json();
    console.log("Received customer data:", body);
    const customer = new Customer(body);
    await customer.save();
    const populated = await Customer.findById(customer._id)
    .populate("salesEmployee ")
    .populate("glAccount");
    return NextResponse.json(populated, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}































































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
