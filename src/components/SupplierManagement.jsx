// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";

// function SupplierManagement({ supplierId, supplierCode }) {
//    const [view, setView] = useState("list");
//   const [supplierList, setSupplierList] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);

//   const filteredSuppliers = supplierList.filter(
//     (supplier) =>
//       supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.emailId.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   const [supplierDetails, setSupplierDetails] = useState({
//     supplierCode: "",
//     supplierName: "",
//     supplierType: "",
//     emailId: "",
//     mobileNumber: "",
//     billingAddress1: "",
//     billingAddress2: "",
//     billingCountry: null,
//     billingState: null,
//     billingCity: "",
//     billingZip: "",
//     shippingAddress1: "",
//     shippingAddress2: "",
//     shippingCountry: null,
//     shippingCity: "",
//     shippingState: null,
//     shippingZip: "",
//     paymentTerms: "",
//     gstNumber: "",
//     pan: "",
//     contactPersonName: "",
//     bankAccountNumber: "",
//     ifscCode: "",
//     leadTime: "",
//     qualityRating: "",
//     supplierCategory: "",
//   });

//   const [isEditing, setIsEditing] = useState(false);

//   useEffect(() => {
//     if (supplierId) {
//       const fetchSupplierDetails = async () => {
//         try {
//           const response = await axios.get(`/api/suppliers/${supplierId}`);
//           setSupplierDetails(response.data);
//         } catch (error) {
//           console.error("Error fetching supplier details:", error);
//         }
//       };
//       fetchSupplierDetails();
//     } else {
//       generateSupplierCode();
//     }
//   }, [supplierId]);

//   const generateSupplierCode = async () => {
//     try {
//       const lastCodeRes = await fetch("/api/lastSupplierCode");
//       const { lastSupplierCode } = await lastCodeRes.json();
//       const lastNumber = parseInt(lastSupplierCode.split("-")[1], 10) || 0;
//       let newNumber = lastNumber + 1;

//       let generatedCode = "";
//       let codeExists = true;

//       while (codeExists) {
//         generatedCode = `SUPP-${newNumber.toString().padStart(4, "0")}`;
//         const checkRes = await axios.get(
//           `/api/checkSupplierCode?code=${generatedCode}`
//         );
//         const { exists } = await checkRes.data;
//         if (!exists) break;
//         newNumber++;
//       }

//       setSupplierDetails((prev) => ({
//         ...prev,
//         supplierCode: generatedCode,
//       }));
//     } catch (error) {
//       console.error("Failed to generate code:", error);
//     }
//   };

//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const handleGroupSelect = (group) => {
//     setSelectedGroup(group);
//     setSupplierDetails((prev) => ({ ...prev, supplierGroup: group.name }));
//   };

//   // Country/State handlers same as Customer component
//   const handleSelectBillingCountry = (country) => {
//     setSupplierDetails((prev) => ({ ...prev, billingCountry: country.name }));
//   };

//   const handleSelectBillingState = (state) => {
//     setSupplierDetails((prev) => ({ ...prev, billingState: state.name }));
//   };

//   const handleSelectShippingCountry = (country) => {
//     setSupplierDetails((prev) => ({ ...prev, shippingCountry: country.name }));
//   };

//   const handleSelectShippingState = (state) => {
//     setSupplierDetails((prev) => ({ ...prev, shippingState: state.name }));
//   };

//   const supplierTypeOptions = [
//     { value: "Manufacturer", label: "Manufacturer" },
//     { value: "Distributor", label: "Distributor" },
//     { value: "Wholesaler", label: "Wholesaler" },
//     { value: "Service", label: "Service" },
//   ];

//   const validate = () => {
//     const requiredFields = [
//       "supplierName",
//       "emailId",
//       "billingAddress1",
//       "billingCity",
//       "billingCountry",
//       "billingState",
//       "billingZip",
//       "bankAccountNumber",
//       "ifscCode",
//     ];

//     for (const field of requiredFields) {
//       if (!supplierDetails[field]) {
//         alert(`Please fill the required field: ${field}`);
//         return false;
//       }
//     }
//     return true;
//   };

