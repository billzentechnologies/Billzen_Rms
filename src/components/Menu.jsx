import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { getItems, getSubCategories, getItemVariants } from '../services/apicall';
import VariantPopup from './VariantPopup';
import CustomizeItemModal from './CustomizeItemModal';

const Menu = ({
  searchQuery,
  setSearchQuery,
  addToCart,
  activeTab,
  setActiveTab,
  selectedSubCategory,
  setSelectedSubCategory,
  selectedTable,
  numPersons,
}) => {
  const searchInputRef = React.useRef(null);
  const [items, setItems] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemVariants, setItemVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [customizeItem, setCustomizeItem] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [itemsResponse, subCategoriesResponse] = await Promise.all([
          getItems(),
          getSubCategories()
        ]);

        const itemsData = Array.isArray(itemsResponse)
          ? itemsResponse
          : itemsResponse?.data || itemsResponse || [];

        const subCategoriesData = Array.isArray(subCategoriesResponse)
          ? subCategoriesResponse
          : subCategoriesResponse?.data || subCategoriesResponse || [];

        console.log("📦 RAW ITEMS API RESPONSE:", itemsResponse);
        console.log("🔍 FIRST ITEM STRUCTURE:", itemsData[0]);
        console.log("📍 SELECTED TABLE:", selectedTable);

        setItems(itemsData);
        setSubCategories(subCategoriesData);

      } catch (err) {
        console.error("❌ Failed to fetch menu data:", err);
        setError("Failed to load menu data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Run only once on mount

  useEffect(() => {
    const handleRefocus = () => {
      // Small delay to ensure DOM updates and focus transitions are complete
      setTimeout(() => {
        if (searchInputRef.current) {
          const activeElement = document.activeElement;
          const isInputField =
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable;

          // Only refocus if we're not already in an input field
          if (!isInputField) {
            searchInputRef.current.focus();
          }
        }
      }, 100);
    };

    // Automatically focus when loading is finished or tab changes
    if (!loading) {
      handleRefocus();
    }

    // Refocus on any click, window focus, or keydown
    window.addEventListener('click', handleRefocus);
    window.addEventListener('focus', handleRefocus);
    window.addEventListener('keydown', handleRefocus);

    return () => {
      window.removeEventListener('click', handleRefocus);
      window.removeEventListener('focus', handleRefocus);
      window.removeEventListener('keydown', handleRefocus);
    };
  }, [loading, activeTab]);

  const getSectionPriceAndTax = (item) => {
    const defaultPrice = item.salePrice || item.price || 0;
    const defaultTaxRate = item.taxRate || 0;

    if (!selectedTable || !selectedTable.sectionId) {
      return { price: defaultPrice, taxRate: defaultTaxRate };
    }

    const sectionName = selectedTable.Section_name;
    const sectionId = selectedTable.sectionId;

    console.log(`🔍 Getting price & tax for: ${item.itemName || item.item_name || item.name}`);
    console.log(`📍 Section: ${sectionName} (ID: ${sectionId})`);
    console.log(`💰 Default Price: ₹${defaultPrice}, Tax: ${defaultTaxRate}%`);

    if (item.SectionItemRates && Array.isArray(item.SectionItemRates) && item.SectionItemRates.length > 0) {
      console.log(`📋 Checking ${item.SectionItemRates.length} section rates`);

      const sectionRate = item.SectionItemRates.find(rate => rate.sectionId === sectionId);

      if (sectionRate) {
        const price = parseFloat(sectionRate.itemRate || sectionRate.price || defaultPrice);
        const taxRate = parseFloat(sectionRate.taxRate || defaultTaxRate);

        if (!isNaN(price) && price > 0) {
          console.log(`✅ Found section rate: ₹${price}, Tax: ${taxRate}% (sectionId: ${sectionId})`);
          return { price, taxRate };
        }
      } else {
        console.log(`⚠️ No rate found for sectionId: ${sectionId}`);
        console.log(`Available sectionIds:`, item.SectionItemRates.map(r => r.sectionId));
      }
    }

    console.log(`⚠️ Using default price: ₹${defaultPrice}, Tax: ${defaultTaxRate}%`);
    return { price: defaultPrice, taxRate: defaultTaxRate };
  };

  const handleItemClick = async (item) => {
    const itemId = item.itemId || item.id || item.itemTaxId;
    const itemName = item.itemName || item.item_name || item.name || item.title || 'Item';

    console.log("🖱️ Item clicked:", itemName, "ID:", itemId);

    // ✅ Check if this is a customizable/open item
    if (item.Customize === true || item.customize === true) {
      console.log("🎨 Opening customize modal for:", itemName);
      setCustomizeItem(item);
      setShowCustomizeModal(true);
      return;
    }

    try {
      setLoadingVariants(true);

      const variantsResponse = await getItemVariants(itemId);

      console.log("📦 Variants Response:", variantsResponse);

      let variants = [];
      if (Array.isArray(variantsResponse)) {
        variants = variantsResponse;
      } else if (variantsResponse?.data && Array.isArray(variantsResponse.data)) {
        variants = variantsResponse.data;
      } else if (variantsResponse && typeof variantsResponse === 'object') {
        variants = [variantsResponse];
      }

      const validVariants = variants.filter(v =>
        v &&
        (v.variantName || v.name) &&
        v.isActive !== false
      );

      console.log(`✅ Found ${validVariants.length} valid variants`);

      if (validVariants.length > 0) {
        setSelectedItem(item);
        setItemVariants(validVariants);
        setShowVariantPopup(true);
      } else {
        console.log("➕ No variants, adding directly to cart");
        addItemToCart(item, null);
      }

    } catch (error) {
      console.error("❌ Error fetching variants:", error);
      console.log("➕ Error with variants, adding directly to cart");
      addItemToCart(item, null);
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleVariantSelect = (variant) => {
    console.log("✅ Variant selected:", variant);
    addItemToCart(selectedItem, variant);
    setShowVariantPopup(false);
    setSelectedItem(null);
    setItemVariants([]);
  };

  const handleCustomizeConfirm = (customDetails) => {
    console.log("🎨 Customize confirmed:", customDetails);

    // Add customized item to cart with custom name, quantity, and rate
    const itemId = customizeItem.itemId || customizeItem.id || customizeItem.itemTaxId || 0;

    // Use openItemid to identify this as a custom/open item
    addToCart({
      itemId: itemId, // Check for actual itemId
      itemName: customDetails.itemName,
      name: customDetails.itemName,
      salePrice: customDetails.rate,
      price: customDetails.rate,
      taxRate: customizeItem.taxRate || 0,
      gstRate: customizeItem.taxRate || 0,
      variantId: 0,
      variantName: '',
      sectionId: selectedTable?.sectionId,
      sectionName: selectedTable?.Section_name,
      quantity: customDetails.quantity,
      discount: 0,
      discType: 'None',
      description: '',
      modifierItem: String(itemId), // Reference to the open item template
      isVoided: false,
      voidReason: '',
      isComplimentary: false,
      complimentaryReason: '',
      TaxItems: customizeItem.TaxItems || [],
      TransactionItems: customizeItem.TransactionItems || [],
      SectionItemRates: customizeItem.SectionItemRates || [],
      openItemid: itemId, // Mark as open item
      categoryId: customizeItem.categoryId,
      subcategoryId: customizeItem.subcategoryId,
      unitId: customizeItem.unitId,
      categoryName: customizeItem.categoryName,
      subcategoryName: customizeItem.subcategoryName,
      barCode: customizeItem.barCode,
      hsnCode: customizeItem.hsnCode,
      isActive: true
    });

    setShowCustomizeModal(false);
    setCustomizeItem(null);
  };

  // ✅ CRITICAL: Pass ALL item data including TaxItems
  const addItemToCart = (item, variant) => {
    const itemId = item.itemId || item.id || item.itemTaxId;
    const itemName = item.itemName || item.item_name || item.name || item.title || 'Item';

    const { price: basePrice, taxRate: baseTaxRate } = getSectionPriceAndTax(item);

    const finalPrice = variant
      ? parseFloat(variant.price || variant.variantPrice || basePrice)
      : basePrice;

    const finalTaxRate = variant?.taxRate
      ? parseFloat(variant.taxRate)
      : baseTaxRate;

    const variantId = variant?.variantId || variant?.id || 0;
    const variantName = variant?.variantName || variant?.name || '';

    console.log("🛒 Adding to cart WITH TaxItems:", {
      itemName,
      variantName: variantName || 'No variant',
      price: finalPrice,
      taxRate: finalTaxRate,
      TaxItems: item.TaxItems,  // ✅ CHECK THIS
      section: selectedTable?.Section_name
    });

    // ✅ CRITICAL: Explicitly pass ALL item properties including TaxItems
    addToCart({
      itemId: itemId,
      itemName: itemName,
      name: itemName,
      salePrice: finalPrice,
      price: finalPrice,
      taxRate: finalTaxRate,
      gstRate: finalTaxRate,
      variantId: variantId,
      variantName: variantName,
      sectionId: selectedTable?.sectionId,
      sectionName: selectedTable?.Section_name,
      quantity: 1,
      discount: 0,
      discType: 'None',
      description: '',
      modifierItem: 0,
      isVoided: false,
      voidReason: '',
      // ✅✅✅ CRITICAL: Pass the TaxItems array from API
      TaxItems: item.TaxItems || [],
      TransactionItems: item.TransactionItems || [],
      SectionItemRates: item.SectionItemRates || [],
      // Pass all other original item properties
      categoryId: item.categoryId,
      subcategoryId: item.subcategoryId,
      unitId: item.unitId,
      item_name: item.item_name,
      categoryName: item.categoryName,
      subcategoryName: item.subcategoryName,
      barCode: item.barCode,
      hsnCode: item.hsnCode,
      isActive: item.isActive
    });
  };

  // ✅ UPDATED: Search across all items when searchQuery is present, ignore subcategory filter
  const filteredMenuItems = items.filter(item => {
    const itemName = item.itemName || item.item_name || item.name || item.title || '';
    const matchesSearch = !searchQuery || itemName.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = item.isActive !== false;

    // ✅ If there's a search query, ignore category filter and search all items
    if (searchQuery && searchQuery.trim() !== '') {
      return matchesSearch && isActive;
    }

    // ✅ If no search query, apply category filter
    const selectedSubCategoryObj = subCategories.find(sc => sc.subcategoryName === selectedSubCategory);

    let matchesCategory = true;
    if (selectedSubCategory && selectedSubCategoryObj) {
      if (item.subcategoryId && selectedSubCategoryObj.subcategoryId) {
        matchesCategory = item.subcategoryId === selectedSubCategoryObj.subcategoryId;
      } else if (item.subcategoryName) {
        matchesCategory = item.subcategoryName === selectedSubCategory;
      } else if (item.categoryName) {
        matchesCategory = item.categoryName === selectedSubCategoryObj.categoryName;
      }
    }

    return matchesCategory && isActive;
  });

  // Loading state handled inline now

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold mb-2">Error Loading Menu</div>
          <div className="text-sm">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col p-2 sm:p-4 overflow-hidden">
        <div className="mb-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              ref={searchInputRef}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* ✅ Hidden scrollbar but scrolling still works */}
        <div
          className="flex-1 overflow-y-auto pr-1"
          style={{
            scrollbarWidth: 'none', /* Firefox */
            msOverflowStyle: 'none', /* IE and Edge */
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {filteredMenuItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredMenuItems.map((item, index) => {
                const itemName = item.itemName || item.item_name || item.name || item.title || `Item ${index + 1}`;
                const itemId = item.itemId || item.id || item.itemTaxId || index;

                const { price: itemPrice, taxRate: itemTaxRate } = getSectionPriceAndTax(item);
                const defaultPrice = item.salePrice || item.price || 0;
                const hasSectionDiscount = itemPrice < defaultPrice;

                return (
                  <div
                    key={itemId}
                    className="bg-white border border-gray-200 hover:border-gray-400 rounded p-3 cursor-pointer transition-colors relative"
                    onClick={() => handleItemClick(item)}
                  >
                    {loadingVariants && selectedItem?.itemId === itemId && (
                      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      </div>
                    )}

                    {hasSectionDiscount && (
                      <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Special
                      </div>
                    )}

                    <div className="text-sm font-semibold text-center text-gray-800 mb-2 line-clamp-2 min-h-[2.5rem]" title={itemName}>
                      {itemName}
                    </div>

                    <div className="text-center">
                      <div className="text-green-600 font-bold text-sm">
                        ₹{itemPrice.toFixed(2)}
                      </div>
                      {hasSectionDiscount && (
                        <div className="text-xs text-gray-400 line-through">
                          ₹{defaultPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-20">
              {searchQuery ? (
                <div className="space-y-3">
                  <div className="text-lg font-medium">No items found for "{searchQuery}"</div>
                  <div className="text-sm text-gray-400">Try different keywords or clear the search</div>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Clear Search
                  </button>
                </div>
              ) : selectedSubCategory ? (
                <div className="space-y-3">
                  <div className="text-lg font-medium">No items in "{selectedSubCategory}"</div>
                  <div className="text-sm text-gray-400">Try selecting a different category from the sidebar</div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-lg font-medium">Select a category to view items</div>
                  <div className="text-sm text-gray-400">Choose from the categories on the left sidebar</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <VariantPopup
        isOpen={showVariantPopup}
        onClose={() => {
          setShowVariantPopup(false);
          setSelectedItem(null);
          setItemVariants([]);
        }}
        itemName={selectedItem?.itemName || selectedItem?.item_name || selectedItem?.name || ''}
        variants={itemVariants}
        onSelectVariant={handleVariantSelect}
      />

      <CustomizeItemModal
        isOpen={showCustomizeModal}
        onClose={() => {
          setShowCustomizeModal(false);
          setCustomizeItem(null);
        }}
        onConfirm={handleCustomizeConfirm}
      />
    </>
  );
};

export default Menu;