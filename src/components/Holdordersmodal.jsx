import React, { useState, useEffect } from 'react';
import { X, Clock, ShoppingBag, Truck } from 'lucide-react';
import { getTakeawayOrders, getHomeDeliveryOrders, getOrderDetails, getItems } from '../services/apicall';

const HoldOrdersModal = ({ isOpen, onClose, onSelectHoldOrder }) => {
  const [selectedType, setSelectedType] = useState(null); // null, 'takeaway', or 'homedelivery'
  const [holdOrders, setHoldOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingOrderId, setLoadingOrderId] = useState(null);

  // ✅ ADD THIS: Helper function to enrich cart items with tax data from getItems API
  const enrichItemsWithTaxData = async (cartItems) => {
    try {
      console.log('🔍 Enriching hold order items with tax data...');
      const itemsResponse = await getItems();
      const allItems = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse?.data || [];

      const enrichedItems = cartItems.map(cartItem => {
        const fullItemData = allItems.find(item =>
          (item.itemId || item.id) === cartItem.itemId
        );

        if (fullItemData) {
          console.log(`✅ Found tax data for ${cartItem.itemname}:`, fullItemData.TaxItems);
          return {
            ...cartItem,
            TaxItems: fullItemData.TaxItems || [],
            TransactionItems: fullItemData.TransactionItems || [],
            SectionItemRates: fullItemData.SectionItemRates || []
          };
        }

        console.warn(`⚠️ No tax data found for item ${cartItem.itemname} (ID: ${cartItem.itemId})`);
        return cartItem;
      });

      console.log('✅ Hold order items enriched with tax data');
      return enrichedItems;
    } catch (error) {
      console.error("❌ Failed to enrich items with tax data:", error);
      return cartItems;
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Reset to selection screen when modal opens
      setSelectedType(null);
      setHoldOrders([]);
      setError(null);
    }
  }, [isOpen]);

  const fetchOrders = async (type) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      if (type === 'takeaway') {
        response = await getTakeawayOrders();
      } else {
        response = await getHomeDeliveryOrders();
      }

      let orders = [];

      // Handle different response structures
      if (response?.data && Array.isArray(response.data)) {
        orders = response.data;
      } else if (Array.isArray(response)) {
        orders = response;
      }

      setHoldOrders(orders);
      setSelectedType(type);
    } catch (err) {
      console.error('❌ Error fetching hold orders:', err);
      setError(err.message || 'Failed to load hold orders');
      setHoldOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order) => {
    const orderId = order.orderId || order.id;

    try {
      setLoadingOrderId(orderId);
      console.log('📥 Fetching details for order:', orderId);

      const apiResponse = await getOrderDetails(orderId);
      console.log('✅ Full Order details received:', JSON.stringify(apiResponse, null, 2));

      let orderDetails = null;
      let orderItems = null;

      if (apiResponse?.OrderDetailsResponse) {
        orderDetails = apiResponse.OrderDetailsResponse;
        orderItems = orderDetails.OrderItemsDetails || orderDetails.orderItemsDetails || orderDetails.items;
      }
      else if (apiResponse?.orderItemsDetails || apiResponse?.OrderItemsDetails) {
        orderDetails = apiResponse;
        orderItems = apiResponse.OrderItemsDetails || apiResponse.orderItemsDetails;
      }
      else if (apiResponse?.items && Array.isArray(apiResponse.items)) {
        orderDetails = apiResponse;
        orderItems = apiResponse.items;
      }
      else {
        orderDetails = apiResponse;
        orderItems = apiResponse.orderItems || apiResponse.OrderItems || [];
      }

      console.log('📦 Extracted order details:', orderDetails);
      console.log('📦 Extracted items:', orderItems);

      if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
        console.error('❌ No items found in order. Full response:', apiResponse);
        alert(`⚠️ This order has no items to restore.\n\nOrder ID: ${orderId}\nPlease check the console for details.`);
        setLoadingOrderId(null);
        return;
      }

      // ✅ TRANSFORM ITEMS (without tax data initially)
      const groupedMap = new Map();

      orderItems.forEach((item) => {
        const itemId = item.itemId || item.ItemId || 0;
        const variantId = item.variantId || item.VariantId || 0;
        const description = (item.addDetails || item.AddDetails || item.description || '').trim();
        const key = `${itemId}_${variantId}_${description}`.toLowerCase();

        const qty = parseFloat(item.itemQty || item.ItemQty || item.quantity || 0);
        const discount = parseFloat(item.itemDisc || item.ItemDisc || item.discount || 0);
        const discType = item.discType || item.DiscType || 'None';

        if (groupedMap.has(key)) {
          const existing = groupedMap.get(key);
          existing.quantity += qty;
        } else {
          groupedMap.set(key, {
            ...item,
            quantity: qty,
          });
        }
      });

      // ✅ TRANSFORM ITEMS (with tax data enrichment after grouping)
      let transformedItems = Array.from(groupedMap.values())
        .filter(item => item.quantity > 0)
        .map((item, index) => {
          const itemId = item.itemId || item.ItemId || index;
          const variantId = item.variantId || item.VariantId || 0;
          const id = `${itemId}_${variantId}_${index}`;

          return {
            id: id,
            itemId: itemId,
            itemname: item.itemname || item.itemName || item.ItemName || 'Unknown Item',
            name: item.itemname || item.itemName || item.ItemName || 'Unknown Item',
            itemPrice: parseFloat(item.itemPrice || item.ItemPrice || 0),
            price: parseFloat(item.itemPrice || item.ItemPrice || 0),
            itemQty: item.quantity,
            quantity: item.quantity,
            itemDisc: 0,
            discount: 0,
            discType: 'None',
            addDetails: item.addDetails || item.AddDetails || item.description || '',
            description: item.addDetails || item.AddDetails || item.description || '',
            variantId: variantId,
            variantName: item.variantName || item.VariantName || '',
            modifierItem: item.ModifierItem || item.modifierItem || 0,
            isVoided: false,
            voidReason: '',
            // ✅ Preserve TaxItems if present in API response
            TaxItems: item.TaxItems || item.taxItems || [],
            TransactionItems: item.TransactionItems || item.transactionItems || [],
            SectionItemRates: item.SectionItemRates || item.sectionItemRates || []
          };
        });

      // ✅ CRITICAL FIX: Enrich items with tax data from getItems API
      console.log('🔄 Enriching items with tax data...');
      transformedItems = await enrichItemsWithTaxData(transformedItems);
      console.log('✅ Items after enrichment:', transformedItems);

      const transformedOrder = {
        orderId: orderId,
        orderText: orderDetails?.orderText || order.orderText || '',
        orderStatus: orderDetails?.orderStatus || order.orderStatus || 'RO',
        transactionType: orderDetails?.transactionType || order.transactionType || (selectedType === 'takeaway' ? 2 : 3),
        sectionTable: orderDetails?.sectionTable || orderDetails?.tableId || order.tableId || 0,
        tableName: orderDetails?.tableName || order.tableName || '',
        sectionName: orderDetails?.sectionName || order.sectionName || '',
        pax: orderDetails?.pax || orderDetails?.PAX || order.pax || 1,
        PAX: orderDetails?.pax || orderDetails?.PAX || order.pax || 1,

        orderItems: transformedItems,  // ✅ Now includes TaxItems

        originalResponse: apiResponse
      };

      console.log('✅ Transformed order ready for restoration (with tax data):', transformedOrder);

      onSelectHoldOrder(transformedOrder);
      onClose();

    } catch (err) {
      console.error('❌ Error fetching order details:', err);
      alert(`Failed to load order details: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
    setHoldOrders([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {selectedType === null ? 'Hold Orders' : selectedType === 'takeaway' ? 'Takeaway Orders' : 'Home Delivery Orders'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-gray-700 rounded-full p-1 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedType === null ? (
            /* Selection Screen - Choose Takeaway or Home Delivery */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => fetchOrders('takeaway')}
                className="border-2 border-gray-300 rounded-lg p-8 hover:shadow-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-blue-100 p-6 rounded-full group-hover:bg-blue-200 transition-colors">
                    <ShoppingBag className="w-12 h-12 text-blue-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Takeaway</h3>
                  <p className="text-gray-500 text-sm">View takeaway hold orders</p>
                </div>
              </button>

              <button
                onClick={() => fetchOrders('homedelivery')}
                className="border-2 border-gray-300 rounded-lg p-8 hover:shadow-lg hover:border-green-500 hover:bg-green-50 transition-all group"
              >
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-green-100 p-6 rounded-full group-hover:bg-green-200 transition-colors">
                    <Truck className="w-12 h-12 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800">Home Delivery</h3>
                  <p className="text-gray-500 text-sm">View home delivery hold orders</p>
                </div>
              </button>
            </div>
          ) : loading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800 mb-4"></div>
              <p className="text-gray-600">Loading hold orders...</p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-red-600 font-medium">{error}</p>
              <div className="flex space-x-3 mt-4">
                <button
                  onClick={() => fetchOrders(selectedType)}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  onClick={handleBack}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          ) : holdOrders.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-gray-300 text-6xl mb-4">📋</div>
              <p className="text-gray-500 text-lg font-medium">No Hold Orders</p>
              <p className="text-gray-400 text-sm mt-2">
                All {selectedType === 'takeaway' ? 'takeaway' : 'home delivery'} orders are currently active or completed
              </p>
              <button
                onClick={handleBack}
                className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
              >
                Back
              </button>
            </div>
          ) : (
            /* Orders Grid */
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {holdOrders.map((order, index) => {
                  const orderId = order.orderId || order.id || index;
                  const isLoadingThis = loadingOrderId === orderId;

                  // Clean up orderText - remove number prefix and "KOT Order" suffix
                  const displayText = order.orderText
                    ? order.orderText
                      .replace(/^\d+\s*-?\s*/, '') // Remove leading number and dash
                      .replace(/-?KOT Order/gi, '') // Remove "KOT Order" with or without dash
                      .replace(/KOT Order/gi, '')
                      .trim()
                    : '';

                  return (
                    <button
                      key={orderId}
                      onClick={() => handleSelectOrder(order)}
                      disabled={isLoadingThis}
                      className={`border-2 border-gray-300 rounded-lg p-4 hover:shadow-lg hover:border-gray-500 transition-all cursor-pointer ${isLoadingThis ? 'opacity-50 cursor-wait' : ''
                        }`}
                    >
                      <div className="text-center">
                        {isLoadingThis ? (
                          <>
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 mx-auto mb-2"></div>
                            <div className="text-xs text-gray-500">Loading...</div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm text-gray-500 mb-1">Order</div>
                            <div className="text-2xl font-bold text-gray-800">#{orderId}</div>
                            {displayText && (
                              <div className="text-xs text-gray-500 mt-1 truncate">
                                {displayText}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedType !== null && !loading && !error && (
          <div className="bg-gray-100 px-6 py-3 rounded-b-lg border-t flex justify-between items-center">
            <button
              onClick={handleBack}
              className="text-sm text-gray-800 hover:text-gray-600 font-medium"
            >
              ← Back
            </button>

            <button
              onClick={() => fetchOrders(selectedType)}
              className="text-sm text-gray-800 hover:text-gray-600 font-medium"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HoldOrdersModal;