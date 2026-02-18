// import dbConnect from '@/lib/db';
// import { User, Role } from '@/models/User';
// import Account from '../../../signup/schema';
// import { withPermission } from '@/middleware/auth';

// // GET /api/users/[id] - Get single user
// async function getUser(req, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;
    
//     const user = await User.findById(id).populate('role');
//     const account = await Account.findOne({ email: user.email });
    
//     if (!user) {
//       return new Response(
//         JSON.stringify({ 
//           success: false,
//           error: 'User not found' 
//         }),
//         { 
//           status: 404,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }
    
//     // Merge user and account data
//     const userData = {
//       ...user.toObject(),
//       ...account?.toObject(),
//       role: user.role?.name,
//       roleId: user.role?._id
//     };
    
//     return new Response(
//       JSON.stringify({ 
//         success: true,
//         data: userData 
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   } catch (error) {
//     console.error('Error fetching user:', error);
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         error: 'Failed to fetch user',
//         message: error.message 
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }

// // PUT /api/users/[id] - Update user
// async function updateUser(req, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;
//     const updateData = await req.json();
    
//     const user = await User.findById(id);
    
//     if (!user) {
//       return new Response(
//         JSON.stringify({ 
//           success: false,
//           error: 'User not found' 
//         }),
//         { 
//           status: 404,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }
    
//     // Separate user and account updates
//     const userFields = ['firstName', 'lastName', 'phone', 'role', 'department', 'employeeId', 'isActive', 'customPermissions'];
//     const accountFields = ['firstName', 'lastName', 'phone', 'country', 'address', 'pinCode'];
    
//     const userUpdates = {};
//     const accountUpdates = {};
    
//     Object.keys(updateData).forEach(key => {
//       if (userFields.includes(key)) {
//         userUpdates[key] = updateData[key];
//       }
//       if (accountFields.includes(key)) {
//         accountUpdates[key] = updateData[key];
//       }
//     });
    
//     // Update user
//     if (Object.keys(userUpdates).length > 0) {
//       await User.findByIdAndUpdate(id, userUpdates, { new: true, runValidators: true });
//     }
    
//     // Update account
//     if (Object.keys(accountUpdates).length > 0) {
//       await Account.findOneAndUpdate({ email: user.email }, accountUpdates);
//     }
    
//     // Fetch updated user with role
//     const updatedUser = await User.findById(id).populate('role');
//     const updatedAccount = await Account.findOne({ email: user.email });
    
//     const userData = {
//       ...updatedUser.toObject(),
//       ...updatedAccount?.toObject(),
//       role: updatedUser.role?.name,
//       roleId: updatedUser.role?._id
//     };
    
//     return new Response(
//       JSON.stringify({ 
//         success: true,
//         data: userData,
//         message: 'User updated successfully' 
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   } catch (error) {
//     console.error('Error updating user:', error);
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         error: 'Failed to update user',
//         message: error.message 
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }

// // DELETE /api/users/[id] - Delete user
// async function deleteUser(req, { params }) {
//   try {
//     await dbConnect();
    
//     const { id } = await params;
//     const user = await User.findById(id);
    
//     if (!user) {
//       return new Response(
//         JSON.stringify({ 
//           success: false,
//           error: 'User not found' 
//         }),
//         { 
//           status: 404,
//           headers: { 'Content-Type': 'application/json' }
//         }
//       );
//     }
    
//     // Don't allow deleting the last Super Admin
//     const userRole = await Role.findById(user.role);
//     if (userRole?.name === 'Super Admin') {
//       const superAdminCount = await User.countDocuments({ role: user.role });
//       if (superAdminCount <= 1) {
//         return new Response(
//           JSON.stringify({ 
//             success: false,
//             error: 'Cannot delete the last Super Admin user' 
//           }),
//           { 
//             status: 400,
//             headers: { 'Content-Type': 'application/json' }
//           }
//         );
//       }
//     }
    
//     // Delete user and associated account
//     await User.findByIdAndDelete(id);
//     await Account.findOneAndDelete({ email: user.email });
    
//     return new Response(
//       JSON.stringify({ 
//         success: true,
//         message: 'User deleted successfully' 
//       }),
//       { 
//         status: 200,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   } catch (error) {
//     console.error('Error deleting user:', error);
//     return new Response(
//       JSON.stringify({ 
//         success: false,
//         error: 'Failed to delete user',
//         message: error.message 
//       }),
//       { 
//         status: 500,
//         headers: { 'Content-Type': 'application/json' }
//       }
//     );
//   }
// }

// // Export with permission middleware
// export const GET = withPermission('users', 'read')(getUser);
// export const PUT = withPermission('users', 'update')(updateUser);
// export const DELETE = withPermission('users', 'delete')(deleteUser);
