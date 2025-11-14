"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Papa from "papaparse";

import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";

export default function CustomerManagement() {
  const [view, setView] = useState("list");
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerDetails, setCustomerDetails] = useState({
    customerCode: "",
    customerName: "",
    customerGroup: "",
    customerType: "",
    emailId: "",
    mobileNumber: "",
    billingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    shippingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    contactPersonName: "",
    commissionRate: "",
    glAccount: null,
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/customers");
      setCustomers(res.data || []);
    } catch {
      setError("Failed to load customers.");
    } finally {
      setLoading(false);
    }
  };

const generateCustomerCode = async () => {
  try {
    const res = await fetch("/api/lastCustomerCode");
    const { lastCustomerCode } = await res.json(); // example: C0001 or C-0001

    // Extract digits only (0001)
    const digits = lastCustomerCode.replace(/\D/g, "");  
    const nextNumber = (parseInt(digits, 10) || 0) + 1;

    const newCode = `C${nextNumber.toString().padStart(4, "0")}`;

    setCustomerDetails((prev) => ({
      ...prev,
      customerCode: newCode,
    }));
  } catch (error) {
    console.error(error);
  }
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleGroupSelect = (group) => {
    setCustomerDetails((prev) => ({
      ...prev,
      customerGroup: group?.name || "",
    }));
  };

  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...customerDetails[key]];
    arr[idx][field] = value;
    setCustomerDetails((prev) => ({ ...prev, [key]: arr }));
  };

  const addAddress = (type) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setCustomerDetails((prev) => ({
      ...prev,
      [key]: [
        ...prev[key],
        {
          address1: "",
          address2: "",
          country: "",
          state: "",
          city: "",
          pin: "",
        },
      ],
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (customerDetails[key].length === 1) return;
    setCustomerDetails((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };

  const validate = () => {
    const reqFields = [
      { field: "customerName", label: "Customer Name" },
      { field: "customerGroup", label: "Customer Group" },
      { field: "customerType", label: "Customer Type" },
      { field: "glAccount", label: "GL Account" },
      // { field: "emailId", label: "Email ID" },
      { field: "gstCategory", label: "GST Category" },
      { field: "pan", label: "PAN" },
    ];
    for (let { field, label } of reqFields) {
      if (
        !customerDetails[field] ||
        (field === "glAccount" && !customerDetails.glAccount?._id)
      ) {
        alert(`${label} is required`);
        return false;
      }
    }
    // ... other validations
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      // Prepare payload: replace glAccount object with its _id
      const payload = {
        ...customerDetails,
        glAccount: customerDetails.glAccount?._id || null,
      };
      let res;
      if (customerDetails._id) {
        res = await axios.put(`/api/customers/${customerDetails._id}`, payload);
        setCustomers(
          customers.map((c) => (c._id === customerDetails._id ? res.data : c))
        );
      } else {
        res = await axios.post("/api/customers", payload);
        setCustomers((prev) => [...prev, res.data]);
      }
      setView("list");
    } catch (err) {
      console.error(err);
      alert("Submit failed: " + err.response?.data?.message || err.message);
    }
  };



  const resetForm = () => {
    setCustomerDetails({
      customerCode: "",
      customerName: "",
      customerGroup: "",
      customerType: "",
      emailId: "",
      mobileNumber: "",
      billingAddresses: [
        {
          address1: "",
          address2: "",
          country: "",
          state: "",
          city: "",
          pin: "",
        },
      ],
      shippingAddresses: [
        {
          address1: "",
          address2: "",
          country: "",
          state: "",
          city: "",
          pin: "",
        },
      ],
      paymentTerms: "",
      gstNumber: "",
      gstCategory: "",
      pan: "",
      contactPersonName: "",
      commissionRate: "",
      glAccount: null,
    });
    setView("list");
  };

  const handleEdit = (c) => {
    setCustomerDetails(c);
    setView("form");
  };

   // --- Bulk upload handler ---
  // const handleFileUpload = (event) => {
  //   const file = event.target.files[0];
  //   if (!file) return;

  //   // Example: Read CSV / Excel etc.
  //   const reader = new FileReader();
  //   reader.onload = (e) => {
  //     const content = e.target.result;
  //     console.log("Uploaded file content:", content);

  //     // Here you can parse and upload data to backend
  //   };
  //   reader.readAsText(file);
  // };




const handleBulkUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async ({ data: rows }) => {
      try {
        const response = await fetch("/api/customers/customer-template", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customers: rows }),
        });

        const result = await response.json();

        if (!response.ok) {
          alert(`❌ Error: ${result.message}`);
          return;
        }

        // Pretty result summary
        alert(
          `📊 Customer Bulk Upload Summary\n\n` +
          `📦 Total Received: ${result.totalReceived}\n` +
          `🟢 Inserted: ${result.insertedCount}\n` +
          `🟡 Updated: ${result.updatedCount}\n` +
          `⚠️ Skipped: ${result.skippedCount}\n` +
          `❌ Errors: ${result.errorCount}\n`
        );

        // Refresh frontend
        fetchCustomers();

      } catch (error) {
        console.error("Upload error:", error);
        alert("❌ Upload failed.");
      }
    },
  });
};





  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    await axios.delete(`/api/customers/${id}`);
    setCustomers((prev) => prev.filter((c) => c._id !== id));
  };

  const filtered = customers.filter((c) =>
    [
      c.customerCode,
      c.customerName,
      c.emailId,
      c.customerGroup,
      c.customerType,
      c.glAccount?.accountCode,
    ].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderListView = () => (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <button
  onClick={() => setView("bulkUpload")}
  className="mt-4 sm:mt-0 inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
>
  Bulk Upload
</button>


        <button
          onClick={() => {
            generateCustomerCode();
            setView("form");
          }}
          className="mt-4 sm:mt-0 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <FaPlus className="mr-2" />
          Add Customer
        </button>
      </div>
      <div className="mb-4 relative max-w-md">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customers..."
          className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
        />
        <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Code",
                "Name",
                "Email",
                "Mobile NO.",
                "Sales Person",
                "GST NO.",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{c.customerCode}</td>
                <td className="px-4 py-2">{c.customerName}</td>
                <td className="px-4 py-2">{c.emailId}</td>
                <td className="px-4 py-2">{c.mobileNumber}</td>
                <td className="px-4 py-2">{c.salesEmployee}</td>
                <td className="px-4 py-2">
                  {c.gstNumber || "N/A"}
                </td>
                <td className="px-4 py-2 flex space-x-3">
                  <button
                    onClick={() => handleEdit(c)}
                    className="text-blue-600"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
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
        {customerDetails._id ? "Edit Customer" : "New Customer"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              name="customerCode"
              value={customerDetails.customerCode}
              readOnly
              className="w-full border rounded-md p-2 bg-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <input
              name="customerName"
              value={customerDetails.customerName}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Group <span className="text-red-500">*</span>
            </label>
            <GroupSearch
              value={customerDetails.customerGroup}
              onSelectGroup={handleGroupSelect}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Type <span className="text-red-500">*</span>
            </label>
            <select
              name="customerType"
              value={customerDetails.customerType}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option>Individual</option>
              <option>Business</option>
              <option>Government</option>
            </select>
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
              value={customerDetails.emailId}
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
              value={customerDetails.mobileNumber}
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
              value={customerDetails.contactPersonName}
              onChange={handleChange}
              placeholder="Contact Person"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold">Billing Addresses</h3>
        {customerDetails.billingAddresses.map((addr, i) => (
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
                placeholder="PIN"
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
        {customerDetails.shippingAddresses.map((addr, i) => (
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
                placeholder="PIN"
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
              value={customerDetails.paymentTerms}
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
              value={customerDetails.gstNumber}
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
              value={customerDetails.gstCategory}
              onChange={handleChange}
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select GST Category</option>
              <option value="Registered Regular">Registered Regular</option>
              <option value="Registered Composition">
                Registered Composition
              </option>
              <option value="Unregistered">Unregistered</option>
              <option value="SEZ">SEZ</option>
              <option value="Overseas">Overseas</option>
              <option value="Deemed Export">Deemed Export</option>
              <option value="UIN Holders">UIN Holders</option>
              <option value="Tax Deductor">Tax Deductor</option>
              <option value="Tax Collector">Tax Collector</option>
              <option value="Input Service Distributor">
                Input Service Distributor
              </option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN <span className="text-red-500">*</span>
            </label>
            <input
              name="pan"
              value={customerDetails.pan}
              onChange={handleChange}
              placeholder="PAN"
              className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <AccountSearch
              value={customerDetails.glAccount}
              onSelect={(selected) => {
                console.log("Selected GL Account:", selected);
                setCustomerDetails((prev) => ({
                  ...prev,
                  glAccount: selected,
                }));
              }}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 bg-gray-500 text-white rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md"
          >
            {customerDetails._id ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );


  // 👇 put this inside your component
const renderBulkUploadView = () => (
  <div className="p-6 bg-white rounded-lg shadow-md">
    <h2 className="text-xl font-semibold mb-4">Bulk Customer Upload</h2>

    {/* Download Template */}
    <a
       href="/api/customers/customer-template"
      download
      className="inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mb-4"
    >
      Download Template
    </a>

    {/* File Upload */}
    <input
      type="file"
      accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
      onChange={handleBulkUpload}
      className="mb-4 block"
    />

    {/* Back Button */}
    <button
      onClick={() => setView("list")}
      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
    >
      Back
    </button>
  </div>
);


  // return view === "list" ? renderListView() : renderFormView();  

return view === "list"
  ? renderListView()
  : view === "form"
  ? renderFormView()
  : view === "bulkUpload"
  ? renderBulkUploadView()
  : null;


  
}
