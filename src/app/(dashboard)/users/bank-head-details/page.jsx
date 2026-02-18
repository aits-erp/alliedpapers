"use client";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BankHeadDetails = () => {
  const [accountHeads, setAccountHeads] = useState([]);
  const [formData, setFormData] = useState({
    accountCode: "",
    accountName: "",
    isActualBank: false, // New boolean flag for the actual bank name
    accountHead: "",
    status: "",
  });

  useEffect(() => {
    // Fetch account heads from the API
    const fetchAccountHeads = async () => {
      try {
        const response = await fetch("/api/account-head"); // Adjust the API endpoint as needed
        if (!response.ok) {
          throw new Error("Failed to fetch account heads");
        }
        const data = await response.json();
        console.log("Fetched account heads:", data);
        setAccountHeads(data.data);
      } catch (error) {
        console.error("Error fetching account heads:", error);
      }
    };

    fetchAccountHeads();
  }, []);

  const validateForm = () => {
    if (!formData.accountCode.trim()) {
      toast.error("Account Code is required");
      return false;
    }
    if (!formData.accountName.trim()) {
      toast.error("Account Name is required");
      return false;
    }
    if (!formData.accountHead) {
      toast.error("Please select an Account Head From");
      return false;
    }
    if (!formData.status) {
      toast.error("Please select a status");
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await fetch("/api/bank-head", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success("Bank head details submitted successfully!");
        setFormData({
          accountCode: "",
          accountName: "",
          isActualBank: false,
          accountHead: "",
          status: "",
        });
      } else {
        toast.error(result.message || "Error submitting bank head details");
      }
    } catch (error) {
      console.error("Error submitting bank head details:", error);
      toast.error("Error submitting bank head details");
    }
  };

  const handleClear = () => {
    setFormData({
      accountCode: "",
      accountName: "",
      isActualBank: false,
      accountHead: "",
      status: "",
    });
    toast.info("Form cleared");
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Account Code</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Code
          </label>
          <input
            type="text"
            name="accountCode"
            value={formData.accountCode}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md shadow-sm"
            placeholder="Enter account code"
          />
        </div>
        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Name
          </label>
          <input
            type="text"
            name="accountName"
            value={formData.accountName}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md shadow-sm"
            placeholder="Enter account name"
          />
        </div>
        {/* Actual Bank Name Flag (Checkbox) */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="isActualBank"
            checked={formData.isActualBank}
            onChange={handleInputChange}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">
            Is Actual Bank Name?
          </label>
        </div>
        {/* Account Head From (Selectable) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Head From
          </label>
          <select
            name="accountHead"
            value={formData.accountHead}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md shadow-sm"
          >
            <option value="">Select Account Head From</option>
            {accountHeads.map((option, index) => (
              <option key={option.accountHeadCode || index} value={option.accountHeadCode}>
                {option.accountHeadCode} - {option.accountHeadDescription}
              </option>
            ))}
          </select>
        </div>
        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="mt-1 block w-full p-2 border rounded-md shadow-sm"
          >
            <option value="">Select Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Submit
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default BankHeadDetails;


// "use client";
// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const BankHeadDetails = () => {
//   const [accountHeads, setAccountHeads] = useState([]);
//   const [formData, setFormData] = useState({
//     accountCode: "",
//     accountName: "",
//     accountHead: "", // Use "accountHead" consistently
//     status: "",
//   });

//   useEffect(() => {
//     // Fetch account heads from the API
//     const fetchAccountHeads = async () => {
//       try {
//         const response = await fetch("/api/account-head"); // Adjust the API endpoint as needed
//         if (!response.ok) {
//           throw new Error("Failed to fetch account heads");
//         }
//         const data = await response.json();
//         console.log("Fetched account heads:", data);
//         setAccountHeads(data.data);
//       } catch (error) {
//         console.error("Error fetching account heads:", error);
//       }
//     };

//     fetchAccountHeads();
//   }, []);

//   const validateForm = () => {
//     if (!formData.accountCode.trim()) {
//       toast.error("Account Code is required");
//       return false;
//     }
//     if (!formData.accountName.trim()) {
//       toast.error("Account Name is required");
//       return false;
//     }
//     if (!formData.accountHead) {
//       toast.error("Please select an Account Head From");
//       return false;
//     }
//     if (!formData.status) {
//       toast.error("Please select a status");
//       return false;
//     }
//     return true;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/bank-head", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok && result.success) {
//         toast.success("Bank head details submitted successfully!");
//         setFormData({
//           accountCode: "",
//           accountName: "",
//           accountHead: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting bank head details");
//       }
//     } catch (error) {
//       console.error("Error submitting bank head details:", error);
//       toast.error("Error submitting bank head details");
//     }
//   };

//   const handleClear = () => {
//     setFormData({
//       accountCode: "",
//       accountName: "",
//       accountHead: "",
//       status: "",
//     });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Code</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Code
//           </label>
//           <input
//             type="text"
//             name="accountCode"
//             value={formData.accountCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account code"
//           />
//         </div>
//         {/* Account Name */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Name
//           </label>
//           <input
//             type="text"
//             name="accountName"
//             value={formData.accountName}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account name"
//           />
//         </div>
//         {/* Account Head From (Selectable) */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head From
//           </label>
//           <select
//             name="accountHead"  // Changed from accountHeadFrom to accountHead
//             value={formData.accountHead}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Account Head From</option>
//             {accountHeads.map((option, index) => (
//               <option key={option.accountHeadCode || index} value={option.accountHeadCode}>
//                 {option.accountHeadCode} - {option.accountHeadDescription}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Status
//           </label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Status</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             type="submit"
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Submit
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Clear
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default BankHeadDetails;