//   useEffect(() => {
//     const fetchSuppliers = async () => {
//       try {
//         const response = await axios.get("/api/suppliers");
//         setSupplierList(response.data || []);
//       } catch (err) {
//         console.error("Error fetching suppliers:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchSuppliers();
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       if (isEditing) {
//         const res = await axios.put(
//           `/api/suppliers/${supplierDetails._id}`,
//           supplierDetails
//         );
//         setSuppliers(
//           suppliers.map((supplier) =>
//             supplier._id === supplierDetails._id ? res.data : supplier
//           )
//         );
//         alert("Supplier updated successfully!");
//       } else {
//         const res = await axios.post("/api/suppliers", supplierDetails);
//         setSuppliers([...suppliers, res.data]);
//         alert("Supplier created successfully!");
//       }
//       resetForm();
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert(error.response?.data?.error || "Form submission error");
//     }
//   };

//   const resetForm = () => {
//     setSupplierDetails({
//       supplierCode: "",
//       supplierName: "",
//       supplierGroup: "",
//       supplierType: "",
//       emailId: "",
//       mobileNumber: "",
//       billingAddress1: "",
//       billingAddress2: "",
//       billingCity: "",
//       billingZip: "",
//       shippingAddress1: "",
//       shippingAddress2: "",
//       shippingCity: "",
//       shippingZip: "",
//       paymentTerms: "",
//       gstNumber: "",
//       pan: "",
//       contactPersonName: "",
//       bankAccountNumber: "",
//       ifscCode: "",
//       leadTime: "",
//       qualityRating: "",
//       supplierCategory: "",
//     });
//     setIsEditing(false);
//   };

//   const handleEdit = (supplier) => {
//     setSupplierDetails(supplier);
//     setIsEditing(true);
//   };

//   const handleDelete = async (id) => {
//     if (confirm("Delete this supplier?")) {
//       try {
//         await axios.delete(`/api/suppliers/${id}`);
//         setSuppliers(suppliers.filter((supplier) => supplier._id !== id));
//       } catch (error) {
//         console.error("Error deleting supplier:", error);
//       }
//     }
//   };


  
//   // Filter customers based on search term
//   const filteredCustomers = customers.filter(
//     (supplier) =>
//       supplier.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.emailId?.toLowerCase().includes(searchTerm.toLowerCase())
//   );




//       {/* <h2 className="text-2xl font-bold text-blue-600 mt-12">Supplier List</h2>
//       <div className="mt-6 bg-gray-100 p-6 rounded-lg shadow-lg">
//         <input
//           type="text"
//           placeholder="Search suppliers..."
//           className="mb-4 p-2 border border-gray-300 rounded w-full"
//           value={searchTerm}
//           onChange={(e) => setSearchTerm(e.target.value)}
//         />
//         <table className="table-auto w-full border border-gray-300">
//           <thead className="bg-gray-200">
//             <tr>
//               <th className="p-2 border">Supplier Code</th>
//               <th className="p-2 border">Supplier Name</th>
//               <th className="p-2 border">Email</th>
//               <th className="p-2 border">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {filteredSuppliers.map((supplier) => (
//               <tr key={supplier._id} className="hover:bg-gray-50">
//                 <td className="p-2 border">{supplier.supplierCode}</td>
//                 <td className="p-2 border">{supplier.supplierName}</td>
//                 <td className="p-2 border">{supplier.emailId}</td>
//                 <td className="p-2 border flex gap-2">
//                   <button
//                     onClick={() => handleEdit(supplier)}
//                     className="text-blue-500"
//                   >
//                     <FaEdit />
//                   </button>
//                   <button
//                     onClick={() => handleDelete(supplier._id)}
//                     className="text-red-500"
//                   >
//                     <FaTrash />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div> */}





//  const renderListView = () => (

//  );

  
//       // Render customer form view


      
//   const renderFormView = () => (
//     <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//       <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//         {isEditing ? "Edit Supplier" : "Create Supplier"}
//       </h1>

//       <form className="space-y-6" onSubmit={handleSubmit}>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Supplier Code
//             </label>
//             <input
//               type="text"
//               value={supplierDetails.supplierCode}
//               readOnly
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Supplier Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               value={supplierDetails.supplierName}
//               onChange={(e) =>
//                 setSupplierDetails({
//                   ...supplierDetails,
//                   supplierName: e.target.value,
//                 })
//               }
//               required
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Supplier Category
//             </label>
//             <GroupSearch onSelectGroup={handleGroupSelect} />
//           </div>

//           <div>
//             <label className="text-sm font-medium text-gray-700 mb-2">
//               Supplier Type
//             </label>
//             <select
//               value={supplierDetails.supplierType}
//               onChange={(e) =>
//                 setSupplierDetails({
//                   ...supplierDetails,
//                   supplierType: e.target.value,
//                 })
//               }
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full"
//             >
//               {supplierTypeOptions.map((option) => (
//                 <option key={option.value} value={option.value}>
//                   {option.label}
//                 </option>
//               ))}
//             </select>
//           </div>

//           {/* Add remaining supplier-specific fields following same pattern */}
//           {/* Include banking details, quality ratings, lead times, etc. */}

          
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Email ID <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="email"
//                 value={supplierDetails.emailId}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     emailId: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Mobile Number
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.mobileNumber}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     mobileNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Billing Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={supplierDetails.billingAddress1}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={supplierDetails.billingAddress2}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={supplierDetails.billingCity}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectBillingCountry}
//                 onSelectState={handleSelectBillingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={supplierDetails.billingZip}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     billingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Shipping Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={supplierDetails.shippingAddress1}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={supplierDetails.shippingAddress2}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={supplierDetails.shippingCity}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectShippingCountry}
//                 onSelectState={handleSelectShippingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={supplierDetails.shippingZip}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     shippingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
          
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Payment Terms
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.paymentTerms}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     paymentTerms: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST Number
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.gstNumber}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     gstNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST Category
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.gstCategory}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     gstCategory: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 PAN
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.pan}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     pan: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Contact Person Name
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.contactPersonName}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     contactPersonName: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//             {/* Supplier Specific Fields */}
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Bank Account Number <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.bankAccountNumber}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     bankAccountNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 IFSC Code <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={supplierDetails.ifscCode}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     ifscCode: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Lead Time (Days)
//               </label>
//               <input
//                 type="number"
//                 value={supplierDetails.leadTime}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     leadTime: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Quality Rating
//               </label>
//               <select
//                 value={supplierDetails.qualityRating}
//                 onChange={(e) =>
//                   setSupplierDetails({
//                     ...supplierDetails,
//                     qualityRating: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Select Rating</option>
//                 <option value="A">Excellent (A)</option>
//                 <option value="B">Good (B)</option>
//                 <option value="C">Average (C)</option>
//                 <option value="D">Poor (D)</option>
//               </select>
//             </div>

          
         
