import React, { useState, useEffect, useMemo } from 'react';
import { Search, Eye, RefreshCw, X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSalesHistory, getBillDetails, printBill } from '../services/apicall';
import { PERMISSIONS } from '../components/permissions';
import { usePermission } from '../context/PermissionContext';

const BillDetails = () => {
  const navigate = useNavigate();
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [billDetails, setBillDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [printing, setPrinting] = useState(null);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Auto-fetch when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesHistory();
    }
  }, [startDate, endDate]);

  const fetchSalesHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // Convert YYYY-MM-DD to DD-MM-YYYY for API
      const formatDateForAPI = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
      };

      const apiStartDate = formatDateForAPI(startDate);
      const apiEndDate = formatDateForAPI(endDate);

      const response = await getSalesHistory(apiStartDate, apiEndDate, 1);

      let historyData = [];

      if (Array.isArray(response)) {
        historyData = response;
      } else if (response && Array.isArray(response.data)) {
        historyData = response.data;
      } else if (response && typeof response === 'object') {
        historyData = response.bills || response.result || response.items || [];
      }

      setSalesHistory(historyData);
    } catch (error) {
      console.error('Error fetching sales history:', error);
      const errorMessage = error?.response?.data?.Message || error?.message || 'Failed to load sales history';
      setError(errorMessage);
      setSalesHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (sellId) => {
    if (!sellId) {
      alert('Invalid bill ID');
      return;
    }

    try {
      const response = await getBillDetails(sellId);
      setBillDetails(response.data || response);
      setSelectedBill(sellId);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching bill details:', error);
      alert('Failed to load bill details');
    }
  };

  const { executeWithPermission } = usePermission();

  const handlePrintBill = async (sellId) => {
    // 🔐 Check BILL_REPRINT permission
    executeWithPermission(PERMISSIONS.BILL_REPRINT, 'Bill Reprint', async () => {

      if (!sellId) {
        alert('Invalid bill ID');
        return;
      }

      setPrinting(sellId);
      try {
        const result = await printBill(sellId);
        console.log('Print response:', result);
        alert(`Bill #${sellId} sent to printer successfully!`);
      } catch (error) {
        console.error('Error printing bill:', error);
        const errorMessage = error?.Message || error?.message || 'Failed to print bill';
        alert(`Failed to print bill: ${errorMessage}`);
      } finally {
        setPrinting(null);
      }
    });
  };

  const filteredHistory = Array.isArray(salesHistory)
    ? salesHistory.filter(bill => {
      if (!bill) return false;
      const searchLower = searchTerm.toLowerCase();
      return (
        (bill.sell_id && bill.sell_id.toString().includes(searchLower)) ||
        (bill.customer_name && bill.customer_name.toLowerCase().includes(searchLower)) ||
        (bill.customer_mobile && bill.customer_mobile.includes(searchLower)) ||
        (bill.table_name && bill.table_name.toLowerCase().includes(searchLower))
      );
    })
    : [];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;

  // Group items by ID and Variant to merge complimentary items
  const groupedBillItems = useMemo(() => {
    if (!billDetails?.items?.data) return [];

    const groups = {};

    billDetails.items.data.forEach(item => {
      // Create a unique key based on item_id, variant_id and item_name
      // This prevents different items (e.g. descriptions or items with missing IDs) from merging
      const key = `${item.item_id}_${item.variant_id || 0}_${item.item_name || ''}`;

      if (!groups[key]) {
        // Initialize the group with the first item found
        groups[key] = {
          ...item,
          original_items: [item]
        };
      } else {
        // Update existing group
        const group = groups[key];

        // Sum quantities and totals
        group.item_quantity += item.item_quantity;
        group.price_after_gst += item.price_after_gst;

        // Keep track of original items to calculate discount correctly later
        group.original_items.push(item);
      }
    });

    // Final pass to calculate correct rate and discount
    return Object.values(groups).map(group => {
      // The displayed rate should be the maximum rate (standard price)
      const maxRate = Math.max(...group.original_items.map(i => i.item_rate || 0));
      const maxGstRate = Math.max(...group.original_items.map(i => i.item_gst_rate || 0));

      // Calculate total effective discount
      // Effective Discount = Sum(ItemDiscount) + Sum((MaxRate - ItemRate) * Qty)
      // This accounts for "Free" items having Rate 0, which is effectively a discount of MaxRate
      const totalDiscount = group.original_items.reduce((sum, i) => {
        const itemRate = i.item_rate || 0;
        const implicitDiscount = (maxRate - itemRate) * i.item_quantity;
        return sum + (i.item_discount || 0) + implicitDiscount;
      }, 0);

      return {
        ...group,
        item_rate: maxRate,
        item_gst_rate: maxGstRate,
        item_discount: totalDiscount
      };
    });
  }, [billDetails]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto p-2 sm:p-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Bill Details</h1>
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Compact Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-3">
          <div className="flex flex-wrap items-end gap-2 sm:gap-3">
            {/* Start Date */}
            <div className="w-36 sm:w-40">
              <label className="block text-xs font-semibold text-gray-800 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div className="w-36 sm:w-40">
              <label className="block text-xs font-semibold text-gray-800 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-gray-800 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Bill No, Customer, Table..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm font-medium text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b-2 border-gray-300">
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Bill No</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Table</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Customer</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Mobile</th>
                  <th className="py-3 px-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Items</th>
                  <th className="py-3 px-4 text-center text-xs font-bold text-gray-900 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                      <span className="text-gray-600 text-sm font-medium">Loading bills...</span>
                    </td>
                  </tr>
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-600 text-sm font-medium">
                      No bills found for the selected date range
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((bill, index) => (
                    <tr key={bill.sell_id || index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{formatDate(bill.date_of_sale)}</td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">{bill.sell_id || 'N/A'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {bill.table_name || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{bill.customer_name || '-'}</td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{bill.customer_mobile || '-'}</td>
                      <td className="py-3 px-4 text-sm text-right font-semibold text-gray-900">{bill.item_count || 0}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(bill.sell_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                          <button
                            onClick={() => handlePrintBill(bill.sell_id)}
                            disabled={printing === bill.sell_id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {printing === bill.sell_id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Printer className="w-3.5 h-3.5" />
                            )}
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <span className="text-gray-600 text-sm font-medium">Loading bills...</span>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600 text-sm font-medium">
              No bills found for the selected date range
            </div>
          ) : (
            filteredHistory.map((bill, index) => (
              <div key={bill.sell_id || index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-900">Bill #{bill.sell_id || 'N/A'}</span>
                      {bill.table_name && (
                        <span className="text-sm font-semibold text-gray-900">
                          • Table {bill.table_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 font-medium mb-1">{formatDate(bill.date_of_sale)}</div>
                    <div className="text-sm font-semibold text-gray-900">{bill.customer_name || 'Walk-in Customer'}</div>
                    {bill.customer_mobile && (
                      <div className="text-sm font-medium text-gray-700">{bill.customer_mobile}</div>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">
                    Items: <span className="font-bold text-gray-900">{bill.item_count || 0}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(bill.sell_id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      onClick={() => handlePrintBill(bill.sell_id)}
                      disabled={printing === bill.sell_id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      {printing === bill.sell_id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bill Details Modal */}
      {showDetailsModal && billDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center rounded-t-xl z-10">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Bill #{selectedBill}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintBill(selectedBill)}
                  disabled={printing === selectedBill}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  {printing === selectedBill ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      Print
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Bill Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Customer</p>
                  <p className="font-semibold text-sm text-gray-900 truncate">{billDetails.billInfo?.customer_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Mobile</p>
                  <p className="font-semibold text-sm text-gray-900">{billDetails.billInfo?.customer_mobile || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Date</p>
                  <p className="font-semibold text-sm text-gray-900">{formatDate(billDetails.billInfo?.date_of_sale)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Counter</p>
                  <p className="font-semibold text-sm text-gray-900">{billDetails.billInfo?.counter_name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Table</p>
                  <p className="font-semibold text-sm text-gray-900">
                    {billDetails.billInfo?.table_name || '-'}
                    {billDetails.billInfo?.section_name && ` (${billDetails.billInfo.section_name})`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Credit Bill</p>
                  <p className={`font-semibold text-sm ${billDetails.billInfo?.is_credit_bill ? 'text-orange-600' : 'text-green-600'}`}>
                    {billDetails.billInfo?.is_credit_bill ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Total Items</p>
                  <p className="font-semibold text-sm text-gray-900">{billDetails.billInfo?.item_count || 0}</p>
                </div>
              </div>

              {/* Items Table - Desktop */}
              {groupedBillItems.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 text-gray-900">Items</h3>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-300">
                          <th className="py-2.5 px-3 text-left text-xs font-bold text-gray-900">Item</th>
                          <th className="py-2.5 px-3 text-left text-xs font-bold text-gray-900">Unit</th>
                          <th className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">Qty</th>
                          <th className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">Rate</th>
                          <th className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">Discount</th>
                          <th className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">GST</th>
                          <th className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {groupedBillItems.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 px-3 text-gray-900 font-medium">{item.item_name}</td>
                            <td className="py-2 px-3 text-gray-900 font-medium">{item.item_unit}</td>
                            <td className="py-2 px-3 text-right text-gray-900 font-medium">{item.item_quantity}</td>
                            <td className="py-2 px-3 text-right text-gray-900 font-medium">{formatCurrency(item.item_rate)}</td>
                            <td className="py-2 px-3 text-right text-red-600 font-semibold">
                              {item.item_discount > 0 ? `-${formatCurrency(item.item_discount)}` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-900 font-medium">
                              {item.item_gst_rate > 0 ? `${item.item_gst_rate}%` : '-'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-gray-900">
                              {formatCurrency(item.price_after_gst)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-2">
                    {groupedBillItems.map((item, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="font-bold text-sm text-gray-900">{item.item_name}</div>
                            <div className="text-xs text-gray-700 font-medium">{item.item_unit}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-gray-900">{formatCurrency(item.price_after_gst)}</div>
                            <div className="text-xs text-gray-600 font-medium">Qty: {item.item_quantity}</div>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-700 font-medium pt-2 border-t border-gray-200">
                          <span>Rate: {formatCurrency(item.item_rate)}</span>
                          {item.item_gst_rate > 0 && <span>GST: {item.item_gst_rate}%</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Summary */}
              {billDetails.paymentSummary && (
                <div className="border-t pt-3 sm:pt-4 space-y-2 mb-4 sm:mb-6">
                  <div className="flex justify-between text-sm font-medium text-gray-800">
                    <span>Sub Total:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(billDetails.paymentSummary.subTotal)}</span>
                  </div>
                  {billDetails.paymentSummary.itemDiscount > 0 && (
                    <div className="flex justify-between text-sm font-medium text-gray-800">
                      <span>Item Discount:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(billDetails.paymentSummary.itemDiscount)}</span>
                    </div>
                  )}
                  {billDetails.paymentSummary.operatorDiscount > 0 && (
                    <div className="flex justify-between text-sm font-medium text-gray-800">
                      <span>Operator Discount:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(billDetails.paymentSummary.operatorDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium text-gray-800">
                    <span>GST Total:</span>
                    <span className="font-bold text-gray-900">{formatCurrency(billDetails.paymentSummary.gstTotal)}</span>
                  </div>
                  {billDetails.paymentSummary.refund_amount > 0 && (
                    <div className="flex justify-between text-sm font-medium text-gray-800">
                      <span>Refund:</span>
                      <span className="font-bold text-red-600">-{formatCurrency(billDetails.paymentSummary.refund_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base sm:text-lg font-bold border-t-2 border-gray-300 pt-3 mt-3">
                    <span className="text-gray-900">Grand Total:</span>
                    <span className="text-green-600">{formatCurrency(billDetails.paymentSummary.grandTotal)}</span>
                  </div>
                </div>
              )}

              {/* Payment Modes */}
              {billDetails.paymentModes?.data?.length > 0 && (
                <div>
                  <h3 className="text-sm sm:text-base font-bold mb-2 sm:mb-3 text-gray-900">Payment Modes</h3>
                  <div className="space-y-2">
                    {billDetails.paymentModes.data.map((p, i) => (
                      <div key={i} className="flex justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <span className="font-semibold text-sm text-gray-900">{p.payment_mode}</span>
                        <span className="font-bold text-sm text-green-600">{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillDetails;