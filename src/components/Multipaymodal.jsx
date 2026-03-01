import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const MultiPayModal = ({ isOpen, onClose, totalAmount, onConfirm }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [paymentAmounts, setPaymentAmounts] = useState({
    Cash: '',
    Card: '',
    UPI: '',
    OTHER: '',
 
  });

  const paymentMethods = [
    { code: 'Cash', name: 'Cash' },
    { code: 'Card', name: 'Card' },
    { code: 'UPI', name: 'UPI' },
    { code: 'OTHER', name: 'OTHER' },

  ];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      setPaymentAmounts({
        Cash: '',
        Card: '',
        UPI: '',
        OTHER: '',
       
      });
      document.body.style.overflow = 'unset';
    }
    return () => document.body.style.overflow = 'unset';
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (paymentCode, value) => {
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPaymentAmounts(prev => ({
        ...prev,
        [paymentCode]: value
      }));
    }
  };

  const calculateTotalEntered = () => {
    return Object.values(paymentAmounts).reduce((sum, amount) => {
      const num = parseFloat(amount) || 0;
      return sum + num;
    }, 0);
  };

  const totalEntered = calculateTotalEntered();
  const difference = totalAmount - totalEntered;
  const isExact = Math.abs(difference) < 0.01;

  const handleConfirm = () => {
    if (!isExact) {
      alert(`Amount Mismatch!\n\nBill: ₹${totalAmount.toFixed(2)}\nEntered: ₹${totalEntered.toFixed(2)}\nDifference: ₹${Math.abs(difference).toFixed(2)}`);
      return;
    }

    const paymentModes = [];
    Object.entries(paymentAmounts).forEach(([code, amount]) => {
      const numAmount = parseFloat(amount);
      if (numAmount > 0) {
        paymentModes.push({
          PaymentType: code,
          Amount: numAmount
        });
      }
    });

    if (paymentModes.length === 0) {
      alert('Enter at least one payment amount');
      return;
    }

    onConfirm(paymentModes);
  };

  return (
    <div 
      className={`fixed inset-0 z-[60] flex items-center justify-center p-2 transition-all duration-300 ${
        isVisible ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
      }`} 
      onClick={(e) => { 
        if (e.target === e.currentTarget) onClose(); 
      }}
    >
      <div 
        className={`relative bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-[380px] transform transition-all duration-300 ${
          isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-white px-3 py-2 relative border-b border-gray-300">
          <button
            onClick={onClose}
            className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>

          <h2 className="text-base font-bold text-black">Multi-Pay</h2>
          <p className="text-[11px] text-gray-600">Bill: ₹{totalAmount.toFixed(2)}</p>
        </div>

        {/* Body */}
        <div className="p-3">
          <div className="space-y-2">
            {paymentMethods.map((method) => {
              const amount = paymentAmounts[method.code];
              
              return (
                <div key={method.code} className="flex items-center gap-2">
                  <label className="w-24 text-xs font-semibold text-gray-700">
                    {method.name}
                  </label>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                      ₹
                    </span>
                    <input
                      type="text"
                      value={amount}
                      onChange={(e) => handleAmountChange(method.code, e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded focus:border-blue-500 focus:outline-none text-right text-xs font-semibold"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total Display */}
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-700">Total Entered:</span>
              <span className="text-sm font-bold text-gray-800">
                ₹{totalEntered.toFixed(2)}
              </span>
            </div>
            
            <div className={`flex justify-between items-center text-xs ${
              isExact ? 'text-green-600' : ' text-gray-700'
            }`}>
              <span className="font-medium">
                {isExact ? '✅ Match' : `❌ ${difference > 0 ? 'Short' : 'Excess'}`}
              </span>
              <span className="font-bold">
                ₹{Math.abs(difference).toFixed(2)}
              </span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-300 px-3 py-2 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 hover:border-gray-400 rounded text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isExact}
            className={`flex-1 px-3 py-2 rounded text-xs font-bold ${
              isExact 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isExact ? 'CONFIRM' : 'MISMATCH'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default MultiPayModal;