//         </div>

//         <div className="flex gap-3 mt-8">
//           <button
//             type="submit"
//             className={`px-6 py-3 text-white rounded-lg ${
//               isEditing ? "bg-blue-600" : "bg-green-600"
//             }`}
//           >
//             {isEditing ? "Update Supplier" : "Create Supplier"}
//           </button>
//           <button
//             type="button"
//             onClick={resetForm}
//             className="bg-gray-600 text-white rounded-lg px-6 py-3"
//           >
//             Cancel
//           </button>
//         </div>
//       </form>

//     </div>
//   );

//   return view === "list" ? renderListView() : renderFormView();
// }

// export default SupplierManagement;



//===============================================================================================

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";

// function SupplierManagement() {
//   // State management
//   const [view, setView] = useState("list"); // 'list' or 'form'
//   const [suppliers, setSuppliers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const [supplierDetails, setSupplierDetails] = useState({
//     supplierCode: "",
//     supplierName: "",
//     supplierGroup: "",
//     supplierType: "",
//     emailId: "",
//     mobileNumber: "",
//     billingAddress1: "",
//     billingAddress2: "",
//     billingCountry: "",
//     billingState: "",
//     billingCity: "",
//     billingZip: "",
//     shippingAddress1: "",
//     shippingAddress2: "",
//     shippingCountry: "",
//     shippingCity: "",
//     shippingState: "",
//     shippingZip: "",
//     paymentTerms: "",
//     gstNumber: "",
//     pan: "",
//     contactPersonName: "",
//     bankAccountNumber: "",
//     ifscCode: "",
//     leadTime: "",
//     qualityRating: "",
//      supplierCategory: "",
//     gstCategory: "",
//   });

//   // Fetch suppliers on mount
//   useEffect(() => {
//     fetchSuppliers();
//   }, []);

//   const fetchSuppliers = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("/api/suppliers");
//       setSuppliers(response.data || []);
//     } catch (err) {
//       setError("Unable to fetch suppliers. Please try again.");
//       console.error("Error fetching suppliers:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate supplier code for new suppliers
//   const generateSupplierCode = async () => {
//     try {
//       const lastCodeRes = await fetch("/api/lastSupplierCode");
//       const { lastSupplierCode } = await lastCodeRes.json();
//       const lastNumber = parseInt(lastSupplierCode.split("-")[1], 10) || 0;
//       let newNumber = lastNumber + 1;

