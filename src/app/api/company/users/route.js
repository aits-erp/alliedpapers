import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

const VALID_ROLES = [
  "Admin",
  "Sales Manager",
  "Purchase Manager",
  "Inventory Manager",
  "Accounts Manager",
  "HR Manager",
  "Support Executive",
  "Production Head",
];

/* ───────── AUTH HELPERS ───────── */

function getToken(req) {
  const auth = req.headers.get("authorization") || "";
  return auth.split(" ")[1];
}

function requireAuth(req) {
  const token = getToken(req);
  if (!token) throw new Error("Unauthorized");
  return jwt.verify(token, SECRET);
}

function requireCompany(req) {
  const user = requireAuth(req);
  const roles = (user.roles || []).map((r) => r.toLowerCase());

  // allow company OR admin
  if (user.type !== "company" && !roles.includes("admin")) {
    throw new Error("Forbidden");
  }

  return user;
}

/* ───────── GET ───────── */
export async function GET(req) {
  try {
    const user = requireAuth(req);
    const roles = (user.roles || []).map((r) => r.toLowerCase());

    const isAdmin = roles.includes("admin");
    const isCompany = user.type === "company";

    await dbConnect();

    let users;

    if (isAdmin) {
      // Admin → all users
      users = await CompanyUser.find().select("-password").lean();
    } else if (isCompany) {
      // Company → only its users
      users = await CompanyUser.find({ companyId: user.companyId })
        .select("-password")
        .lean();
    } else {
      throw new Error("Forbidden");
    }

    return NextResponse.json(users);
  } catch (e) {
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
        ? 403
        : 500;

    return NextResponse.json({ message: e.message }, { status });
  }
}

/* ───────── POST ───────── */
export async function POST(req) {
  try {
    const authUser = requireCompany(req);
    const { name, email, password, roles = [] } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json(
        { message: "name, email, password required" },
        { status: 400 }
      );

    if (
      !Array.isArray(roles) ||
      roles.length === 0 ||
      roles.some((r) => !VALID_ROLES.includes(r))
    )
      return NextResponse.json({ message: "Invalid roles" }, { status: 400 });

    await dbConnect();

    // 🔥 admin fallback
    const companyId = authUser.companyId || authUser.id;

    const exists = await CompanyUser.findOne({ companyId, email });

    if (exists)
      return NextResponse.json(
        { message: "Email already exists" },
        { status: 409 }
      );

    const hash = await bcrypt.hash(password, 10);

    const user = await CompanyUser.create({
      companyId,
      name,
      email,
      password: hash,
      roles,
    });

    return NextResponse.json(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        roles: user.roles,
      },
      { status: 201 }
    );
  } catch (e) {
    const status =
      e.message === "Unauthorized"
        ? 401
        : e.message === "Forbidden"
        ? 403
        : 500;

    return NextResponse.json({ message: e.message }, { status });
  }
}





// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// const SECRET = process.env.JWT_SECRET;

// const VALID_ROLES = [
//   "Admin",
//   "Sales Manager",
//   "Purchase Manager",
//   "Inventory Manager",
//   "Accounts Manager",
//   "HR Manager",
//   "Support Executive",
//   "Production Head",
// ];

// /* ───────── AUTH HELPERS ───────── */

// function getToken(req) {
//   const auth = req.headers.get("authorization") || "";
//   return auth.split(" ")[1];
// }

// function requireAuth(req) {
//   const token = getToken(req);
//   if (!token) throw new Error("Unauthorized");
//   return jwt.verify(token, SECRET);
// }

// function requireCompany(req) {
//   const user = requireAuth(req);

//   const roles = (user.roles || []).map(r => r.toLowerCase());

//   // ✅ allow company OR admin
//   if (user.type !== "company" && !roles.includes("admin")) {
//     throw new Error("Forbidden");
//   }

//   return user;
// }


// /* ───────── GET /api/company/users ───────── */
// export async function GET(req) {
//   try {
//     const user = requireAuth(req);

//     const isAdmin = user.roles?.includes("Admin");
//     const isCompany = user.type === "company";

//     await dbConnect();

//     let users;

//     if (isAdmin) {
//       // ✅ Admin → all users
//       users = await CompanyUser.find()
//         .select("-password")
//         .lean();
//     } else if (isCompany) {
//       // ✅ Company → only its users
//       users = await CompanyUser.find({ companyId: user.companyId })
//         .select("-password")
//         .lean();
//     } else {
//       throw new Error("Forbidden");
//     }

//     return NextResponse.json(users, { status: 200 });

//   } catch (e) {
//     const status = e.message === "Unauthorized"
//       ? 401
//       : e.message === "Forbidden"
//       ? 403
//       : 500;

//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

// /* ───────── POST /api/company/users ───────── */
// export async function POST(req) {
//   try {
//     const company = requireCompany(req);
//     const { name, email, password, roles = [] } = await req.json();

//     if (!name || !email || !password) {
//       return NextResponse.json(
//         { message: "name, email, password required" },
//         { status: 400 }
//       );
//     }

//     if (
//       !Array.isArray(roles) ||
//       roles.length === 0 ||
//       roles.some(r => !VALID_ROLES.includes(r))
//     ) {
//       return NextResponse.json(
//         { message: "Invalid roles" },
//         { status: 400 }
//       );
//     }

//     await dbConnect();

//     const exists = await CompanyUser.findOne({
//       companyId: company.companyId,
//       email,
//     });

//     if (exists) {
//       return NextResponse.json(
//         { message: "Email already exists" },
//         { status: 409 }
//       );
//     }

//     const hash = await bcrypt.hash(password, 10);

//     const user = await CompanyUser.create({
//       companyId: company.companyId,
//       name,
//       email,
//       password: hash,
//       roles,
//     });

//     return NextResponse.json(
//       {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         roles: user.roles,
//       },
//       { status: 201 }
//     );

//   } catch (e) {
//     const status = e.message === "Unauthorized"
//       ? 401
//       : e.message === "Forbidden"
//       ? 403
//       : 500;

//     return NextResponse.json({ message: e.message }, { status });
//   }
// }

