import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const ItemComplimentaryModal = ({ isOpen, onClose, item, onComplimentaryItem }) => {
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('');
    const quantityInputRef = useRef(null);

    // Reset state when modal opens with the item's current quantity
    useEffect(() => {
        if (isOpen && item) {
            setQuantity(item?.quantity || 1);
            setReason('');

            // Auto-select the quantity input after a small delay
            setTimeout(() => {
                if (quantityInputRef.current) {
                    quantityInputRef.current.select();
                    quantityInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const maxQuantity = item?.quantity || 1;

    const handleConfirm = () => {
        if (!reason || reason.trim() === '') {
            alert('⚠️ Please provide a reason for complimentary');
            return;
        }

        // Convert to number and validate
        const qty = quantity === '' ? 1 : parseInt(quantity);

        if (isNaN(qty) || qty <= 0 || qty > maxQuantity) {
            alert(`⚠️ Please enter a valid quantity (1-${maxQuantity})`);
            return;
        }

        onComplimentaryItem(item, reason, qty);

        setReason('');
        setQuantity(1);
        onClose();
    };

    const handleClose = () => {
        setReason('');
        setQuantity(1);
        onClose();
    };

    const handleQuantityChange = (newQuantity) => {
        // Allow empty value temporarily while typing
        if (newQuantity === '' || newQuantity === null || newQuantity === undefined) {
            setQuantity('');
            return;
        }

        const numValue = parseInt(newQuantity);

        // If it's not a valid number, keep the current value
        if (isNaN(numValue)) {
            return;
        }

        // Clamp between 1 and maxQuantity
        const validQuantity = Math.min(Math.max(1, numValue), maxQuantity);
        setQuantity(validQuantity);
    };

    const headerBgColor = 'bg-green-600';
    const headerHoverColor = 'hover:bg-green-700';
    const accentColor = 'green';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
                {/* Header */}
                <div className={`${headerBgColor} text-white px-6 py-4 rounded-t-lg flex justify-between items-center`}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        Item Complimentary
                    </h2>
                    <button
                        onClick={handleClose}
                        className={`${headerHoverColor} rounded-full p-1 transition-colors`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>


                {/* Body */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold mb-2">
                            Mark Item as Complimentary
                        </h3>
                        <p className="text-gray-600 mb-2">
                            Item: <strong>{item.name}</strong>
                        </p>
                        {item.variantName && (
                            <p className="text-sm text-gray-600 mb-2">
                                Variant: <strong>{item.variantName}</strong>
                            </p>
                        )}
                    </div>

                    {/* Quantity */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity to Mark as Complimentary <span className="text-red-600">*</span>
                        </label>
                        <div className="flex items-center justify-center space-x-4">
                            <button
                                onClick={() => handleQuantityChange(quantity - 1)}
                                className="w-10 h-10 border-2 border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 text-lg font-bold text-gray-700"
                            >
                                −
                            </button>
                            <input
                                type="number"
                                ref={quantityInputRef}
                                value={quantity}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    // Allow empty string while typing
                                    if (value === '') {
                                        setQuantity('');
                                        return;
                                    }

                                    const numValue = parseInt(value);
                                    if (!isNaN(numValue)) {
                                        handleQuantityChange(numValue);
                                    }
                                }}
                                onBlur={() => {
                                    // If field is empty on blur, reset to 1
                                    if (quantity === '' || quantity === 0) {
                                        setQuantity(1);
                                    }
                                }}
                                onFocus={(e) => e.target.select()}
                                className={`w-20 text-center border-2 border-gray-300 rounded px-2 py-2 text-lg font-semibold focus:border-${accentColor}-500 focus:outline-none`}
                                min="1"
                                max={maxQuantity}
                            />
                            <button
                                onClick={() => handleQuantityChange(quantity + 1)}
                                className="w-10 h-10 border-2 border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 text-lg font-bold text-gray-700"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Reason for Complimentary <span className="text-red-600">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please provide reason for complimentary (e.g., special guest, promotional offer, customer satisfaction)"
                            className={`w-full border-2 border-gray-300 rounded px-3 py-2 h-24 resize-none focus:border-${accentColor}-500 focus:outline-none`}
                            autoFocus
                        />
                        {!reason && (
                            <p className="text-red-600 text-xs mt-1">* Reason is required</p>
                        )}
                    </div>

                    <div className="flex space-x-2">
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-gray-500 text-white py-3 rounded hover:bg-gray-600 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={!reason || reason.trim() === ''}
                            className="flex-1 py-3 rounded transition-colors font-medium flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Mark Complimentary ({quantity})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemComplimentaryModal;