//       let generatedCode = "";
//       let codeExists = true;

//       while (codeExists) {
//         generatedCode = `SUPP-${newNumber.toString().padStart(4, "0")}`;
//         const checkRes = await fetch(
//           `/api/checkSupplierCode?code=${generatedCode}`
//         );
//         const { exists } = await checkRes.json();
//         if (!exists) break;
//         newNumber++;
//       }

//       setSupplierDetails(prev => ({
//         ...prev,
//         supplierCode: generatedCode,
//       }));
//     } catch (error) {
//       console.error("Failed to generate code:", error);
//     }
//   };

//   // Handle group selection
//   const handleGroupSelect = (group) => {
//     setSupplierDetails(prev => ({ 
//       ...prev, 
//       supplierGroup: group.name 
//     }));
//   };

//   // Handle form field changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setSupplierDetails(prev => ({ ...prev, [name]: value }));
//   };

//   // Form validation
//   const validate = () => {
//     const requiredFields = [
//       "supplierName",
//       "emailId",
//       "billingAddress1",
//       "billingCity",
//       "billingCountry",
//       "billingState",
//       "billingZip",
//       "bankAccountNumber",
//       "ifscCode",
//     ];

//     for (const field of requiredFields) {
//       if (!supplierDetails[field]) {
//         alert(`Please fill the required field: ${field}`);
//         return false;
//       }
//     }
//     return true;
//   };

//   // Form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       if (supplierDetails._id) {
//         // Update existing supplier
//         const res = await axios.put(
//           `/api/suppliers/${supplierDetails._id}`,
//           supplierDetails
//         );
//         setSuppliers(suppliers.map(s => 
//           s._id === supplierDetails._id ? res.data : s
//         ));
//         alert("Supplier updated successfully!");
//       } else {
//         // Create new supplier
//         const res = await axios.post("/api/suppliers", supplierDetails);
//         setSuppliers([...suppliers, res.data]);
//         alert("Supplier created successfully!");
//       }
//       setView("list");
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert(error.response?.data?.error || "There was an error submitting the form.");
//     }
//   };

//   // Reset form and switch to list view
//   const resetForm = () => {
//     setSupplierDetails({
//       supplierCode: "",
//       supplierName: "",
//       supplierGroup: "",
//       supplierType: "",
//       emailId: "",
//       mobileNumber: "",
//       billingAddress1: "",
//       billingAddress2: "",
//       billingCountry: "",
//       billingState: "",
//       billingCity: "",
//       billingZip: "",
//       shippingAddress1: "",
//       shippingAddress2: "",
//       shippingCountry: "",
//       shippingCity: "",
//       shippingState: "",
//       shippingZip: "",
//       paymentTerms: "",
//       gstNumber: "",
//       pan: "",
//       contactPersonName: "",
//       bankAccountNumber: "",
//       ifscCode: "",
//       leadTime: "",
//       qualityRating: "",
//        supplierCategory: "",
//       gstCategory: "",
//     });
//     setView("list");
//   };

//   // Edit supplier handler
//   const handleEdit = (supplier) => {
//     setSupplierDetails(supplier);
//     setView("form");
//   };

//   // Delete supplier handler
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this supplier?")) return;
    
//     try {
//       await axios.delete(`/api/suppliers/${id}`);
//       setSuppliers(suppliers.filter(supplier => supplier._id !== id));
//       alert("Supplier deleted successfully!");
//     } catch (error) {
//       console.error("Error deleting supplier:", error);
//       alert("Failed to delete supplier. Please try again.");
//     }
//   };

//   // Filter suppliers based on search term
//   const filteredSuppliers = suppliers.filter(
//     (supplier) =>
//       supplier.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       supplier.emailId?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Supplier type options
//   const supplierTypeOptions = [
//     { value: "Manufacturer", label: "Manufacturer" },
//     { value: "Distributor", label: "Distributor" },
//     { value: "Wholesaler", label: "Wholesaler" },
//     { value: "Service", label: "Service" },
//   ];

//   // Quality rating options
//   const qualityRatingOptions = [
//     { value: "A", label: "Excellent (A)" },
//     { value: "B", label: "Good (B)" },
//     { value: "C", label: "Average (C)" },
//     { value: "D", label: "Poor (D)" },
//   ];

