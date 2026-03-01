import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const OrderCancelModal = ({ 
  isOpen, 
  onClose, 
  onSubmit,
  billNumber,
  totalAmount 
}) => {
  const [reason, setReason] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      setReason('');
      document.body.style.overflow = 'unset';
    }
    return () => document.body.style.overflow = 'unset';
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please enter a reason for cancellation');
      return;
    }

    onSubmit(reason.trim());
  };

  return (
    <div 
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
      }`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className={`relative bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-md transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white px-4 py-3 relative border-b border-gray-300 rounded-t-lg">
          <button 
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h2 className="text-base font-bold text-black flex items-center gap-2">
               Cancel Order
            </h2>
            <p className="text-gray-600 text-xs mt-1">
              Bill #{billNumber} • ₹{totalAmount?.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            {/* Warning Message */}
      

            {/* Reason Input */}
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">
                Cancellation Reason <span className="text-orange-600">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason (e.g., Customer request, Wrong order, etc.)"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none text-sm"
                rows="4"
                required
                autoFocus
              />
             
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 rounded-b-lg border-t border-gray-200">
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 hover:border-gray-400 rounded font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-800 text-white border border-gray-800 hover:bg-gray-900 rounded font-bold text-sm transition-colors"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderCancelModal;