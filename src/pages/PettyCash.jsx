import React, { useState, useEffect, useRef } from 'react';
import { X, Printer, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PettyCash = () => {
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    reason: '',
    toStaff: '',
    staff: 'Admin',
    remarks: '',
    cashType: 'In', // 'In' or 'Out'
    recipientType: 'Staff', // 'Staff' or 'Vendor'
    toVendor: ''
  });

  // Filter state
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    cashType: '',
    reason: '',
    staff: ''
  });

  // Reason options (dropdown)
  const reasonOptions = [
    'Payment',
    'Expense',
    'Salary',
    'Purchase',
    'Refund',
    'Other'
  ];

  // Calculate totals based on filtered transactions
  const totalCashIn = filteredTransactions
    .filter(t => t.cashType === 'In')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  const totalCashOut = filteredTransactions
    .filter(t => t.cashType === 'Out')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
  
  const totalCash = totalCashIn - totalCashOut;

  // Load transactions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pettyCashTransactions');
    if (saved) {
      const loaded = JSON.parse(saved);
      setTransactions(loaded);
      setFilteredTransactions(loaded);
    }
  }, []);

  // Save transactions to localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('pettyCashTransactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  // Filter transactions when filters change
  useEffect(() => {
    let filtered = [...transactions];

    // Filter by date range
    if (filters.fromDate) {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.date).toISOString().split('T')[0];
        return tDate >= filters.fromDate;
      });
    }

    if (filters.toDate) {
      filtered = filtered.filter(t => {
        const tDate = new Date(t.date).toISOString().split('T')[0];
        return tDate <= filters.toDate;
      });
    }

    // Filter by cash type
    if (filters.cashType) {
      filtered = filtered.filter(t => t.cashType === filters.cashType);
    }

    // Filter by reason
    if (filters.reason) {
      filtered = filtered.filter(t => 
        (t.reason || '').toLowerCase().includes(filters.reason.toLowerCase())
      );
    }

    // Filter by staff
    if (filters.staff) {
      filtered = filtered.filter(t => 
        (t.staff || '').toLowerCase().includes(filters.staff.toLowerCase()) ||
        (t.toStaff || '').toLowerCase().includes(filters.staff.toLowerCase())
      );
    }

    setFilteredTransactions(filtered);
  }, [filters, transactions]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNew = () => {
    setFormData({
      amount: '',
      reason: '',
      toStaff: '',
      staff: 'Admin',
      remarks: '',
      cashType: 'In',
      recipientType: 'Staff',
      toVendor: ''
    });
    setSelectedTransaction(null);
    setIsEditMode(false);
  };

  const handleEditClick = (transaction, e) => {
    e.stopPropagation();
    setSelectedTransaction(transaction);
    setFormData({
      amount: transaction.amount || '',
      reason: transaction.reason || '',
      toStaff: transaction.toStaff || '',
      staff: transaction.staff || 'Admin',
      remarks: transaction.remarks || '',
      cashType: transaction.cashType || 'In',
      recipientType: transaction.recipientType || 'Staff',
      toVendor: transaction.toVendor || ''
    });
    setIsEditMode(true);
  };

  const handleSave = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const transaction = {
      id: selectedTransaction?.id || Date.now().toString(),
      amount: formData.amount,
      cashType: formData.cashType,
      reason: formData.reason,
      staff: formData.staff,
      toStaff: formData.toStaff,
      toVendor: formData.toVendor,
      remarks: formData.remarks,
      recipientType: formData.recipientType,
      date: selectedTransaction?.date || new Date().toISOString()
    };

    if (isEditMode && selectedTransaction) {
      // Update existing transaction
      setTransactions(prev => 
        prev.map(t => t.id === selectedTransaction.id ? transaction : t)
      );
    } else {
      // Add new transaction
      setTransactions(prev => [...prev, transaction]);
    }

    handleNew();
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    const win = window.open('', '', 'width=1000,height=700');
    win.document.write(`<html><head><title>Petty Cash Report</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        h1 { color: #22c55e; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f3f3f3; }
        .text-right { text-align: right; }
        .summary { margin-top: 20px; }
        .summary table { width: 300px; margin-left: auto; }
      </style>
      </head><body>
      <h1>PETTY CASH REPORT</h1>
      <p><strong>From:</strong> ${filters.fromDate} <strong>To:</strong> ${filters.toDate}</p>
      ${printRef.current.innerHTML}
      <div class="summary">
        <table>
          <tr>
            <td><strong>Total Cash In:</strong></td>
            <td class="text-right">${totalCashIn.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Total Cash Out:</strong></td>
            <td class="text-right">${totalCashOut.toFixed(2)}</td>
          </tr>
          <tr>
            <td><strong>Total Cash:</strong></td>
            <td class="text-right">${totalCash.toFixed(2)}</td>
          </tr>
        </table>
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <div className="min-h-screen bg-blue-50 p-2">
      {/* Header */}
      <div className="bg-white rounded shadow p-2 mb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-green-600">CASH IN AND OUT</h1>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded shadow p-2 mb-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleNew}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            New
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            Save
          </button>
          <button
            onClick={handleClose}
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            Close
          </button>
          <button
            className="px-3 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 font-medium"
          >
            Edit Till Cash
          </button>
        </div>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded shadow p-2 mb-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Left Column */}
          <div className="space-y-1.5">
            {/* Cash Type and Recipient Type in single row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Cash Type :
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      name="cashType"
                      value="In"
                      checked={formData.cashType === 'In'}
                      onChange={handleInputChange}
                      className="mr-1 w-3 h-3"
                    />
                    In
                  </label>
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      name="cashType"
                      value="Out"
                      checked={formData.cashType === 'Out'}
                      onChange={handleInputChange}
                      className="mr-1 w-3 h-3"
                    />
                    Out
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Recipient Type :
                </label>
                <div className="flex gap-2">
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      name="recipientType"
                      value="Vendor"
                      checked={formData.recipientType === 'Vendor'}
                      onChange={handleInputChange}
                      className="mr-1 w-3 h-3"
                    />
                    Vendor
                  </label>
                  <label className="flex items-center text-xs">
                    <input
                      type="radio"
                      name="recipientType"
                      value="Staff"
                      checked={formData.recipientType === 'Staff'}
                      onChange={handleInputChange}
                      className="mr-1 w-3 h-3"
                    />
                    Staff
                  </label>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Amount :
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
                placeholder="Enter amount"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Reason :
              </label>
              <select
                name="reason"
                value={formData.reason}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-gray-100 h-7"
              >
                <option value="">Select reason</option>
                {reasonOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-1.5">
            {/* To Staff */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                To Staff :
              </label>
              <input
                type="text"
                name="toStaff"
                value={formData.toStaff}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
                placeholder="Enter staff name"
                disabled={formData.recipientType === 'Vendor'}
              />
            </div>

            {/* Staff */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Staff :
              </label>
              <input
                type="text"
                name="staff"
                value={formData.staff}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
                placeholder="Enter staff name"
              />
            </div>

            {/* To Vendor */}
            {formData.recipientType === 'Vendor' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  To Vendor :
                </label>
                <input
                  type="text"
                  name="toVendor"
                  value={formData.toVendor}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
                  placeholder="Enter vendor name"
                />
              </div>
            )}

            {/* Remarks */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-0.5">
                Remarks :
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
                placeholder="Enter remarks"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table with Print Button */}
      <div className="bg-white rounded shadow p-2 mb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
          <h2 className="text-sm font-semibold text-gray-800">Petty Cash Transactions</h2>
          <button
            onClick={handlePrint}
            className="flex items-center bg-gray-800 gap-1 text-white px-2 py-1 rounded hover:bg-gray-700 text-xs transition-colors"
          >
            <Printer size={14} /> Print
          </button>
        </div>
        <div ref={printRef}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-2 py-1 text-left text-xs">Amount</th>
                  <th className="px-2 py-1 text-left text-xs">CType</th>
                  <th className="px-2 py-1 text-left text-xs">Reason</th>
                  <th className="px-2 py-1 text-left text-xs">Staff</th>
                  <th className="px-2 py-1 text-left text-xs">ToStaff</th>
                  <th className="px-2 py-1 text-left text-xs">ToVendor</th>
                  <th className="px-2 py-1 text-left text-xs">Remarks</th>
                  <th className="px-2 py-1 text-left text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-2 py-4 text-center text-gray-500 text-xs">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id || index}
                      className={`border-b hover:bg-gray-50 ${
                        selectedTransaction?.id === transaction.id
                          ? 'bg-blue-100'
                          : ''
                      }`}
                    >
                      <td className="px-2 py-1 text-xs">{transaction.amount}</td>
                      <td className="px-2 py-1 text-xs">{transaction.cashType}</td>
                      <td className="px-2 py-1 text-xs">{transaction.reason || ''}</td>
                      <td className="px-2 py-1 text-xs">{transaction.staff || ''}</td>
                      <td className="px-2 py-1 text-xs">{transaction.toStaff || ''}</td>
                      <td className="px-2 py-1 text-xs">{transaction.toVendor || ''}</td>
                      <td className="px-2 py-1 text-xs">{transaction.remarks || ''}</td>
                      <td className="px-2 py-1 text-xs">
                        <button
                          onClick={(e) => handleEditClick(transaction, e)}
                          className="p-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded shadow p-2 mb-2">
        <h2 className="text-sm font-semibold mb-2 text-gray-800">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">From Date</label>
            <input
              type="date"
              name="fromDate"
              value={filters.fromDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent h-7"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">To Date</label>
            <input
              type="date"
              name="toDate"
              value={filters.toDate}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent h-7"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Cash Type</label>
            <select
              name="cashType"
              value={filters.cashType}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent h-7"
            >
              <option value="">All Types</option>
              <option value="In">In</option>
              <option value="Out">Out</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Reason</label>
            <input
              type="text"
              name="reason"
              value={filters.reason}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent h-7"
              placeholder="Search reason..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Staff</label>
            <input
              type="text"
              name="staff"
              value={filters.staff}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent h-7"
              placeholder="Search staff..."
            />
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded shadow p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Total Cash In
            </label>
            <input
              type="text"
              value={totalCashIn.toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Total Cash Out
            </label>
            <input
              type="text"
              value={totalCashOut.toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">
              Total Cash
            </label>
            <input
              type="text"
              value={totalCash.toFixed(2)}
              readOnly
              className="w-full border border-gray-300 rounded px-2 py-0.5 text-xs bg-white h-7"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PettyCash;