//   // Render supplier list view
//   const renderListView = () => (
//     <div className="p-6 bg-white rounded-lg shadow-lg">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold text-gray-800">Supplier Management</h1>
//         <button
//           onClick={() => {
//             generateSupplierCode();
//             setView("form");
//           }}
//           className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center"
//         >
//           <FaPlus className="mr-2" /> Create Supplier
//         </button>
//       </div>

//       <div className="mb-6 relative">
//         <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
//           <input
//             type="text"
//             placeholder="Search suppliers..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="py-2 px-4 w-full focus:outline-none"
//           />
//           <FaSearch className="text-gray-500 mx-4" />
//         </div>
//       </div>

//       {loading ? (
//         <p>Loading suppliers...</p>
//       ) : error ? (
//         <p className="text-red-500">{error}</p>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full bg-white">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="py-3 px-4 text-left">Code</th>
//                 <th className="py-3 px-4 text-left">Name</th>
//                 <th className="py-3 px-4 text-left">Email</th>
//                 <th className="py-3 px-4 text-left">Phone</th>
//                 <th className="py-3 px-4 text-left">Group</th>
//                 <th className="py-3 px-4 text-left">Type</th>
//                 <th className="py-3 px-4 text-left">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredSuppliers.map((supplier) => (
//                 <tr key={supplier._id} className="border-b hover:bg-gray-50">
//                   <td className="py-3 px-4">{supplier.supplierCode}</td>
//                   <td className="py-3 px-4">{supplier.supplierName}</td>
//                   <td className="py-3 px-4">{supplier.emailId}</td>
//                   <td className="py-3 px-4">{supplier.mobileNumber}</td>
//                   <td className="py-3 px-4">{supplier.supplierGroup}</td>
//                   <td className="py-3 px-4">{supplier.supplierType}</td>
//                   <td className="py-3 px-4 flex space-x-2">
//                     <button
//                       onClick={() => handleEdit(supplier)}
//                       className="text-blue-600 hover:text-blue-800"
//                     >
//                       <FaEdit />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(supplier._id)}
//                       className="text-red-600 hover:text-red-800"
//                     >
//                       <FaTrash />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );

//   // Render supplier form view
//   const renderFormView = () => (
//     <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//       <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//         {supplierDetails._id ? "Edit Supplier" : "Create Supplier"}
//       </h1>

//       <form className="space-y-6" onSubmit={handleSubmit}>
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Supplier Code
//             </label>
//             <input
//               type="text"
//               value={supplierDetails.supplierCode}
//               readOnly
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Supplier Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               name="supplierName"
//               value={supplierDetails.supplierName}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Supplier Group
//             </label>
//             <GroupSearch 
//               onSelectGroup={handleGroupSelect}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Supplier Type
//             </label>
//             <select
//               name="supplierType"
//               value={supplierDetails.supplierType}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">Select Type</option>
//               {supplierTypeOptions.map((option) => (
//                 <option key={option.value} value={option.value}>
//                   {option.label}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Supplier Category
//             </label>
//             <input
//               type="text"
//               name="supplierCategory"
//               value={supplierDetails.supplierCategory}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
     

          

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Email ID <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="email"
//               name="emailId"
//               value={supplierDetails.emailId}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Mobile Number
//             </label>
//             <input
//               type="text"
//               name="mobileNumber"
//               value={supplierDetails.mobileNumber}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//           <div className="border p-4 rounded-lg">
//             <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Address Line 1 <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="billingAddress1"
//                   value={supplierDetails.billingAddress1}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Address Line 2
//                 </label>
//                 <input
//                   type="text"
//                   name="billingAddress2"
//                   value={supplierDetails.billingAddress2}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   City <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="billingCity"
//                   value={supplierDetails.billingCity}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Country/State <span className="text-red-500">*</span>
//                 </label>
//                 <CountryStateSearch
//                   onSelectCountry={(country) => 
//                     setSupplierDetails(prev => ({ 
//                       ...prev, 
//                       billingCountry: country.name 
//                     }))
//                   }
//                   onSelectState={(state) => 
//                     setSupplierDetails(prev => ({ 
//                       ...prev, 
//                       billingState: state.name 
//                     }))
//                   }
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   ZIP Code <span className="text-red-500">*</span>
//                 </label>
//                 <input
//                   type="text"
//                   name="billingZip"
//                   value={supplierDetails.billingZip}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                   required
//                 />
//               </div>
//             </div>
//           </div>

