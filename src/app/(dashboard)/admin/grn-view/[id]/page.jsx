'use client';

import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function GRNDetail() {
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGRN = async () => {
      try {
        const res = await axios.get(`/api/grn/${id}`);
        setGrn(res.data.data);
      } catch (error) {
        console.error('Failed to fetch GRN:', error);
        setError('Failed to fetch GRN details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchGRN();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading GRN details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/admin/grn-view">
          <button className="px-4 py-2 bg-gray-300 rounded">Back to GRN List</button>
        </Link>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="container mx-auto p-6">
        <p>GRN not found</p>
        <Link href="/admin/grn-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 rounded">Back to GRN List</button>
        </Link>
      </div>
    );
  }

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate totals
  const calculateItemTotals = () => {
    if (!grn.items) return {};
    
    return grn.items.reduce((acc, item) => {
      acc.totalQuantity += item.quantity || 0;
      acc.totalReceived += item.receivedQuantity || 0;
      acc.totalAmount += item.totalAmount || 0;
      acc.totalDiscount += item.discount || 0;
      acc.totalGST += item.gstAmount || 0;
      return acc;
    }, {
      totalQuantity: 0,
      totalReceived: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalGST: 0
    });
  };

  const itemTotals = calculateItemTotals();

  return (
    <div className="container mx-auto p-6">
      <Link href="/admin/grn-view">
        <button className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
          Back to GRN List
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Goods Received Note (GRN)</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* GRN Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">GRN #{grn.refNumber || 'N/A'}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              grn.status === 'Received' ? 'bg-green-100 text-green-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {grn.status}
            </span>
          </div>
          <p className="text-gray-600 mt-1">Created: {formatDate(grn.createdAt)}</p>
        </div>
        
        {/* GRN Information */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Supplier Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Supplier Code:</span> {grn.supplierCode || 'N/A'}</p>
              <p><span className="font-medium">Supplier Name:</span> {grn.supplierName}</p>
              <p><span className="font-medium">Contact Person:</span> {grn.contactPerson || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">GRN Dates</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Posting Date:</span> {formatDate(grn.postingDate)}</p>
              <p><span className="font-medium">Document Date:</span> {formatDate(grn.documentDate)}</p>
              <p><span className="font-medium">Valid Until:</span> {formatDate(grn.validUntil)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Additional Details</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Sales Employee:</span> {grn.salesEmployee || 'N/A'}</p>
              <p><span className="font-medium">Freight Charges:</span> ₹{grn.freight?.toFixed(2) || '0.00'}</p>
              <p><span className="font-medium">Rounding Adjustment:</span> ₹{grn.rounding?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t border-b">
          <h3 className="text-lg font-semibold mb-3">Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-600">Total Before Discount</p>
              <p className="font-medium">₹{grn.totalBeforeDiscount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Total GST</p>
              <p className="font-medium">₹{grn.gstTotal?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Freight Charges</p>
              <p className="font-medium">₹{grn.freight?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Grand Total</p>
              <p className="font-medium text-lg text-blue-700">₹{grn.grandTotal?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        {/* Items Section */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Received Items</h3>
            <p className="text-gray-600">{grn.items?.length || 0} items</p>
          </div>
          
          {grn.items && grn.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Details</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Management</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {grn.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-500">{item.itemCode}</div>
                        {item.itemDescription && (
                          <div className="text-xs text-gray-400 mt-1">{item.itemDescription}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="font-medium">{item.quantity}</div>
                        <div className="text-xs text-gray-500">Allowed: {item.allowedQuantity}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.receivedQuantity === item.quantity ? 'bg-green-100 text-green-800' :
                          item.receivedQuantity > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.receivedQuantity || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>₹{item.unitPrice?.toFixed(2)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-red-600">-₹{item.discount?.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.gstRate}%</div>
                        <div className="text-xs text-gray-500">{item.taxOption}</div>
                        <div className="text-xs">₹{item.gstAmount?.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">₹{item.totalAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{item.managedBy === 'batch' ? 'Batch Managed' : 'Loose'}</div>
                        
                        {/* Batch Information */}
                        {item.batches && item.batches.length > 0 && (
                          <div className="mt-2 text-xs">
                            <div className="font-medium">Batches:</div>
                            {item.batches.map((batch, batchIdx) => (
                              <div key={batchIdx} className="mt-1 p-1 bg-gray-50 rounded">
                                <div>#{batch.batchNumber}</div>
                                <div>Qty: {batch.batchQuantity}</div>
                                {batch.expiryDate && (
                                  <div>Exp: {formatDate(batch.expiryDate)}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan="1">Totals:</td>
                    <td className="px-4 py-3 text-center">{itemTotals.totalQuantity}</td>
                    <td className="px-4 py-3 text-center">{itemTotals.totalReceived}</td>
                    <td className="px-4 py-3 text-center">-₹{itemTotals.totalDiscount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">₹{itemTotals.totalGST.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">₹{itemTotals.totalAmount.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No items received</p>
            </div>
          )}
        </div>
        
        {/* Quality Checks */}
        {grn.qualityCheckDetails && grn.qualityCheckDetails.length > 0 && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Quality Checks</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Parameter</th>
                    <th className="px-4 py-2 text-center">Min Value</th>
                    <th className="px-4 py-2 text-center">Max Value</th>
                    <th className="px-4 py-2 text-center">Actual Value</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grn.qualityCheckDetails.map((check, index) => {
                    const isWithinRange = check.actualValue >= check.min && check.actualValue <= check.max;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border-b">{check.parameter}</td>
                        <td className="px-4 py-2 border-b text-center">{check.min}</td>
                        <td className="px-4 py-2 border-b text-center">{check.max}</td>
                        <td className="px-4 py-2 border-b text-center">{check.actualValue}</td>
                        <td className="px-4 py-2 border-b text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isWithinRange ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isWithinRange ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Additional Information */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <p className="font-medium">Remarks:</p>
              <p className="text-gray-600 mt-1 bg-white p-3 rounded border">
                {grn.remarks || 'No remarks provided'}
              </p>
            </div>
            
            {grn.items?.some(item => item.errorMessage) && (
              <div className="bg-red-50 p-4 rounded border border-red-100">
                <h4 className="font-medium text-red-800">Item Errors:</h4>
                <ul className="mt-2 space-y-1">
                  {grn.items.map((item, index) => (
                    item.errorMessage && (
                      <li key={index} className="text-sm text-red-700">
                        <span className="font-medium">{item.itemName}:</span> {item.errorMessage}
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-4">
        <Link href={`/admin/grn-view/new?editId=${grn._id}`}>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Edit GRN
          </button>
        </Link>
        <Link href="/admin/grn-view">
          <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
            Back to List
          </button>
        </Link>
      </div>
    </div>
  );
}


// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function GRNDetail() {
//   const { id } = useParams();
//   const [grn, setGrn] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchGRN = async () => {
//       try {
//         const res = await axios.get(`/api/grn/${id}`);
//         console.log(res.data.data)
//         setGrn(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch GRN:', error);
//         setError('Failed to fetch GRN');
//       }
//     };

//     if (id) {
//       fetchGRN();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!grn) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/grn-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to GRN List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">GRN Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>GRN Number:</strong> {grn.grnNumber}</p>
//         <p><strong>Supplier Name:</strong> {grn.supplierName}</p>
//         <p><strong>GRN Date:</strong> {new Date(grn.grnDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {grn.status}</p>
//         <p><strong>Grand Total:</strong> {grn.grandTotal}</p>
//         <p><strong>Remarks:</strong> {grn.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {grn.items && grn.items.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Item Name</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">Unit Price</th>
//                 <th className="border p-2">Discount</th>
//                 <th className="border p-2">Total Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {grn.items.map((item, index) => (
//                 <tr key={index} className="text-center">
//                   <td className="border p-2">{item.itemName}</td>
//                   <td className="border p-2">{item.quantity}</td>
//                   <td className="border p-2">{item.unitPrice}</td>
//                   <td className="border p-2">{item.discount}</td>
//                   <td className="border p-2">{item.totalAmount}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p>No items available.</p>
//         )}
//       </div>
//       <div className="mt-4">
//         <Link href={`/admin/grn-view/new?editId=${grn._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit GRN</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
