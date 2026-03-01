import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FaPercentage, FaTags } from 'react-icons/fa';

const CategoryDiscountModal = ({
    isOpen,
    onClose,
    selectedItems,
    onApplyCategoryDiscounts,
    existingCategoryDiscounts = {}
}) => {
    const [categories, setCategories] = useState([]);
    const [discountValues, setDiscountValues] = useState({});

    useEffect(() => {
        if (isOpen && selectedItems) {
            // Group items by category to identify all unique categories in the order
            const categoryMap = new Map();

            selectedItems.forEach(item => {
                if (item.isVoided) return;

                const catId = item.categoryId || 0;
                const catName = item.categoryName || (catId !== 0 ? `Category ${catId}` : 'General');

                if (!categoryMap.has(catId)) {
                    categoryMap.set(catId, {
                        id: catId,
                        name: catName,
                        items: []
                    });
                }
                categoryMap.get(catId).items.push(item);
            });

            const sortedCategories = Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            setCategories(sortedCategories);

            // Initialize discount values from existing ones or set to 0
            const initialDiscounts = {};
            sortedCategories.forEach(cat => {
                initialDiscounts[cat.id] = existingCategoryDiscounts[cat.id] || 0;
            });
            setDiscountValues(initialDiscounts);
        }
    }, [isOpen, selectedItems, existingCategoryDiscounts]);

    const handleDiscountChange = (categoryId, value) => {
        const numericValue = parseFloat(value);
        if (!isNaN(numericValue) && numericValue >= 0 && numericValue <= 100) {
            setDiscountValues(prev => ({
                ...prev,
                [categoryId]: numericValue
            }));
        } else if (value === '') {
            setDiscountValues(prev => ({
                ...prev,
                [categoryId]: 0
            }));
        }
    };

    const handleApply = () => {
        onApplyCategoryDiscounts(discountValues);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-2 bg-black bg-opacity-60"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col"
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
                        <FaTags className="text-gray-700" />
                        Category-wise Discounts
                    </h3>
                </div>

                {/* Body */}
                <div className="p-4 overflow-y-auto flex-1">
                    <p className="text-sm text-gray-600 mb-4">
                        Apply specific discount percentages to each category in this order.
                    </p>

                    <div className="space-y-3">
                        {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <span className="font-bold text-gray-800">{cat.name}</span>
                                    <div className="text-xs text-gray-500">
                                        {cat.items.length} item(s) • Total: ₹{(cat.items.reduce((sum, i) => sum + (i.price * i.quantity), 0)).toFixed(2)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-32">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            value={discountValues[cat.id] || 0}
                                            onChange={(e) => handleDiscountChange(cat.id, e.target.value)}
                                            className="w-full pl-3 pr-8 py-2 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-500 text-right font-bold"
                                            min="0"
                                            max="100"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            %
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {categories.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No categories found in the current order.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-300 px-4 py-3 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded font-bold hover:bg-gray-400"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={categories.length === 0}
                        className={`px-6 py-2 bg-gray-700 text-white rounded font-bold transition-colors ${categories.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800'
                            }`}
                    >
                        Apply Discounts
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CategoryDiscountModal;
