import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FaPercentage } from 'react-icons/fa';
import { getDiscounts } from '../services/apicall';

const DiscountModal = ({ 
  isOpen, 
  onClose, 
  onApplyDiscount,
  selectedDiscount 
}) => {
  const [discounts, setDiscounts] = useState([]);
  const [manualDiscountValue, setManualDiscountValue] = useState('');

  // Load discounts on mount
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const response = await getDiscounts();
        if (response && Array.isArray(response)) {
          const mappedDiscounts = response.map(discount => ({
            discountId: discount.discountId,
            discountName: discount.discountCategory || discount.discountName,
            discountPercentage: parseFloat(discount.discountPercentage) || 0,
            isActive: discount.isactive !== undefined ? discount.isactive : discount.isActive
          }));
          setDiscounts(mappedDiscounts);
        }
      } catch (error) {
        console.error('❌ Failed to load discounts:', error);
      }
    };
    
    if (isOpen) {
      fetchDiscounts();
    }
  }, [isOpen]);

  // Reset manual discount when modal closes
  useEffect(() => {
    if (!isOpen) {
      setManualDiscountValue('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyManualDiscount = () => {
    const value = parseFloat(manualDiscountValue);
    if (value > 0 && value <= 100) {
      const manualDiscount = {
        discountId: 0,
        discountName: `Manual ${value}%`,
        discountPercentage: value,
        isManual: true
      };
      onApplyDiscount(manualDiscount);
      setManualDiscountValue('');
    } else {
      alert('Please enter a valid discount percentage (1-100)');
    }
  };

  const handleClearDiscount = () => {
    onApplyDiscount(null);
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
          <h3 className="text-lg font-bold flex items-center gap-2">
            <FaPercentage />
            Discount Options
          </h3>
        </div>

        {/* Body */}
        <div className="p-4 max-h-[calc(90vh-160px)] overflow-y-auto">
          {/* Manual Discount */}
          <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 mb-3">
            <h4 className="text-sm font-bold text-gray-700 mb-2">Manual Discount</h4>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Enter Discount %"
                value={manualDiscountValue}
                onChange={(e) => setManualDiscountValue(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500"
                min="0"
                max="100"
              />
              <button
                onClick={handleApplyManualDiscount}
                className="px-4 py-2 bg-gray-700 text-white rounded font-bold hover:bg-gray-800"
              >
                OK
              </button>
            </div>
          </div>

          {/* Predefined Discounts Grid */}
          <div className="grid grid-cols-3 gap-2">
            {discounts.filter(d => d.isActive && d.discountPercentage > 0).map((discount) => (
              <button
                key={discount.discountId}
                onClick={() => onApplyDiscount(discount)}
                className={`p-3 rounded-lg font-bold text-sm border-2 transition-all ${
                  selectedDiscount?.discountId === discount.discountId
                    ? 'bg-gray-700 text-white border-gray-700'
                    : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {discount.discountName}
                <br />
                <span className="text-xs">({discount.discountPercentage}%)</span>
              </button>
            ))}
          </div>

          {discounts.filter(d => d.isActive && d.discountPercentage > 0).length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No predefined discounts available. Use manual discount above.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-300 px-4 py-3 flex justify-end gap-2">
          {selectedDiscount && (
            <button
              onClick={handleClearDiscount}
              className="px-4 py-2 bg-red-500 text-white rounded font-bold hover:bg-red-600"
            >
              Clear All
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiscountModal;