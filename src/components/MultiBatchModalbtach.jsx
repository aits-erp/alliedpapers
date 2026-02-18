// components/MultiBatchModalbtach.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";

/**
 * props:
 * - itemsbatch: { itemId, sourceWarehouse, itemName, qty (number) }
 * - batchOptions: array of { batchNumber, expiryDate, manufacturer, quantity, unitPrice }
 * - onClose: fn
 * - onUpdateBatch: fn(Array<{ batchNumber, quantity, expiryDate, manufacturer, unitPrice }>))
 */
export default function MultiBatchModal({ itemsbatch, batchOptions, onClose, onUpdateBatch }) {

  const { itemId, sourceWarehouse, itemName, qty: parentQuantity } = itemsbatch;

  const available = useMemo(() => {
    return (batchOptions || [])
      .filter(b => b.quantity > 0)
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
  }, [batchOptions]);

  const [selected, setSelected] = useState([]);

  useEffect(() => {
    const init = [];
    let remaining = parentQuantity;
    for (const batch of available) {
      if (remaining <= 0) break;
      const qty = Math.min(batch.quantity, remaining);
      init.push({ batch, quantity: qty });
      remaining -= qty;
    }
    setSelected(init);
  }, [available, parentQuantity]);

  const toggleBatch = (batch) => {
    setSelected(prev => {
      const exists = prev.find(s => s.batch.batchNumber === batch.batchNumber);
      if (exists) {
        return prev.filter(s => s.batch.batchNumber !== batch.batchNumber);
      } else {
        if (prev.some(s => s.batch.batchNumber === batch.batchNumber)) {
          toast.warn("This batch is already selected.");
          return prev;
        }
        return [...prev, { batch, quantity: Math.min(parentQuantity, batch.quantity) }];
      }
    });
  };

  const updateQuantity = (batchNumber, qty) => {
    if (isNaN(qty)) return;
    const selectedBatch = selected.find(s => s.batch.batchNumber === batchNumber);
    if (!selectedBatch) return;
    const clampedQty = Math.min(Math.max(qty, 1), selectedBatch.batch.quantity);
    setSelected(prev =>
      prev.map(s =>
        s.batch.batchNumber === batchNumber ? { ...s, quantity: clampedQty } : s
      )
    );
  };

  const resetSelection = () => {
    setSelected([]);
  };

  const totalAllocated = selected.reduce((sum, s) => sum + s.quantity, 0);

  const handleConfirm = () => {
    if (selected.length === 0) {
      toast.error("Please select at least one batch.");
      return;
    }
    if (totalAllocated !== parentQuantity) {
      toast.error(`Total allocated must equal ${parentQuantity}. You have ${totalAllocated}.`);
      return;
    }

    const transformed = selected.map(s => ({
      itemId,
      sourceWarehouse,
      batchNumber: s.batch.batchNumber,
      quantity: s.quantity,
      expiryDate: s.batch.expiryDate,
      manufacturer: s.batch.manufacturer,
      unitPrice: s.batch.unitPrice,
    }));

    onUpdateBatch(transformed);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-xl shadow-xl w-11/12 max-w-lg max-h-[90vh] overflow-auto">
        <button onClick={onClose} aria-label="Close modal" className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">×</button>
        <h2 className="text-xl font-semibold mb-4">Select Batches for {itemName}</h2>

        {available.length === 0 ? (
          <p className="text-center text-gray-600 py-6">No batches available</p>
        ) : (
          <>
            <div className="mb-4 flex justify-end">
              <button
                onClick={resetSelection}
                className="text-sm text-red-600 hover:underline"
                type="button"
              >
                Deselect All
              </button>
            </div>

            <div className="space-y-4">
              {available.map(batch => {
                const sel = selected.find(s => s.batch.batchNumber === batch.batchNumber);
                return (
                  <div key={batch.batchNumber} className="p-4 border rounded flex flex-col">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={!!sel}
                        onChange={() => toggleBatch(batch)}
                        className="mr-2"
                      />
                      <span className="font-medium">{batch.batchNumber} ({batch.quantity} available)</span>
                    </label>
                    {sel && (
                      <div className="mt-2 ml-6 space-y-1">
                        <p><strong>Expiry:</strong> {new Date(batch.expiryDate).toLocaleDateString()}</p>
                        <p><strong>Manufacturer:</strong> {batch.manufacturer}</p>
                        <p><strong>Unit Price:</strong> ₹{batch.unitPrice}</p>
                        <div className="flex items-center space-x-2">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min={1}
                            max={batch.quantity}
                            value={sel.quantity}
                            onChange={e => updateQuantity(batch.batchNumber, Number(e.target.value))}
                            className="w-20 border p-1 rounded"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`mt-4 font-semibold ${totalAllocated !== parentQuantity ? "text-red-600" : "text-green-600"}`}>
              Total Allocated: {totalAllocated} / {parentQuantity}
            </div>

            <button
              onClick={handleConfirm}
              className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              disabled={totalAllocated !== parentQuantity}
            >
              Confirm Allocation
            </button>
          </>
        )}
      </div>
    </div>
  );
}