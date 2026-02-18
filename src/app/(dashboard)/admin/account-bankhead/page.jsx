"use client";
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AccountHeadDetails = () => {
  const [formData, setFormData] = useState({
    accountHeadCode: "",
    accountHeadDescription: "",
    status: "",
  });

  const validateForm = () => {
    if (!formData.accountHeadCode.trim()) {
      toast.error("Account head code is required");
      return false;
    }
    if (!formData.accountHeadDescription.trim()) {
      toast.error("Account head description is required");
      return false;
    }
    if (!formData.status) {
      toast.error("Please select a status");
      return false;
    }
    return true;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const response = await fetch("/api/account-head", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (response.ok) {
        console.log("Submitted Account Head Details:", result.data);
        toast.success("Account head details submitted successfully!");
        // Optionally clear the form after successful submission:
        setFormData({
          accountHeadCode: "",
          accountHeadDescription: "",
          status: "",
        });
      } else {
        toast.error(result.message || "Error submitting form");
      }
    } catch (error) {
      console.error("Error submitting account head details:", error);
      toast.error("Error submitting account head details");
    }
  };
  

  const handleClear = () => {
    setFormData({ accountHeadCode: "", accountHeadDescription: "", status: "" });
    toast.info("Form cleared");
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Account Head Details</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Head Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Head Code
          </label>
          <input
            type="text"
            name="accountHeadCode"
            value={formData.accountHeadCode}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md shadow-sm"
            placeholder="Enter account head code"
          />
        </div>
        {/* Account Head Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Account Head Description
          </label>
          <input
            type="text"
            name="accountHeadDescription"
            value={formData.accountHeadDescription}
            onChange={handleInputChange}
            className="w-full p-2 border rounded-md shadow-sm"
            placeholder="Enter account head description"
          />
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
            className="w-full p-2 border rounded-md shadow-sm"
          >
            <option value="">Select status</option>
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

export default AccountHeadDetails;
