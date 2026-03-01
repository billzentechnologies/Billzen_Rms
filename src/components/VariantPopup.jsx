import React from 'react';
import { X } from 'lucide-react';

const VariantPopup = ({ isOpen, onClose, itemName, variants, onSelectVariant }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Select Variant - {itemName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Variants Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {variants && variants.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {variants.map((variant) => (
                <button
                  key={variant.variantId || variant.id}
                  onClick={() => onSelectVariant(variant)}
                  className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-lg p-4 transition-all hover:shadow-md group"
                >
                  <div className="text-center">
                    <div className="text-sm font-semibold text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem] group-hover:text-blue-600">
                      {variant.variantName || variant.name || 'Variant'}
                    </div>
                    <div className="text-green-600 font-bold text-base">
                      ₹{parseFloat(variant.price || variant.variantPrice || 0).toFixed(2)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p className="text-lg">No variants available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariantPopup;