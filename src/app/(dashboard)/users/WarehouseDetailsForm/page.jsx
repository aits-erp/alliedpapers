"use client";
import React, { useState } from "react";
import axios from "axios";
import CountryStateSearch from "@/components/CountryStateSearch";

const WarehouseDetailsForm = () => {
  const initialFormData = {
    warehouseCode: "",
    warehouseName: "",
    parentWarehouse: "",
    account: "",
    company: "",
    phoneNo: "",
    mobileNo: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pin: "",
    warehouseType: "",
    defaultInTransit: false,
    country: "",
  };

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});


  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSelectCountry = (country) => {
    setFormData({ ...formData, country, state: "" });
  };

  const handleSelectState = (state) => {
    setFormData({ ...formData, state });
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      "warehouseCode",
      "warehouseName",
      "account",
      "company",
      "phoneNo",
      "addressLine1",
      // "addressLine2",
      "city",
      "state",
      "pin",
      "country",
      "warehouseType",
    ];
    requiredFields.forEach((field) => {
      if (!formData[field]) newErrors[field] = "This field is required.";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   if (validateForm()) {
  //     console.log("Warehouse details submitted successfully:", formData);
  //     alert("Warehouse details submitted successfully!");
  //     setFormData(initialFormData);
  //   }
  // };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await axios.post("/api/warehouse", formData, {
        headers: { "Content-Type": "application/json" },
      });
      alert("Warehouse details submitted successfully!");
      setFormData(initialFormData);
    } catch (error) {
      console.error("Error submitting warehouse details:", error);
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg"
    >
      <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/** Warehouse Code */}
        <InputField
          label="Warehouse Code"
          name="warehouseCode"
          value={formData.warehouseCode}
          onChange={handleChange}
          error={errors.warehouseCode}
        />

        {/** Warehouse Name */}
        <InputField
          label="Warehouse Name"
          name="warehouseName"
          value={formData.warehouseName}
          onChange={handleChange}
          error={errors.warehouseName}
        />

        {/** Parent Warehouse */}
        <InputField
          label="Parent Warehouse"
          name="parentWarehouse"
          value={formData.parentWarehouse}
          onChange={handleChange}
        />

        {/** Account */}
        <InputField
          label="Account"
          name="account"
          value={formData.account}
          onChange={handleChange}
          error={errors.account}
        />

        {/** Company */}
        <InputField
          label="Company"
          name="company"
          value={formData.company}
          onChange={handleChange}
          error={errors.company}
        />

        {/** Phone No */}
        <InputField
          label="Phone No"
          name="phoneNo"
          value={formData.phoneNo}
          onChange={handleChange}
          error={errors.phoneNo}
        />

        {/** Mobile No */}
        <InputField
          label="Mobile No"
          name="mobileNo"
          value={formData.mobileNo}
          onChange={handleChange}
        />

        {/** Address Line 1 */}
        <InputField
          label="Address Line 1"
          name="addressLine1"
          value={formData.addressLine1}
          onChange={handleChange}
          error={errors.addressLine1}
        />

        {/** Address Line 2 */}
        <InputField
          label="Address Line 2"
          name="addressLine2"
          value={formData.addressLine2}
          onChange={handleChange}
        />

        {/** City */}
        <InputField
          label="City"
          name="city"
          value={formData.city}
          onChange={handleChange}
          error={errors.city}
        />

        {/** PIN */}
        <InputField
          label="PIN"
          name="pin"
          value={formData.pin}
          onChange={handleChange}
          error={errors.pin}
        />

        {/** Country & State Selection */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Country & State
          </label>
          <CountryStateSearch
            selectedCountry={formData.country}
            selectedState={formData.state}
            onSelectCountry={handleSelectCountry}
            onSelectState={handleSelectState}
          />
          {errors.country && (
            <span className="text-red-500 text-sm">{errors.country}</span>
          )}
          {errors.state && (
            <span className="text-red-500 text-sm">{errors.state}</span>
          )}
        </div>

        {/** Warehouse Type */}
        <InputField
          label="Warehouse Type"
          name="warehouseType"
          value={formData.warehouseType}
          onChange={handleChange}
          error={errors.warehouseType}
        />

        {/** Default In Transit */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="defaultInTransit"
            checked={formData.defaultInTransit}
            onChange={handleChange}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-700">
            Default In Transit
          </label>
        </div>
      </div>

   {/* Submit Button */}
   <div className="mt-6 flex justify-end gap-4">
        <button
          type="submit"
          className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
};

/** Reusable Input Field Component */
const InputField = ({ label, name, value, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      className="mt-1 p-2 w-full border rounded"
    />
    {error && <span className="text-red-500 text-sm">{error}</span>}
  </div>
);

export default WarehouseDetailsForm;



// "use client";
// import React, { useState } from "react";
// import CountryStateSearch from "@/components/CountryStateSearch";

// const WarehouseDetailsForm = () => {
//   const initialFormData = {
//     warehouseCode: "",
//     warehouseName: "",
//     parentWarehouse: "",
//     account: "",
//     company: "",
//     phoneNo: "",
//     mobileNo: "",
//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     country: "",  // Added country field
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const handleCountryStateChange = (selected, field) => {
//     setFormData({ ...formData, [field]: selected });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.warehouseCode) newErrors.warehouseCode = "This field is required.";
//     if (!formData.warehouseName) newErrors.warehouseName = "This field is required.";
//     if (!formData.account) newErrors.account = "This field is required.";
//     if (!formData.phoneNo) newErrors.phoneNo = "This field is required.";
//     if (!formData.addressLine1) newErrors.addressLine1 = "This field is required.";
//     if (!formData.city) newErrors.city = "This field is required.";
//     if (!formData.state) newErrors.state = "This field is required.";
//     if (!formData.country) newErrors.country = "This field is required.";
//     if (!formData.pin) newErrors.pin = "This field is required.";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;

//     try {
//       const response = await fetch("/api/warehouse", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       if (!response.ok) throw new Error("Failed to save warehouse details.");
      
//       alert("Warehouse details submitted successfully!");
//       setFormData(initialFormData);
//     } catch (error) {
//       console.error(error);
//       alert("Error saving warehouse details.");
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[
//           { label: "Warehouse Code", name: "warehouseCode", type: "text", required: true },
//           { label: "Warehouse Name", name: "warehouseName", type: "text", required: true },
//           { label: "Parent Warehouse", name: "parentWarehouse", type: "text" },
//           { label: "Account", name: "account", type: "text", required: true },
//           { label: "Company", name: "company", type: "text" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}

//         {/* Country and State Fields with Searchable Dropdowns */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">Country</label>
//           <CountryStateSearch
//             field="country"
//             value={formData.country}
//             onChange={handleCountryStateChange}
//           />
//           {errors.country && <span className="text-red-500 text-sm">{errors.country}</span>}
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700">State</label>
//           <CountryStateSearch
//             field="state"
//             value={formData.state}
//             onChange={handleCountryStateChange}
//           />
//           {errors.state && <span className="text-red-500 text-sm">{errors.state}</span>}
//         </div>
//       </div>

//       <div className="mt-6 flex justify-end gap-4">
//         <button
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Save
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={() => setFormData(initialFormData)}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default WarehouseDetailsForm;




// "use client"
// import React, { useState } from "react";
// import CountryStateSearch from "@/components/CountryStateSearch";
// const WarehouseDetailsForm = () => {
//   const initialFormData = {
//     warehouseCode:"",
//     warehouseName: "",
//     parentWarehouse: "",
//     account: "",
//     company: "",
//     phoneNo: "",
//     mobileNo: "",
//     addressLine1: "",
//     addressLine2: "",
//     city: "",
//     state: "",
//     pin: "",
//     warehouseType: "",
//     defaultInTransit: false,
//   };

//   const [formData, setFormData] = useState(initialFormData);
//   const [errors, setErrors] = useState({});

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === "checkbox" ? checked : value,
//     });
//   };

//   const validateForm = () => {
//     const newErrors = {};
//     if (!formData.warehouseCode) newErrors.warehouseCode = "This field is required.";
//     if (!formData.warehouseName) newErrors.warehouseName = "This field is required.";
//     if (!formData.account) newErrors.account = "This field is required.";
//     if (!formData.phoneNo) newErrors.phoneNo = "This field is required.";
//     if (!formData.addressLine1) newErrors.addressLine1 = "This field is required.";
//     if (!formData.city) newErrors.city = "This field is required.";
//     if (!formData.state) newErrors.state = "This field is required.";
//     if (!formData.pin) newErrors.pin = "This field is required.";
//     setErrors(newErrors);
//     return Object.keys(newErrors).length === 0;
//   };

//   const handleSubmit = (e) => {
//     e.preventDefault();
//     if (validateForm()) {
//       console.log("Warehouse details submitted successfully:", formData);
//       alert("Warehouse details submitted successfully!");
//       setFormData(initialFormData); // Reset form data after successful submission
//     }
//   };

//   const handleCancel = () => {
//     setFormData(initialFormData); // Reset form data when canceling
//   };

//   return (
//     <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
//       <h1 className="text-2xl font-semibold mb-4">Warehouse Details</h1>

//       {/* Warehouse Details Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         {[ 
//           { label: "Warehouse Code", name: "warehouseCode", type: "text", required: true },
//           { label: "Warehouse Name", name: "warehouseName", type: "text", required: true },
//           { label: "Parent Warehouse", name: "parentWarehouse", type: "text" },
//           { label: "Account", name: "account", type: "text", required: true },
//           { label: "Company", name: "company", type: "text" },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>

//       {/* Warehouse Contact Info Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
//         {[ 
//           { label: "Phone No", name: "phoneNo", type: "text", required: true },
//           { label: "Mobile No", name: "mobileNo", type: "text" },
//           { label: "Address Line 1", name: "addressLine1", type: "text", required: true },
//           { label: "Address Line 2", name: "addressLine2", type: "text" },
//           { label: "City", name: "city", type: "text", required: true },
//           { label: "State", name: "state", type: "text", required: true },
//           { label: "Pin", name: "pin", type: "text", required: true },
//         ].map(({ label, name, type, required }) => (
//           <div key={name}>
//             <label className="block text-sm font-medium text-gray-700">{label}</label>
//             <input
//               type={type}
//               name={name}
//               value={formData[name]}
//               onChange={handleChange}
//               className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
//               placeholder={`Enter ${label}`}
//               required={required}
//             />
//             {errors[name] && <span className="text-red-500 text-sm">{errors[name]}</span>}
//           </div>
//         ))}
//       </div>

//       {/* Warehouse Transit Section */}
//       <div className="mt-6">
//         <div className="flex items-center">
//           <input
//             type="checkbox"
//             name="defaultInTransit"
//             checked={formData.defaultInTransit}
//             onChange={handleChange}
//             className="mr-2"
//           />
//           <label className="text-sm font-medium text-gray-700">Default in Transit Warehouse</label>
//         </div>
//       </div>

//       {/* Submit and Cancel Buttons */}
//       <div className="mt-6 flex justify-end gap-4">
//         <button
//         onClick={handleSubmit}
//           type="submit"
//           className="px-4 py-2 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 focus:outline-none"
//         >
//           Save
//         </button>
//         <button
//           type="button"
//           className="px-4 py-2 bg-gray-300 text-gray-800 font-medium rounded-md hover:bg-gray-400 focus:outline-none"
//           onClick={handleCancel}
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   );
// };

// export default WarehouseDetailsForm;