//           <div className="border p-4 rounded-lg">
//             <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
//             <div className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Address Line 1
//                 </label>
//                 <input
//                   type="text"
//                   name="shippingAddress1"
//                   value={supplierDetails.shippingAddress1}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Address Line 2
//                 </label>
//                 <input
//                   type="text"
//                   name="shippingAddress2"
//                   value={supplierDetails.shippingAddress2}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   City
//                 </label>
//                 <input
//                   type="text"
//                   name="shippingCity"
//                   value={supplierDetails.shippingCity}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   Country/State
//                 </label>
//                 <CountryStateSearch
//                   onSelectCountry={(country) => 
//                     setSupplierDetails(prev => ({ 
//                       ...prev, 
//                       shippingCountry: country.name 
//                     }))
//                   }
//                   onSelectState={(state) => 
//                     setSupplierDetails(prev => ({ 
//                       ...prev, 
//                       shippingState: state.name 
//                     }))
//                   }
//                 />
//               </div>
              
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">
//                   ZIP Code
//                 </label>
//                 <input
//                   type="text"
//                   name="shippingZip"
//                   value={supplierDetails.shippingZip}
//                   onChange={handleChange}
//                   className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Payment Terms
//             </label>
//             <input
//               type="text"
//               name="paymentTerms"
//               value={supplierDetails.paymentTerms}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               GST Number
//             </label>
//             <input
//               type="text"
//               name="gstNumber"
//               value={supplierDetails.gstNumber}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               PAN
//             </label>
//             <input
//               type="text"
//               name="pan"
//               value={supplierDetails.pan}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Contact Person
//             </label>
//             <input
//               type="text"
//               name="contactPersonName"
//               value={supplierDetails.contactPersonName}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Bank Account <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               name="bankAccountNumber"
//               value={supplierDetails.bankAccountNumber}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               IFSC Code <span className="text-red-500">*</span>
//             </label>
//             <input
//               type="text"
//               name="ifscCode"
//               value={supplierDetails.ifscCode}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               required
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Lead Time (Days)
//             </label>
//             <input
//               type="number"
//               name="leadTime"
//               value={supplierDetails.leadTime}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Quality Rating
//             </label>
//             <select
//               name="qualityRating"
//               value={supplierDetails.qualityRating}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">Select Rating</option>
//               {qualityRatingOptions.map(option => (
//                 <option key={option.value} value={option.value}>
//                   {option.label}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Gst Category
//             </label>
//             <input
//               type="text"
//               name="gstCategory"
//               value={supplierDetails.gstCategory}
//               onChange={handleChange}
//               className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>

//         <div className="flex gap-3 mt-8">
//           <button
//             type="submit"
//             className={`px-6 py-3 text-white rounded-lg focus:outline-none ${
//               supplierDetails._id ? "bg-blue-600" : "bg-green-600"
//             } hover:${supplierDetails._id ? "bg-blue-700" : "bg-green-700"}`}
//           >
//             {supplierDetails._id ? "Update Supplier" : "Create Supplier"}
//           </button>
//           <button
//             type="button"
//             onClick={resetForm}
//             className="bg-gray-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
//           >
//             Cancel
//           </button>
//         </div>
//       </form>
//     </div>
//   );

//   return view === "list" ? renderListView() : renderFormView();
// }

// export default SupplierManagement;
//===============================================================================================
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";

