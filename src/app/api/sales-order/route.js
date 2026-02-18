import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import SalesOrder from '@/models/SalesOrder';
import formidable from "formidable";
import { Readable } from "stream";
import { sendSalesOrderEmail } from "@/lib/mailer";
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const config = { api: { bodyParser: false } };

// // ✅ Correct cloudinary config keys
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// ✅ Permission check
function isAuthorized(user) {
  if (!user) return false;

  const roles = user.roles?.map(r => r.toLowerCase()) || [];

  return (
    user.type === "company" ||
    roles.includes("admin") ||
    roles.includes("sales manager") ||
    user.permissions?.includes("sales")
  );
}



async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public/uploads/sales_orders");
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
}

// ✅ Convert Next.js request to Node.js stream for formidable
async function toNodeReq(request) {
  const buf = Buffer.from(await request.arrayBuffer());
  const nodeReq = new Readable({
    read() {
      this.push(buf);
      this.push(null);
    },
  });
  nodeReq.headers = Object.fromEntries(request.headers.entries());
  nodeReq.method = request.method;
  nodeReq.url = request.url || "/";
  return nodeReq;
}

// ✅ Parse multipart form data
async function parseMultipart(request) {
  const nodeReq = await toNodeReq(request);
  const form = formidable({ multiples: true, keepExtensions: true });
  return await new Promise((res, rej) =>
    form.parse(nodeReq, (err, fields, files) =>
      err ? rej(err) : res({ fields, files })
    )
  );
}

// ✅ Main handler
export async function POST(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 401 });
    }
 

    const { fields, files } = await parseMultipart(req);
    const orderData = JSON.parse(fields.orderData || "{}");

    // 🧹 Clean up Mongo IDs
    delete orderData._id;
    orderData.items?.forEach((item) => delete item._id);
    delete orderData.billingAddress?._id;
    delete orderData.shippingAddress?._id;

    // 📌 Add metadata
    orderData.companyId = user.companyId;
    orderData.createdBy = user.id || user._id; // set createdBy to logged-in user
    orderData.createdAt = new Date();

    // ☁️ Upload attachments to Cloudinary
    const fileArray = Array.isArray(files.newFiles)
      ? files.newFiles
      : files.newFiles
        ? [files.newFiles]
        : [];

    // orderData.attachments = await Promise.all(
    //   fileArray.map(async (file) => {
    //     const result = await cloudinary.uploader.upload(file.filepath, {
    //       folder: 'sales_orders',
    //       resource_type: 'auto',
    //     });

    //     return {
    //       fileName: file.originalFilename,
    //       fileUrl: result.secure_url,
    //       fileType: file.mimetype,
    //       uploadedAt: new Date(),
    //     };
    //   })
    // );

    // 🧾 Create sales order
    
    
    const uploadDir = await ensureUploadDir();

orderData.attachments = await Promise.all(
  fileArray.map(async (file) => {
    const ext = path.extname(file.originalFilename || "");
    const uniqueName =
      crypto.randomBytes(8).toString("hex") + ext;

    const destPath = path.join(uploadDir, uniqueName);

    // move file from temp to public folder
    await fs.copyFile(file.filepath, destPath);

    return {
      fileName: file.originalFilename,
      fileUrl: `/uploads/sales_orders/${uniqueName}`,
      fileType: file.mimetype,
      uploadedAt: new Date(),
    };
  })
);

    
    const order = await SalesOrder.create(orderData);







    await sendSalesOrderEmail(
      [
        "gaurav@alliedpapers.com",
        "vaishali@aitsind.com"
      ],
      order
    );

    return NextResponse.json({
      success: true,
      message: "Sales order created",
      orderId: order._id,
    }, { status: 201 });

  } catch (err) {
    console.error("POST /api/sales-order error:", err);
    return NextResponse.json({
      success: false,
      message: err.message,
    }, { status: /Forbidden|Unauthorized/.test(err.message) ? 401 : 500 });
  }
}




export async function GET(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);

    if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const salesOrders = await SalesOrder.find({ companyId: user.companyId });
    return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



/// local system

// import { NextResponse } from 'next/server';
// import mongoose from 'mongoose';
// import path from 'path';
// import fs from 'fs';
// import dbConnect from '@/lib/db';
// import SalesOrder from '@/models/SalesOrder';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
// import { sendSalesOrderEmail } from "@/lib/mailer";
// import { parseForm } from '@/lib/formParser';

// export const config = {
//   api: {
//     bodyParser: false, // Required for file upload parsing
//   },
// };

// const { Types } = mongoose;

// function isAuthorized(user) {
//   if (user.type === 'company') return true;
//   if (user.role === 'Sales Manager' || user.role === 'Admin') return true;
//   return user.permissions?.includes('sales');
// }

// export async function POST(req) {
//   await dbConnect();

//   try {
//     // 1. Authentication
//     const token = getTokenFromHeader(req);
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) throw new Error("Forbidden");

//     // 2. Parse multipart form (JSON + files)
//     const { fields, files } = await parseForm(req);

//     // 3. Parse JSON body (order data)
//     const orderData = JSON.parse(fields.orderData);

//     // 4. Cleanup IDs
//     delete orderData._id;
//     orderData.items?.forEach(i => delete i._id);
//     delete orderData.billingAddress?._id;
//     delete orderData.shippingAddress?._id;

//     // 5. Add metadata
//     orderData.companyId = user.companyId;
//     if (user.type === "user") orderData.createdBy = user.id;

//     // 6. Save uploaded files correctly with extension
//     const fileArray = Array.isArray(files.attachments) ? files.attachments : [files.attachments];
//     const uploadDir = path.join(process.cwd(), "public/uploads");
//     await fs.promises.mkdir(uploadDir, { recursive: true });

//     orderData.attachments = await Promise.all(
//       fileArray
//         .filter(Boolean)
//         .map(async (file) => {
//           const originalExt = path.extname(file.originalFilename); // .png, .pdf etc.
//           const uniqueName = `${path.basename(file.filepath)}${originalExt}`;
//           const newPath = path.join(uploadDir, uniqueName);

//           await fs.promises.rename(file.filepath, newPath);

//           return {
//             fileName: file.originalFilename,
//             fileUrl: `/uploads/${uniqueName}`,
//             fileType: file.mimetype,
//             uploadedAt: new Date(),
//           };
//         })
//     );

//     // 7. Create sales order in DB
//     const order = await SalesOrder.create(orderData);

// // 8. Send email
// await sendSalesOrderEmail(
//   [
//     "aniketgaikwad7224@gmail.com",
//     "9to5withnikhil@gmail.com",
//     "cp5553135@gmail.com",
//     "pritammore1001@gmail.com"
//   ],
//   order
// );

//     // 9. Return response
//     return NextResponse.json(
//       { success: true, message: "Sales order created", orderId: order._id },
//       { status: 201 }
//     );

//   } catch (err) {
//     console.error("POST /api/sales-order error:", err);
//     return NextResponse.json(
//       { success: false, message: err.message },
//       { status: /Forbidden|Unauthorized/.test(err.message) ? 401 : 500 }
//     );
//   }
// }

// export async function GET(req) {
//   await dbConnect();

//   try {
//     const token = getTokenFromHeader(req);
//     const user  = await verifyJWT(token);

//     /* allow company token OR user with Admin / Sales Manager role */
//     if (!user || (user.type === 'user' && !['Admin', 'Sales Manager'].includes(user.role))) {
//       return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
//     }

//     const salesOrders = await SalesOrder.find({ companyId: user.companyId });
//     return NextResponse.json({ success: true, data: salesOrders }, { status: 200 });
//   } catch (err) {
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }



