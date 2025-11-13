import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Customer from "@/models/CustomerModel";

export async function POST(req) {
  try {
    await connectDB();

    const { customers = [] } = await req.json();

    if (!Array.isArray(customers) || customers.length === 0) {
      return NextResponse.json(
        { message: "No customer data received" },
        { status: 400 }
      );
    }

    let inserted = [];
    let updated = [];
    let skipped = [];
    let errors = [];

    for (const row of customers) {
      try {
        // Normalized mapped customer object
        const cust = {
          customerCode: row.customerCode?.trim(),
          customerName: row.customerName?.trim(),
          customerGroup: row.customerGroup,
          customerType: row.customerType,
          emailId: row.emailId?.trim(),
          mobileNumber: row.mobileNumber?.replace(/\D/g, ""),
          paymentTerms: row.paymentTerms,
          gstNumber: row.gstNumber?.trim(),
          gstCategory: row.gstCategory,
          pan: row.pan?.trim()?.toUpperCase(),
          contactPersonName: row.contactPersonName,
          commissionRate: row.commissionRate,
          glAccount: row.glAccount || null,
          salesEmployee: row.salesEmployee,
          zone: row.zone,

          billingAddresses: [{
            address1: row["billingAddress.address1"] || "",
            address2: row["billingAddress.address2"] || "",
            city: row["billingAddress.city"] || "",
            state: row["billingAddress.state"] || "",
            zip: row["billingAddress.zip"] || "",
            country: row["billingAddress.country"] || "",
          }],

          shippingAddresses: [{
            address1: row["shippingAddress.address1"] || "",
            address2: row["shippingAddress.address2"] || "",
            city: row["shippingAddress.city"] || "",
            state: row["shippingAddress.state"] || "",
            zip: row["shippingAddress.zip"] || "",
            country: row["shippingAddress.country"] || "",
          }]
        };

        // Minimal validation
        if (!cust.customerCode || !cust.customerName) {
          skipped.push({
            code: row.customerCode,
            reason: "customerCode or customerName missing",
          });
          continue;
        }

        // Check existing by customerCode
        const existing = await Customer.findOne({
          customerCode: cust.customerCode,
        });

        if (existing) {
          await Customer.updateOne(
            { customerCode: cust.customerCode },
            { $set: cust }
          );
          updated.push(cust.customerCode);
        } else {
          await Customer.create(cust);
          inserted.push(cust.customerCode);
        }
      } catch (err) {
        errors.push({
          customerCode: row.customerCode,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      message: "Customers processed",
      totalReceived: customers.length,
      insertedCount: inserted.length,
      updatedCount: updated.length,
      skippedCount: skipped.length,
      errorCount: errors.length,
      inserted,
      updated,
      skipped,
      errors,
    });

  } catch (error) {
    return NextResponse.json(
      { message: "Server error", error: error.message },
      { status: 500 }
    );
  }
}




// // /api/customers/customer-template/route.js
// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Customer from "@/models/CustomerModel";





// export async function POST(req) {
//   try {
//     await connectDB();

//     const body = await req.json();
//     const customers = body.customers || [];

//     if (!Array.isArray(customers) || customers.length === 0) {
//       return NextResponse.json(
//         { message: "No customer data received" },
//         { status: 400 }
//       );
//     }

//     let inserted = [];
//     let updated = [];
//     let skipped = [];
//     let errors = [];

//     for (const rawCust of customers) {
//       try {
//         // Map CSV fields → Schema
//         const cust = {
//           customerCode: rawCust.customerCode?.trim(),
//           customerName: rawCust.customerName?.trim(),
//           customerGroup: rawCust.customerGroup,
//           customerType: rawCust.customerType,
//           emailId: rawCust.emailId?.trim(),
//           fromLead: rawCust.fromLead,
//           mobileNumber: rawCust.mobileNumber
//             ? rawCust.mobileNumber.replace(/\D/g, "")
//             : undefined,
//           fromOpportunity: rawCust.fromOpportunity,
//           billingAddresses: [
//             {
//               address1: rawCust["billingAddress.address1"] || "",
//               address2: rawCust["billingAddress.address2"] || "",
//               city: rawCust["billingAddress.city"] || "",
//               state: rawCust["billingAddress.state"] || "",
//               zip: rawCust["billingAddress.zip"] || "",
//               country: rawCust["billingAddress.country"] || "",
//             },
//           ],
//           shippingAddresses: [
//             {
//               address1: rawCust["shippingAddress.address1"] || "",
//               address2: rawCust["shippingAddress.address2"] || "",
//               city: rawCust["shippingAddress.city"] || "",
//               state: rawCust["shippingAddress.state"] || "",
//               zip: rawCust["shippingAddress.zip"] || "",
//               country: rawCust["shippingAddress.country"] || "",
//             },
//           ],
//           paymentTerms: rawCust.paymentTerms,
//           gstNumber: rawCust["GST Number"]?.trim(),
//           gstCategory: rawCust.gstCategory,
//           pan: rawCust.pan ? rawCust.pan.trim().toUpperCase() : undefined,
//           contactPersonName: rawCust.contactPersonName,
//           commissionRate: rawCust.commissionRate,
//           glAccount: rawCust.glAccount,
//           salesEmployee: rawCust.salesEmployee,
//           zone: rawCust.zone,
//         };

//         // Basic validation
//         if (!cust.customerCode || !cust.customerName) {
//           skipped.push({
//             customerCode: cust.customerCode,
//             reason: "Missing customerCode or customerName",
//           });
//           continue;
//         }

//         // Check if already exists by customerCode
//         const existing = await Customer.findOne({
//           customerCode: cust.customerCode,
//         });

//         if (existing) {
//           await Customer.updateOne(
//             { customerCode: cust.customerCode },
//             { $set: cust }
//           );
//           updated.push(cust.customerCode);
//         } else {
//           await Customer.create(cust);
//           inserted.push(cust.customerCode);
//         }
//       } catch (err) {
//         errors.push({
//           customerCode: rawCust.customerCode,
//           error: err.message,
//         });
//       }
//     }

//     return NextResponse.json({
//       message: "Customers processed",
//       totalReceived: customers.length,
//       insertedCount: inserted.length,
//       updatedCount: updated.length,
//       skippedCount: skipped.length,
//       errorCount: errors.length,
//       inserted,
//       updated,
//       skipped,
//       errors,
//     });
//   } catch (error) {
//     console.error("Error inserting customers:", error);
//     return NextResponse.json(
//       { message: "Error processing customers", error: error.message },
//       { status: 500 }
//     );
//   }
// }







export async function GET() {
  // Get schema paths from Mongoose
  const schemaPaths = Customer.schema.paths;

  // Convert schema paths to CSV headers
  let headers = Object.keys(schemaPaths);

  // Remove internal mongoose fields
  headers = headers.filter(
    (field) => !["_id", "__v", "createdAt", "updatedAt"].includes(field)
  );

  // Add nested billing & shipping address fields manually (since they're arrays)
  const addressFields = ["address1", "address2", "city", "state", "zip", "country"];

  const billingHeaders = addressFields.map((f) => `billingAddress.${f}`);
  const shippingHeaders = addressFields.map((f) => `shippingAddress.${f}`);

  const finalHeaders = [...headers, ...billingHeaders, ...shippingHeaders];

  // Convert headers into CSV string
  const csv = finalHeaders.join(",") + "\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=customer_template.csv",
    },
  });
}
