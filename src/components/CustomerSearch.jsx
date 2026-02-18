




//  to after mail
import React, { useState, useRef, useEffect } from "react";
import useSearch from "../hooks/useSearch";

const CustomerSearch = ({ onSelectCustomer, onNotFound }) => {
  const [query, setQuery] = useState("");
  const [show, setShow] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const wrapperRef = useRef(null);

  /* ───────── live search hook ───────── */
  const customerSearch = useSearch(async (searchQuery) => {
    if (!searchQuery) return [];
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) return [];
      const data = await res.json();

      if (!data.length && onNotFound) {
        onNotFound(searchQuery);
      }
      return data;
    } catch (err) {
      console.error("Customer search failed:", err);
      return [];
    }
  });

  /* ───────── click outside / Esc key ───────── */
  useEffect(() => {
    if (!show) return;

    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setShow(false);
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [show]);

  /* ───────── input change ───────── */
  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedCustomer(null); // reset if typing again
    customerSearch.handleSearch(val);
    setShow(true);
  };

  /* ───────── pick a customer ───────── */
  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);

    // Pass all relevant fields back safely
    onSelectCustomer?.({
      _id: customer._id,
      customerCode: customer.customerCode || "",
      customerName: customer.customerName || "",
      contactPerson: customer.contactPersonName || "",
      phoneNumber: customer.mobileNumber || "",
      address1: customer.address1 || "",
      address2: customer.address2 || "",
      city: customer.city || "",
    });

    setQuery(customer.customerName);
    setShow(false);
  };

  /* ───────── UI ───────── */
  return (
    <div ref={wrapperRef} className="relative mb-4">
      <input
        type="text"
        placeholder="Search Customer"
        value={selectedCustomer ? selectedCustomer.customerName : query}
        onChange={handleQueryChange}
        onFocus={() => query && setShow(true)}
        className="w-full border px-4 py-2 rounded"
      />

      {show && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto border bg-white shadow rounded">
          {customerSearch.loading && <p className="p-2">Loading…</p>}

          {customerSearch.results?.length ? (
            customerSearch.results.map((c) => (
              <div
                key={c._id}
                onClick={() => handleCustomerSelect(c)}
                className={`cursor-pointer px-4 py-2 hover:bg-gray-100 ${
                  selectedCustomer && selectedCustomer._id === c._id ? "bg-blue-100" : ""
                }`}
              >
                {c.customerName} {c.customerCode && `(${c.customerCode})`}
              </div>
            ))
          ) : (
            !customerSearch.loading &&
            query && <p className="p-2 text-gray-500">No customers found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