export default function SupplierManagement() {
  const [view, setView] = useState("list");
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [errors, setErrors] = useState({});
  const [supplierDetails, setSupplierDetails] = useState({
    supplierCode: "",
    supplierName: "",
    supplierType: "",
    supplierGroup: "",
    supplierCategory: "",
    emailId: "",
    mobileNumber: "",
    contactPersonName: "",
    billingAddresses: [{ address1: "", address2: "", city: "", state: "", country: "", pin: "" }],
    shippingAddresses: [{ address1: "", address2: "", city: "", state: "", country: "", pin: "" }],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    bankName: "",
    branch: "",
    bankAccountNumber: "",
    ifscCode: "",
    leadTime: "",
    qualityRating: "B",
    glAccount: null
  });

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await axios.get("/api/suppliers");
      setSuppliers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const generateSupplierCode = async () => {
    try {
      const { data } = await axios.get("/api/lastSupplierCode");
      const num = parseInt(data.lastSupplierCode.split("-")[1] || "0", 10) + 1;
      setSupplierDetails(prev => ({ ...prev, supplierCode: `SUPP-${num.toString().padStart(4, "0")}` }));
    } catch {}
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setSupplierDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...supplierDetails[key]];
    arr[idx][field] = value;
    setSupplierDetails(prev => ({ ...prev, [key]: arr }));
  };

  const addAddress = type => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setSupplierDetails(prev => ({
      ...prev,
      [key]: [...prev[key], { address1: "", address2: "", city: "", state: "", country: "", pin: "" }]
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (supplierDetails[key].length === 1) return;
    setSupplierDetails(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  const validate = () => {
    const errs = {};
    if (!supplierDetails.supplierName) errs.supplierName = "Supplier Name is required";
    if (!supplierDetails.supplierType) errs.supplierType = "Supplier Type is required";
    if (!supplierDetails.supplierGroup) errs.supplierGroup = "Supplier Group is required";
    if (!supplierDetails.pan) errs.pan = "PAN is required";
    if (!supplierDetails.gstCategory) errs.gstCategory = "GST Category is required";
    if (!supplierDetails.glAccount || !supplierDetails.glAccount._id) errs.glAccount = "GL Account is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };


  const handleSubmit = async e => {
    e.preventDefault();
     if (!validate()) return;
    const payload = { ...supplierDetails, glAccount: supplierDetails.glAccount?._id || null };
    try {
      let res;
      if (supplierDetails._id) {
        res = await axios.put(`/api/suppliers/${supplierDetails._id}`, payload);
        setSuppliers(prev => prev.map(s => (s._id === res.data._id ? res.data : s)));
      } else {
        res = await axios.post("/api/suppliers", payload);
        setSuppliers(prev => [...prev, res.data]);
      }
      setView("list");
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

   const getFieldError = field => errors[field] && <p className="text-red-500 text-sm mt-1">{errors[field]}</p>;
  const handleEdit = s => { setSupplierDetails(s); setView("form"); };
  const handleDelete = async id => { if (!confirm("Are you sure?")) return; await axios.delete(`/api/suppliers/${id}`); setSuppliers(prev => prev.filter(s => s._id !== id)); };

  const filtered = suppliers.filter(s =>
    [s.supplierCode, s.supplierName, s.emailId, s.supplierType, s.supplierGroup]
      .some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderListView = () => (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Supplier Management</h1>
        <button onClick={() => { generateSupplierCode(); setView("form"); }} className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md">
          <FaPlus className="mr-2" /> Add Supplier
        </button>
      </div>
      <div className="mb-4 relative max-w-md">
        <input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search suppliers..."
          className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
        />
        <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Code", "Name", "Email", "Type", "Group", "Actions"].map(h => (
                <th key={h} className="px-4 py-2 text-left text-sm font-medium text-gray-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map(s => (
              <tr key={s._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{s.supplierCode}</td>
                <td className="px-4 py-2">{s.supplierName}</td>
                <td className="px-4 py-2">{s.emailId}</td>
                <td className="px-4 py-2">{s.supplierType}</td>
                <td className="px-4 py-2">{s.supplierGroup}</td>
                <td className="px-4 py-2 flex space-x-3">
                  <button onClick={() => handleEdit(s)} className="text-blue-600"><FaEdit /></button>
                  <button onClick={() => handleDelete(s._id)} className="text-red-600"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

const renderFormView = () => (
  <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
    <h2 className="text-2xl font-semibold mb-6 text-center">
      {supplierDetails._id ? "Edit Supplier" : "New Supplier"}
    </h2>
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Code
          </label>
          <input
            name="supplierCode"
            value={supplierDetails.supplierCode}
            readOnly
            className="w-full border rounded-md p-2 bg-gray-100"
          />
          {getFieldError("supplierCode")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Name <span className="text-red-500">*</span>
          </label>
          <input
            name="supplierName"
            value={supplierDetails.supplierName}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
          {getFieldError("supplierName")}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Group <span className="text-red-500">*</span>
          </label>
          <GroupSearch
            value={supplierDetails.supplierGroup}
            onSelectGroup={(g) => 
              setSupplierDetails(prev => ({ ...prev, supplierGroup: g?.name || "" }))
            }
          />
          {getFieldError("supplierGroup")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier Type <span className="text-red-500">*</span>
          </label>
          <select
            name="supplierType"
            value={supplierDetails.supplierType}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option>Manufacturer</option>
            <option>Distributor</option>
            <option>Wholesaler</option>
            <option>Service Provider</option>
          </select>
          {getFieldError("supplierType")}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email ID <span className="text-red-500">*</span>
          </label>
          <input
            name="emailId"
            type="email"
            value={supplierDetails.emailId}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mobile Number
          </label>
          <input
            name="mobileNumber"
            type="text"
            value={supplierDetails.mobileNumber}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contact Person
          </label>
          <input
            name="contactPersonName"
            value={supplierDetails.contactPersonName}
            onChange={handleChange}
            placeholder="Contact Person"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold">Billing Addresses</h3>
      {supplierDetails.billingAddresses.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Billing Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("billing", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1}
              onChange={(e) =>
                handleAddressChange("billing", i, "address1", e.target.value)
              }
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2}
              onChange={(e) =>
                handleAddressChange("billing", i, "address2", e.target.value)
              }
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city}
              onChange={(e) =>
                handleAddressChange("billing", i, "city", e.target.value)
              }
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin}
              onChange={(e) =>
                handleAddressChange("billing", i, "pin", e.target.value)
              }
              placeholder="ZIP"
              className="border p-2 rounded"
            />
            <CountryStateSearch
              onSelectCountry={(c) =>
                handleAddressChange("billing", i, "country", c.name)
              }
              onSelectState={(s) =>
                handleAddressChange("billing", i, "state", s.name)
              }
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("billing")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Billing Address
      </button>

      <h3 className="text-lg font-semibold">Shipping Addresses</h3>
      {supplierDetails.shippingAddresses.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Shipping Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("shipping", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1}
              onChange={(e) =>
                handleAddressChange("shipping", i, "address1", e.target.value)
              }
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2}
              onChange={(e) =>
                handleAddressChange("shipping", i, "address2", e.target.value)
              }
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city}
              onChange={(e) =>
                handleAddressChange("shipping", i, "city", e.target.value)
              }
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin}
              onChange={(e) =>
                handleAddressChange("shipping", i, "pin", e.target.value)
              }
              placeholder="ZIP"
              className="border p-2 rounded"
            />
            <CountryStateSearch
              onSelectCountry={(c) =>
                handleAddressChange("shipping", i, "country", c.name)
              }
              onSelectState={(s) =>
                handleAddressChange("shipping", i, "state", s.name)
              }
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("shipping")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Shipping Address
      </button>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Terms
          </label>
          <input
            name="paymentTerms"
            value={supplierDetails.paymentTerms}
            onChange={handleChange}
            placeholder="Payment Terms"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Number
          </label>
          <input
            name="gstNumber"
            value={supplierDetails.gstNumber}
            onChange={handleChange}
            placeholder="GST Number"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Category <span className="text-red-500">*</span>
          </label>
          <select
            name="gstCategory"
            value={supplierDetails.gstCategory}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select GST Category</option>
            <option value="Registered Regular">Registered Regular</option>
            <option value="Registered Composition">Registered Composition</option>
            <option value="Unregistered">Unregistered</option>
            <option value="SEZ">SEZ</option>
            <option value="Overseas">Overseas</option>
            <option value="Deemed Export">Deemed Export</option>
            <option value="UIN Holders">UIN Holders</option>
            <option value="Tax Deductor">Tax Deductor</option>
            <option value="Tax Collector">Tax Collector</option>
            <option value="Input Service Distributor">Input Service Distributor</option>
          </select>
          {getFieldError("gstCategory")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            PAN <span className="text-red-500">*</span>
          </label>
          <input
            name="pan"
            value={supplierDetails.pan}
            onChange={handleChange}
            placeholder="PAN"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
          {getFieldError("pan")}
        </div>
        <div>
    
          <AccountSearch
          value={supplierDetails.glAccount}
          onSelect={(selected) => {
            setSupplierDetails(prev => ({
              ...prev,
              glAccount: selected,
            }));
          }}
        />
          {getFieldError("glAccount")}
          
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bank Name
          </label>
          <input
            name="bankName"
            value={supplierDetails.bankName}
            onChange={handleChange}
            placeholder="Bank Name"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Branch
          </label>
          <input
            name="branch"
            value={supplierDetails.branch}
            onChange={handleChange}
            placeholder="Branch"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account Number
          </label>
          <input
            name="bankAccountNumber"
            value={supplierDetails.bankAccountNumber}
            onChange={handleChange}
            placeholder="Account Number"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            IFSC Code
          </label>
          <input
            name="ifscCode"
            value={supplierDetails.ifscCode}
            onChange={handleChange}
            placeholder="IFSC Code"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={() => setView("list")}
          className="px-4 py-2 bg-gray-500 text-white rounded-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-md"
        >
          {supplierDetails._id ? "Update" : "Create"}
        </button>
      </div>
    </form>
  </div>
);
  return view === "list" ? renderListView() : renderFormView();
}