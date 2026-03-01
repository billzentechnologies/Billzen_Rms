import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const CustomizeItemModal = ({ isOpen, onClose, onConfirm }) => {
    const [itemName, setItemName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [rate, setRate] = useState('');
    const itemNameInputRef = useRef(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setItemName('');
            setQuantity(1);
            setRate('');

            // Auto-focus the item name input after a small delay
            setTimeout(() => {
                if (itemNameInputRef.current) {
                    itemNameInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!itemName || itemName.trim() === '') {
            alert('⚠️ Please enter an item name');
            return;
        }

        if (!rate || parseFloat(rate) <= 0) {
            alert('⚠️ Please enter a valid rate');
            return;
        }

        if (!quantity || quantity <= 0) {
            alert('⚠️ Please enter a valid quantity');
            return;
        }

        // Call the onConfirm callback with the custom item details
        onConfirm({
            itemName: itemName.trim(),
            quantity: parseInt(quantity),
            rate: parseFloat(rate)
        });

        // Reset form
        setItemName('');
        setQuantity(1);
        setRate('');
        onClose();
    };

    const handleClose = () => {
        setItemName('');
        setQuantity(1);
        setRate('');
        onClose();
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleConfirm();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md relative">
                {/* Header */}
                {/* <div className="bg-gray-100 border-b px-6 py-3 rounded-t-lg flex justify-between items-center">
                    <h2 className="text-lg font-bold text-gray-800">
                        Customize Item
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-600 hover:text-gray-800 rounded-full p-1 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div> */}



                {/* Body */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <h3 className="text-xl font-bold mb-2">
                            Open Item
                        </h3>
                    </div>

                    {/* Item Name */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Item Name <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="text"
                            ref={itemNameInputRef}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter item name"
                            className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Quantity */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter quantity"
                            min="1"
                            className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Rate */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Rate <span className="text-red-600">*</span>
                        </label>
                        <input
                            type="number"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Enter rate"
                            min="0"
                            step="0.01"
                            className="w-full border-2 border-gray-300 rounded px-3 py-2 focus:border-blue-500 focus:outline-none"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex space-x-2">
                        <button
                            onClick={handleClose}
                            className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition-colors font-medium"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomizeItemModal;
