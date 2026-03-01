import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CustomerDetailsModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  billNumber,
  totalAmount,
  buttonText = 'Save', // ✅ NEW: Default to 'Save', can be 'Confirm NC'
  buttonIcon = '💾', // ✅ NEW: Default to save icon, can be '💳'
  modalTitle = 'Customer Details' // ✅ NEW: Default title, can be 'No Charge - Customer Details'
}) => {
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    mobile: '',
    address: '',
    email: ''
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCustomerDetails({ name: '', mobile: '', address: '', email: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    // Validate customer details
    if (!customerDetails.name.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!customerDetails.mobile.trim()) {
      alert('Please enter customer mobile number');
      return;
    }

    // Validate mobile number (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(customerDetails.mobile.trim())) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    // Call parent submit handler with customer details
    onSubmit(customerDetails);
  };

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCustomerDetails({...customerDetails, mobile: value});
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-[500px] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white text-black px-4 py-3 relative border-b border-gray-300">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <h3 className="text-lg font-bold">{modalTitle}</h3>
          <p className="text-xs text-gray-600 mt-1">
            Bill #{billNumber} • Amount: ₹{totalAmount?.toFixed(2) || '0.00'}
          </p>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[calc(90vh-180px)] overflow-y-auto">
          <div className="space-y-4">
            {/* Customer Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter customer name"
                value={customerDetails.name}
                onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500"
                autoFocus
              />
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={customerDetails.mobile}
                onChange={handleMobileChange}
                maxLength="10"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500"
              />
              {customerDetails.mobile && customerDetails.mobile.length < 10 && (
                <p className="text-xs text-gray-500 mt-1">
                  {10 - customerDetails.mobile.length} digits remaining
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Address (Optional)
              </label>
              <textarea
                placeholder="Enter customer address"
                value={customerDetails.address}
                onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                rows="2"
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500 resize-none"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                placeholder="Enter email address"
                value={customerDetails.email}
                onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500"
              />
            </div>

          
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-300 px-4 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!customerDetails.name.trim() || !customerDetails.mobile.trim()}
            className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {buttonIcon} {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsModal;