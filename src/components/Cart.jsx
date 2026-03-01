import React, { useEffect, useRef, useState } from 'react';
import { Plus, Minus, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PaymentModal from './PaymentModal';
import HoldOrdersModal from './Holdordersmodal';
import ItemModificationModal from './Itemmodificationmodal';
import ItemComplimentaryModal from './ItemComplimentaryModal';
import CustomerDetailsModal from './Customerdetailsmodal';
import { saveOrder, saveItemVoid, markComplimentary, getTransactionTypes, printCheck, getKotRedirectUrl } from "../services/apicall";
import { usePermission } from '../context/PermissionContext';
import { PERMISSIONS } from './permissions';

const Cart = ({
  selectedItems,
  setSelectedItems,
  addToCart,
  updateQuantity,
  removeFromCart,
  total,
  activeTab,
  setActiveTab,
  selectedTable,
  setSelectedTable,
  numPersons,
  setNumPersons,
  existingOrderId,
  setExistingOrderId,
  billNo,
  kotCode,
  sentItems,
  setSentItems,
  salesDateISO,
  discount,
  setDiscount
}) => {
  const cartRef = useRef(null);
  const navigate = useNavigate();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showHoldOrdersModal, setShowHoldOrdersModal] = useState(false);
  const [showItemModificationModal, setShowItemModificationModal] = useState(false);
  const [selectedItemForModification, setSelectedItemForModification] = useState(null);
  const [showItemComplimentaryModal, setShowItemComplimentaryModal] = useState(false);
  const [selectedItemForComplimentary, setSelectedItemForComplimentary] = useState(null);

  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);

  const [transactionTypes, setTransactionTypes] = useState([]);
  const [loadingTransactionTypes, setLoadingTransactionTypes] = useState(true);
  const [voidedItems, setVoidedItems] = useState([]);
  const [complimentaryItems, setComplimentaryItems] = useState([]);

  const totalQuantity = selectedItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const [editingItemId, setEditingItemId] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Add loading states for buttons
  const [isKOTProcessing, setIsKOTProcessing] = useState(false);
  const [isCheckProcessing, setIsCheckProcessing] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    const fetchTransactionTypes = async () => {
      try {
        setLoadingTransactionTypes(true);
        const response = await getTransactionTypes();

        let types = [];
        if (Array.isArray(response)) {
          types = response;
        } else if (response?.data && Array.isArray(response.data)) {
          types = response.data;
        } else if (response && typeof response === 'object') {
          types = [response];
        }

        const mappedTypes = types
          .filter(type => type?.transactionName && type.transactionName.trim() && type.isActive !== false)
          .map(type => {
            let normalizedName = type.transactionName;
            if (normalizedName === 'TakeAway') {
              normalizedName = 'Take Away';
            }

            return {
              id: type.transactionId,
              name: normalizedName,
              originalName: type.transactionName,
              isActive: type.isActive
            };
          });

        const orderPriority = {
          'Dine In': 1,
          'Take Away': 2,
          'TakeAway': 2,
          'Home Delivery': 3
        };

        const sortedTypes = mappedTypes.sort((a, b) => {
          const priorityA = orderPriority[a.name] || 999;
          const priorityB = orderPriority[b.name] || 999;

          if (priorityA === priorityB) {
            return a.name.localeCompare(b.name);
          }

          return priorityA - priorityB;
        });

        setTransactionTypes(sortedTypes);

        // Ensure activeTab is valid
        if (sortedTypes.length > 0 && activeTab) {
          const isValid = sortedTypes.some(t => t.name === activeTab);
          if (!isValid) {
            const dineIn = sortedTypes.find(t => t.name === 'Dine In');
            setActiveTab(dineIn ? dineIn.name : sortedTypes[0].name);
          }
        }

      } catch (error) {
        console.error("❌ Failed to load transaction types:", error);
      } finally {
        setLoadingTransactionTypes(false);
      }
    };

    fetchTransactionTypes();
  }, []);

  const updateDescription = (itemId, description) => {
    setSelectedItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, description } : item
      )
    );
  };

  useEffect(() => {
    if (cartRef.current) {
      cartRef.current.scrollTop = cartRef.current.scrollHeight;
    }
  }, [selectedItems]);

  const handleCustomerDetailsSubmit = (details) => {
    console.log('👤 Customer details saved:', details);
    setCustomerDetails(details);
    setShowCustomerDetailsModal(false);
    showToast(`Customer details saved: ${details.name}`, 'success');
  };

  const handleClearCustomerDetails = () => {
    setCustomerDetails(null);
    showToast('Customer details cleared', 'info');
  };

  const handlePayBill = () => {
    if (!selectedItems || selectedItems.length === 0) {
      showToast('Please add items to cart first', 'error');
      return;
    }

    setShowPaymentModal(true);
  };

  const handleHoldClick = () => {
    setShowHoldOrdersModal(true);
  };

  const handleSelectHoldOrder = (orderDetails) => {
    console.log("📥 Restoring hold order:", orderDetails);

    const orderItems = orderDetails.orderItems || orderDetails.items || orderDetails.orderItemsDetails || [];

    if (!Array.isArray(orderItems) || orderItems.length === 0) {
      showToast('This order has no items to restore', 'error');
      return;
    }

    const restoredItems = orderItems.map((item, index) => ({
      id: `${item.itemId || item.id}_${item.variantId || 0}_${Date.now()}_${index}`,
      itemId: item.itemId || item.id,
      name: item.itemname || item.name || item.itemName || 'Unknown Item',
      price: parseFloat(item.itemPrice || item.price || 0),
      quantity: parseFloat(item.itemQty || item.quantity || 1),
      description: item.addDetails || item.description || '',
      variantId: item.variantId || 0,
      variantName: item.variantName || '',
      discount: parseFloat(item.itemDisc || item.discount || 0),
      discType: item.discType || 'None',
      modifierItem: item.modifierItem || item.ModifierItem || 0,
      // ✅ CRITICAL FIX: Preserve tax data from HoldOrdersModal enrichment
      TaxItems: item.TaxItems || [],
      TransactionItems: item.TransactionItems || [],
      SectionItemRates: item.SectionItemRates || [],
      isVoided: false,
      voidReason: '',
      isComplimentary: false,
      complimentaryReason: ''
    }));

    setSelectedItems(restoredItems);

    if (orderDetails.orderId) {
      setExistingOrderId(orderDetails.orderId);
    }

    if (orderDetails.pax || orderDetails.PAX) {
      setNumPersons(orderDetails.pax || orderDetails.PAX);
    }

    if (orderDetails.sectionTable || orderDetails.tableId) {
      const tableData = {
        tableId: orderDetails.sectionTable || orderDetails.tableId || 0,
        name: orderDetails.tableName || orderDetails.table || '',
        Section_name: orderDetails.sectionName || orderDetails.section || ''
      };
      setSelectedTable(tableData);
    }

    const transactionType = orderDetails.transactionType;
    if (transactionType === 1 || transactionType === 'Dine In') {
      setActiveTab('Dine In');
    } else if (transactionType === 2 || transactionType === 'Take Away' || transactionType === 'TakeAway') {
      setActiveTab('Take Away');
    } else if (transactionType === 3 || transactionType === 'Home Delivery') {
      setActiveTab('Home Delivery');
    }

    const itemKeys = restoredItems.map(item =>
      `${item.id}_${item.variantId || 0}_${item.description || ''}`.toLowerCase()
    );
    setSentItems(itemKeys);

    showToast(`Order #${orderDetails.orderId || 'N/A'} restored with ${restoredItems.length} item(s)`, 'success');
  };

  const getPureItemId = (item) => {
    const rawId = item.id || item.itemId;

    if (typeof rawId === 'number') return rawId;

    if (typeof rawId === 'string') {
      const numericPart = rawId.split('_')[0];
      return Number(numericPart);
    }

    return 0;
  };

  const handleItemClick = (item) => {
    const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
    const isAlreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);

    if (isAlreadySent && !item.isVoided && !item.isComplimentary) {
      setSelectedItemForModification(item);
      setShowItemModificationModal(true);
    } else if (!item.isVoided && !item.isComplimentary) {
      setEditingItemId(item.id);
    }
  };

  const { executeWithPermission } = usePermission();

  const handleVoidItem = (item, voidReason, voidQuantity) => {
    // Check if this is the last active item
    const activeItems = selectedItems.filter(i => !i.isVoided);
    const isLastItem = activeItems.length === 1 && activeItems[0].id === item.id;
    const isFullVoid = voidQuantity >= item.quantity;

    if (isLastItem && isFullVoid) {
      showToast("Cannot void the last item. Please use 'Order Cancel' to remove the entire order.", 'error');
      return;
    }

    executeWithPermission(PERMISSIONS.ITEM_VOID, 'Item Void', () => {
      console.log('🚫 Voiding item:', item.name, 'Quantity:', voidQuantity, 'Reason:', voidReason);

      const currentQuantity = item.quantity;

      if (voidQuantity >= currentQuantity) {
        // Void the entire item
        setSelectedItems(prevItems =>
          prevItems.map(cartItem =>
            cartItem.id === item.id
              ? { ...cartItem, isVoided: true, voidReason: voidReason }
              : cartItem
          )
        );

        setVoidedItems(prevVoided => [...prevVoided, {
          ...item,
          quantity: currentQuantity,
          voidReason: voidReason,
          voidedAt: new Date().toISOString()
        }]);
      } else {
        // Partial void - reduce quantity and create a voided entry
        setSelectedItems(prevItems =>
          prevItems.map(cartItem =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: currentQuantity - voidQuantity }
              : cartItem
          )
        );

        setVoidedItems(prevVoided => [...prevVoided, {
          ...item,
          quantity: voidQuantity,
          voidReason: voidReason,
          voidedAt: new Date().toISOString()
        }]);

        showToast(`${voidQuantity} of ${currentQuantity} ${item.name} voided`, 'success');
      }

      setShowItemModificationModal(false);
      setSelectedItemForModification(null);
    });
  };

  const handleComplimentaryItem = (item, complimentaryReason, complimentaryQuantity) => {
    executeWithPermission(PERMISSIONS.ITEM_COMPLIMENTARY, 'Item Complimentary', () => {
      console.log('🎁 Marking item as complimentary:', item.name, 'Quantity:', complimentaryQuantity, 'Reason:', complimentaryReason);

      const currentQuantity = item.quantity;

      if (complimentaryQuantity >= currentQuantity) {
        // Mark the entire item as complimentary
        setSelectedItems(prevItems =>
          prevItems.map(cartItem =>
            cartItem.id === item.id
              ? { ...cartItem, isComplimentary: true, complimentaryReason: complimentaryReason }
              : cartItem
          )
        );

        setComplimentaryItems(prevComplimentary => [...prevComplimentary, {
          ...item,
          quantity: currentQuantity,
          complimentaryReason: complimentaryReason,
          complimentaryAt: new Date().toISOString()
        }]);
      } else {
        // Partial complimentary - reduce quantity and create a complimentary entry
        setSelectedItems(prevItems =>
          prevItems.map(cartItem =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: currentQuantity - complimentaryQuantity }
              : cartItem
          )
        );

        setComplimentaryItems(prevComplimentary => [...prevComplimentary, {
          ...item,
          quantity: complimentaryQuantity,
          complimentaryReason: complimentaryReason,
          complimentaryAt: new Date().toISOString()
        }]);

        showToast(`${complimentaryQuantity} of ${currentQuantity} ${item.name} marked as complimentary`, 'success');
      }

      setShowItemComplimentaryModal(false);
      setSelectedItemForComplimentary(null);
    });
  };


  const ensureOrderExists = async () => {
    if (existingOrderId && existingOrderId !== 0) {
      console.log('✅ Order already exists:', existingOrderId);
      return existingOrderId;
    }

    console.log('📝 No order ID found, creating new order...');

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const posId = JSON.parse(localStorage.getItem("posId"));

      let transactionTypeId = 1;
      if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
        transactionTypeId = 2;
      } else if (activeTab === 'Home Delivery') {
        transactionTypeId = 3;
      }

      const tableId = selectedTable?.tableId || 0;
      const orderDate = salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString();

      const orderItemsDetails = [];

      selectedItems
        .filter(item => !item.isVoided)
        .forEach((item) => {
          const itemId = getPureItemId(item);

          orderItemsDetails.push({
            itemId: itemId,
            itemPrice: item.price,
            itemQty: item.quantity,
            itemDisc: item.discount || 0,
            discType: item.discType || "None",
            itemname: item.name,
            ModifierItem: item.modifierItem || 0,
            addDetails: item.description && item.description.trim() ? item.description.trim() : "",
            variantId: item.variantId || 0,
            variantName: item.variantName || "",
            openItemid: 0,
            is_complimentary: item.isComplimentary || false,
            subcategoryId: item.subcategoryId || 0
          });

          if (item.description && item.description.trim()) {
            orderItemsDetails.push({
              itemId: 0,
              itemPrice: 0,
              itemQty: 0,
              itemDisc: 0,
              discType: "",
              itemname: `[${item.description.trim()}]`,
              ModifierItem: String(itemId),
              addDetails: "",
              variantId: 0,
              variantName: "",
              openItemid: 0,
              is_complimentary: false,
              subcategoryId: 0
            });
          }
        });

      const orderPayload = {
        SaveOrderRequest: {
          orderDetails: {
            orderText: activeTab === 'Dine In' && selectedTable
              ? `Table ${selectedTable.Section_name} ${selectedTable.name}`
              : `${activeTab} Order`,
            orderId: 0,
            orderDate: orderDate,
            customerId: customerDetails ? 1 : 0,
            transactionType: transactionTypeId,
            sectionTable: Number(tableId) || 0,
            PAX: Number(numPersons) || 1,
            chairNo: 0,
            outletId: 1,
            kotNo: kotCode,
            kotBy: user?.id || 0,
            posId: posId || 1,
            discAmt: Number(discount) || 0,
            orderItemsDetails: orderItemsDetails
          },
          orderstatus: 1
        }
      };

      console.log("📤 Creating order:", orderPayload);

      const response = await saveOrder(orderPayload);
      console.log("📥 Save Order Response:", response);

      let newOrderId = null;

      if (response?.orderId) {
        newOrderId = response.orderId;
      } else if (response?.OrderId) {
        newOrderId = response.OrderId;
      } else if (response?.data?.orderId) {
        newOrderId = response.data.orderId;
      } else if (response?.data?.OrderId) {
        newOrderId = response.data.OrderId;
      } else if (response?.SaveOrderResponse?.orderId) {
        newOrderId = response.SaveOrderResponse.orderId;
      } else if (response?.SaveOrderResponse?.OrderId) {
        newOrderId = response.SaveOrderResponse.OrderId;
      }

      console.log("🔍 Extracted Order ID:", newOrderId);

      if (!newOrderId || newOrderId === 0) {
        console.error("❌ Full API Response:", JSON.stringify(response, null, 2));
        throw new Error("Failed to create order - no order ID returned from API");
      }

      console.log("✅ Order created successfully, Order ID:", newOrderId);

      if (setExistingOrderId) {
        setExistingOrderId(newOrderId);
      }

      return newOrderId;

    } catch (error) {
      console.error("❌ Failed to create order:", error);

      if (error.response) {
        console.error("❌ API Response Error:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }

      let errorMessage = 'Order creation failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      throw new Error(errorMessage);
    }
  };

  // Helper function to save or update order with new items and voids
  const saveOrUpdateOrder = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const posId = JSON.parse(localStorage.getItem("posId"));

    let transactionTypeId = 1;
    if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
      transactionTypeId = 2;
    } else if (activeTab === 'Home Delivery') {
      transactionTypeId = 3;
    }

    const tableId = selectedTable?.tableId || 0;
    const actualOrderId = existingOrderId || 0;
    const orderDate = salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString();

    console.log("💾 saveOrUpdateOrder - OrderId:", actualOrderId);

    // Handle void items if any
    if (voidedItems.length > 0 && actualOrderId !== 0) {
      console.log('🚫 Processing', voidedItems.length, 'voided items');

      const voidPayload = {
        token: {
          date_of_token: orderDate,
          outlet_id: 1,
          counter_id: posId || 1,
          order_id: actualOrderId
        },
        items: voidedItems.map((item) => ({
          token_id: 0,
          item_id: getPureItemId(item),
          quantity: item.quantity
        }))
      };

      try {
        await saveItemVoid(voidPayload);
        console.log("✅ Void API Success");
      } catch (error) {
        console.error("❌ Void API Error:", error);
        throw new Error(`Failed to void items: ${error.message || 'Unknown error'}`);
      }
    }

    // Identify new items that haven't been sent yet
    const newItems = selectedItems.filter(item => {
      if (item.isVoided) return false;

      const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
      const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);

      return !alreadySent;
    });

    console.log("📊 New items to save:", newItems.length);

    // Only save if there are changes or it's a new order
    const shouldSave = newItems.length > 0 || voidedItems.length > 0 || actualOrderId === 0;

    if (!shouldSave) {
      console.log("✅ No changes to save");
      return actualOrderId;
    }

    // Build order items details
    const orderItemsDetails = [];

    // Add voided items with negative quantity
    if (voidedItems.length > 0) {
      voidedItems.forEach((item) => {
        const itemId = getPureItemId(item);

        orderItemsDetails.push({
          itemId: itemId,
          itemPrice: item.price,
          itemQty: -item.quantity,
          itemDisc: item.discount || 0,
          discType: item.discType || "None",
          itemname: item.name,
          ModifierItem: item.modifierItem || 0,
          addDetails: item.description && item.description.trim() ? item.description.trim() : "",
          variantId: item.variantId || 0,
          variantName: item.variantName || "",
          openItemid: 0,
          is_complimentary: item.isComplimentary || false,
          subcategoryId: item.subcategoryId || 0
        });

        if (item.description && item.description.trim()) {
          orderItemsDetails.push({
            itemId: 0,
            itemPrice: 0,
            itemQty: 0,
            itemDisc: 0,
            discType: "",
            itemname: `[${item.description.trim()}]`,
            ModifierItem: String(itemId),
            addDetails: "",
            variantId: 0,
            variantName: "",
            openItemid: 0,
            is_complimentary: false,
            subcategoryId: 0
          });
        }
      });
    }

    // Add new items
    newItems.forEach((item) => {
      const itemId = getPureItemId(item);

      orderItemsDetails.push({
        itemId: itemId,
        itemPrice: item.price,
        itemQty: item.quantity,
        itemDisc: item.discount || 0,
        discType: item.discType || "None",
        itemname: item.name,
        ModifierItem: item.modifierItem || 0,
        addDetails: item.description && item.description.trim() ? item.description.trim() : "",
        variantId: item.variantId || 0,
        variantName: item.variantName || "",
        openItemid: 0,
        is_complimentary: item.isComplimentary || false,
        subcategoryId: item.subcategoryId || 0
      });

      if (item.description && item.description.trim()) {
        orderItemsDetails.push({
          itemId: 0,
          itemPrice: 0,
          itemQty: 0,
          itemDisc: 0,
          discType: "",
          itemname: `[${item.description.trim()}]`,
          ModifierItem: String(itemId),
          addDetails: "",
          variantId: 0,
          variantName: "",
          openItemid: 0,
          is_complimentary: false,
          subcategoryId: 0
        });
      }
    });


    const orderPayload = {
      SaveOrderRequest: {
        orderDetails: {
          orderText: activeTab === 'Dine In' && selectedTable
            ? `Table ${selectedTable.Section_name} ${selectedTable.name}`
            : `${activeTab} Order`,
          orderId: actualOrderId,
          orderDate: orderDate,
          customerId: customerDetails ? 1 : 0,
          transactionType: transactionTypeId,
          sectionTable: Number(tableId) || 0,
          PAX: Number(numPersons) || 1,
          chairNo: 0,
          outletId: 1,
          kotNo: kotCode,
          kotBy: user?.id || 0,
          posId: posId || 1,
          discAmt: Number(discount) || 0,
          orderItemsDetails: orderItemsDetails
        },
        orderstatus: 1
      }
    };

    console.log("📤 Saving order updates:", orderPayload);

    try {
      const response = await saveOrder(orderPayload);
      console.log("📥 SaveOrder API Response:", response);

      // Extract order ID from various possible response structures
      let responseOrderId = null;

      if (response?.orderId) {
        responseOrderId = response.orderId;
      } else if (response?.OrderId) {
        responseOrderId = response.OrderId;
      } else if (response?.data?.orderId) {
        responseOrderId = response.data.orderId;
      } else if (response?.data?.OrderId) {
        responseOrderId = response.data.OrderId;
      } else if (response?.SaveOrderResponse?.orderId) {
        responseOrderId = response.SaveOrderResponse.orderId;
      } else if (response?.SaveOrderResponse?.OrderId) {
        responseOrderId = response.SaveOrderResponse.OrderId;
      }

      console.log("🔍 Extracted Order ID:", responseOrderId);

      if (!responseOrderId || responseOrderId === 0) {
        console.error("❌ Full API Response:", JSON.stringify(response, null, 2));
        throw new Error("Failed to save order - no order ID returned from API");
      }

      // Update existing order ID if this was a new order
      if (actualOrderId === 0) {
        setExistingOrderId(responseOrderId);
        console.log("✅ New order created, Order ID:", responseOrderId);
      }

      // Mark new items as sent
      if (newItems.length > 0) {
        const newItemKeys = newItems.map(item =>
          `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase()
        );
        setSentItems(prevSent => [...prevSent, ...newItemKeys]);
      }


      // Clear voided items
      if (voidedItems.length > 0) {
        setSelectedItems(prevItems => prevItems.filter(item => !item.isVoided));
        setVoidedItems([]);
      }

      console.log("✅ Order saved/updated successfully, Order ID:", responseOrderId);
      return responseOrderId;

    } catch (error) {
      console.error("❌ SaveOrder Error:", error);

      // Enhanced error logging
      if (error.response) {
        console.error("❌ API Response Error:", {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }

      throw new Error(`Failed to save order: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCheck = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      showToast('Please add items before printing check', 'error');
      return;
    }

    // Prevent double submission
    if (isCheckProcessing) {
      console.log('⏳ Check is already processing, ignoring duplicate click');
      return;
    }

    try {
      setIsCheckProcessing(true); // Disable button

      // ✅ Save or update order with any new items or voids before printing
      const orderId = await saveOrUpdateOrder();
      const user = JSON.parse(localStorage.getItem("user"));

      const checkPrintPayload = {
        CheckPrintRequest: {
          OrderId: orderId,
          staffId: user?.id || 12,
          printType: 0
        }
      };

      console.log("🖨️ Printing check:", checkPrintPayload);
      await printCheck(checkPrintPayload);

      showToast(`Check printed! Bill: ${billNo}, Order: ${orderId}, Total: ₹${total.toFixed(2)}`, 'success');

      setTimeout(() => {
        setSelectedItems([]);
        setSentItems([]);
        setVoidedItems([]);
        setExistingOrderId(null);
        setSelectedTable(null);
        setNumPersons(null);
        setCustomerDetails(null);

        const takeAwayTab = transactionTypes.find(t =>
          t.name === 'Take Away' || t.name === 'TakeAway'
        );
        if (takeAwayTab) {
          setActiveTab(takeAwayTab.name);
        }

        navigate(getKotRedirectUrl(), { replace: true });
      }, 1500);

    } catch (error) {
      console.error("❌ Error printing check:", error);
      showToast(`Failed to print check: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsCheckProcessing(false); // Re-enable button
    }
  };

  const handleKOT = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      showToast('Please add items before sending KOT', 'error');
      return;
    }

    // Prevent double submission
    if (isKOTProcessing) {
      console.log('⏳ KOT is already processing, ignoring duplicate click');
      return;
    }

    try {
      setIsKOTProcessing(true); // Disable button

      const user = JSON.parse(localStorage.getItem("user"));
      const posId = JSON.parse(localStorage.getItem("posId"));

      let transactionTypeId = 1;
      if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
        transactionTypeId = 2;
      } else if (activeTab === 'Home Delivery') {
        transactionTypeId = 3;
      }

      const tableId = selectedTable?.tableId || 0;
      const actualOrderId = existingOrderId || 0;

      const isNewOrder = (actualOrderId === 0);

      const orderDate = salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString();
      console.log("📅 Using order date:", orderDate);
      console.log("🆕 Is New Order:", isNewOrder, "OrderId:", actualOrderId);

      let voidApiCalled = false;
      let saveOrderApiCalled = false;
      let voidedCount = 0;
      let newItemsCount = 0;
      let complimentaryApiCalled = false;
      let complimentaryCount = 0;

      if (voidedItems.length > 0 && actualOrderId !== 0) {
        console.log('🚫 Voiding', voidedItems.length, 'items');

        const voidPayload = {
          token: {
            date_of_token: orderDate,
            outlet_id: 1,
            counter_id: posId || 1,
            order_id: actualOrderId
          },
          items: voidedItems.map((item) => ({
            token_id: 0,
            item_id: getPureItemId(item),
            quantity: item.quantity
          }))
        };

        try {
          const voidResponse = await saveItemVoid(voidPayload);
          voidApiCalled = true;
          voidedCount = voidedItems.length;
          console.log("✅ Void API Success:", voidResponse);
        } catch (error) {
          console.error("❌ Void API Error:", error);
          showToast(`Failed to void items: ${error.message || 'Unknown error'}`, 'error');
          return;
        }
      }

      // Handle complimentary items
      if (complimentaryItems.length > 0 && actualOrderId !== 0) {
        console.log('🎁 Marking', complimentaryItems.length, 'items as complimentary');

        const complimentaryPayload = {
          order_id: actualOrderId,
          items: complimentaryItems.map((item) => ({
            item_id: getPureItemId(item),
            variant_id: item.variantId || 0,
            quantity: item.quantity,
            reason: item.complimentaryReason || 'Complimentary'
          })),
          user_id: user?.id || 0
        };

        try {
          const complimentaryResponse = await markComplimentary(complimentaryPayload);
          complimentaryApiCalled = true;
          complimentaryCount = complimentaryItems.length;
          console.log("✅ Complimentary API Success:", complimentaryResponse);
        } catch (error) {
          console.error("❌ Complimentary API Error:", error);
          showToast(`Failed to mark items as complimentary: ${error.message || 'Unknown error'}`, 'error');
          return;
        }
      }

      const newItems = selectedItems.filter(item => {
        if (item.isVoided || item.isComplimentary) return false;

        const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
        const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);

        return !alreadySent;
      });

      if (newItems.length > 0) {
        newItemsCount = newItems.length;
      }

      const shouldCallSaveOrder = (
        newItems.length > 0 ||
        voidApiCalled ||
        actualOrderId === 0
      );

      let finalOrderId = actualOrderId;

      if (shouldCallSaveOrder) {
        const orderItemsDetails = [];

        if (voidApiCalled && voidedItems.length > 0) {
          voidedItems.forEach((item) => {
            const itemId = getPureItemId(item);

            orderItemsDetails.push({
              itemId: itemId,
              itemPrice: item.price,
              itemQty: -item.quantity,
              itemDisc: item.discount || 0,
              discType: item.discType || "None",
              itemname: item.name,
              ModifierItem: item.modifierItem || 0,
              addDetails: item.description && item.description.trim() ? item.description.trim() : "",
              variantId: item.variantId || 0,
              variantName: item.variantName || "",
              openItemid: 0,
              is_complimentary: item.isComplimentary || false,
              subcategoryId: item.subcategoryId || 0
            });

            if (item.description && item.description.trim()) {
              orderItemsDetails.push({
                itemId: 0,
                itemPrice: 0,
                itemQty: 0,
                itemDisc: 0,
                discType: "",
                itemname: `[${item.description.trim()}]`,
                ModifierItem: String(itemId),
                addDetails: "",
                variantId: 0,
                variantName: "",
                openItemid: 0,
                is_complimentary: false,
                subcategoryId: 0
              });
            }
          });
        }

        newItems.forEach((item) => {
          const itemId = getPureItemId(item);

          orderItemsDetails.push({
            itemId: itemId,
            itemPrice: item.price,
            itemQty: item.quantity,
            itemDisc: item.discount || 0,
            discType: item.discType || "None",
            itemname: item.name,
            ModifierItem: item.modifierItem || 0,
            addDetails: item.description && item.description.trim() ? item.description.trim() : "",
            variantId: item.variantId || 0,
            variantName: item.variantName || "",
            openItemid: 0,
            is_complimentary: item.isComplimentary || false,
            subcategoryId: item.subcategoryId || 0
          });

          if (item.description && item.description.trim()) {
            orderItemsDetails.push({
              itemId: 0,
              itemPrice: 0,
              itemQty: 0,
              itemDisc: 0,
              discType: "",
              itemname: `[${item.description.trim()}]`,
              ModifierItem: String(itemId),
              addDetails: "",
              variantId: 0,
              variantName: "",
              openItemid: 0,
              is_complimentary: false,
              subcategoryId: 0
            });
          }
        });


        const orderPayload = {
          SaveOrderRequest: {
            orderDetails: {
              orderText: activeTab === 'Dine In' && selectedTable
                ? `Table ${selectedTable.Section_name} ${selectedTable.name}`
                : `${activeTab} Order`,
              orderId: actualOrderId,
              orderDate: orderDate,
              customerId: customerDetails ? 1 : 0,
              transactionType: transactionTypeId,
              sectionTable: Number(tableId) || 0,
              PAX: Number(numPersons) || 1,
              chairNo: 0,
              outletId: 1,
              kotNo: kotCode,
              kotBy: user?.id || 0,
              posId: posId || 1,
              discAmt: Number(discount) || 0,
              orderItemsDetails: orderItemsDetails
            },
            orderstatus: 1
          }
        };

        console.log("📤 Sending order:", orderPayload);

        try {
          const res = await saveOrder(orderPayload);
          saveOrderApiCalled = true;
          const responseOrderId = res?.orderId || res?.OrderId || res?.data?.orderId || actualOrderId;

          if (responseOrderId && responseOrderId !== 0) {
            finalOrderId = responseOrderId;
            if (actualOrderId === 0) {
              setExistingOrderId(responseOrderId);
            }
          }

          if (newItems.length > 0) {
            const newItemKeys = newItems.map(item =>
              `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase()
            );
            setSentItems(prevSent => [...prevSent, ...newItemKeys]);
          }

        } catch (error) {
          console.error("❌ SaveOrder Error:", error);
          showToast(`Failed to save order: ${error.message || 'Unknown error'}`, 'error');
          return;
        }
      }

      if (voidApiCalled || complimentaryApiCalled || saveOrderApiCalled) {
        if (voidedItems.length > 0) {
          setSelectedItems(prevItems =>
            prevItems.filter(item => !item.isVoided)
          );
          setVoidedItems([]);
        }

        if (complimentaryItems.length > 0) {
          setSelectedItems(prevItems =>
            prevItems.filter(item => !item.isComplimentary)
          );
          setComplimentaryItems([]);
        }

        // Improved toast messages
        const messages = [];
        if (voidedCount > 0) messages.push(`${voidedCount} item(s) voided`);
        if (complimentaryCount > 0) messages.push(`${complimentaryCount} item(s) marked complimentary`);
        if (newItemsCount > 0) messages.push(`${newItemsCount} item(s) added`);

        if (messages.length > 0) {
          const action = isNewOrder ? 'Order Created!' : 'Order Updated!';
          showToast(`${action} ${messages.join(', ')}`, 'success');
        }

        setTimeout(() => {
          setSelectedItems([]);
          setSentItems([]);
          setExistingOrderId(null);
          setSelectedTable(null);
          setNumPersons(null);
          setCustomerDetails(null);

          const takeAwayTab = transactionTypes.find(t =>
            t.name === 'Take Away' || t.name === 'TakeAway'
          );
          if (takeAwayTab) {
            setActiveTab(takeAwayTab.name);
          }

          navigate(getKotRedirectUrl(), { replace: true });
        }, 1500);
      } else {
        showToast('No changes to process', 'info');
      }

    } catch (error) {
      console.error("❌ KOT Error:", error);
      showToast(`Failed to process KOT: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsKOTProcessing(false); // Re-enable button
    }
  };

  const items = Array.isArray(selectedItems) ? selectedItems : [];
  const hasItems = items.length > 0;

  return (
    <>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {toast.type === 'info' && (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="w-96 h-full flex flex-col border-l bg-white">
        <div className="bg-gray-100 p-2 border-b">
          {loadingTransactionTypes ? (
            <div className="flex justify-center items-center h-10 text-xs text-gray-500">
              Loading...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-1 mb-2">
                {transactionTypes.map((tab) => (
                  <button
                    key={tab.id}
                    className={`w-full py-1.5 text-[11px] font-medium rounded ${activeTab === tab.name
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                      }`}
                    onClick={() => {
                      console.log('🔄 Switching to tab:', tab.name, 'from:', activeTab);

                      if (activeTab === 'Dine In' && tab.name !== 'Dine In') {
                        console.log('🧹 Clearing Dine In order data...');
                        setSelectedItems([]);
                        setSentItems([]);
                        setVoidedItems([]);
                        setExistingOrderId(null);
                        setSelectedTable(null);
                        setNumPersons(null);
                        setCustomerDetails(null);
                      }

                      if (tab.name === 'Dine In' && activeTab !== 'Dine In') {
                        console.log('🏠 Switching to Dine In - navigating to billing');
                        navigate('/tables');
                        return;
                      }

                      if (tab.name !== 'Dine In') {
                        setSelectedTable(null);
                        setNumPersons(null);
                      }

                      setActiveTab(tab.name);
                    }}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {activeTab === 'Dine In' && selectedTable && numPersons !== null && (
                <div className="bg-white border rounded p-1.5 text-[10px] text-gray-700 mb-2">
                  <div className="flex justify-between items-center">
                    <span>
                      <strong>Dine In</strong> | {selectedTable.Section_name} / {selectedTable.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span><strong>PAX:</strong> {numPersons}</span>
                      <button
                        onClick={() => setShowCustomerDetailsModal(true)}
                        className={`p-1 rounded hover:bg-gray-100 ${customerDetails ? 'text-green-600' : 'text-gray-500'
                          }`}
                        title={customerDetails ? `Customer: ${customerDetails.name}` : 'Add customer details'}
                      >
                        <User className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {customerDetails && (
                    <div className="flex justify-between items-center mt-1 text-[9px] text-green-600">
                      <span>👤 {customerDetails.name} ({customerDetails.mobile})</span>
                      <button
                        onClick={handleClearCustomerDetails}
                        className="text-red-500 hover:text-red-700 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              )}

              {transactionTypes.map(type => {
                if (activeTab === type.name && type.name !== 'Dine In') {
                  return (
                    <div key={type.id} className="bg-white border rounded p-1.5 text-[10px] text-gray-700 mb-2">
                      <div className="flex justify-between items-center">
                        <strong>{type.name}</strong>
                        <button
                          onClick={() => setShowCustomerDetailsModal(true)}
                          className={`p-1 rounded hover:bg-gray-100 ${customerDetails ? 'text-green-600' : 'text-gray-500'
                            }`}
                          title={customerDetails ? `Customer: ${customerDetails.name}` : 'Add customer details'}
                        >
                          <User className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {customerDetails && (
                        <div className="flex justify-between items-center mt-1 text-[9px] text-green-600">
                          <span>👤 {customerDetails.name} ({customerDetails.mobile})</span>
                          <button
                            onClick={handleClearCustomerDetails}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })}

              <div className="grid grid-cols-4 gap-2 text-[10px] text-gray-600 font-medium px-1">
                <div className="flex items-center space-x-1 col-span-2">
                  <span>📋</span>
                  <span>ITEMS</span>
                </div>
                <div className="text-center">QTY</div>
                <div className="text-right">PRICE</div>
              </div>
            </>
          )}
        </div>

        <div ref={cartRef} className="flex-1 overflow-y-auto p-2">
          {!hasItems ? (
            <div className="text-center text-gray-500 mt-16">
              <div className="mb-3 flex justify-center">
                <svg
                  className="w-32 h-32"
                  viewBox="0 0 120 120"
                  fill="none"
                >
                  <g opacity="0.3">
                    <rect x="28" y="25" width="3" height="15" fill="#4B5563" rx="1" />
                    <rect x="34" y="25" width="3" height="15" fill="#4B5563" rx="1" />
                    <rect x="40" y="25" width="3" height="15" fill="#4B5563" rx="1" />
                    <rect x="31" y="38" width="9" height="40" fill="#4B5563" rx="1.5" />
                  </g>
                  <ellipse cx="60" cy="60" rx="28" ry="28" fill="#E5E7EB" />
                  <ellipse cx="60" cy="60" rx="22" ry="22" fill="white" />
                  <ellipse cx="60" cy="60" rx="18" ry="18" fill="#F3F4F6" />
                  <g opacity="0.5">
                    <rect x="82" y="25" width="6" height="20" fill="#374151" rx="1" />
                    <rect x="84" y="43" width="2" height="35" fill="#4B5563" rx="1" />
                  </g>
                </svg>
              </div>
              <div className="text-sm font-medium">No Item Selected</div>
              <div className="text-xs mt-1">Select items from menu</div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item, index) => {
                const itemId = item.id || item.itemId || index;
                const itemName = item.name || 'Unknown Item';
                const itemPrice = item.price || 0;
                const itemQuantity = item.quantity || 1;
                const itemDescription = item.description || '';
                const variantName = item.variantName || '';
                const isVoided = item.isVoided || false;
                const isComplimentary = item.isComplimentary || false;

                const itemKey = `${itemId}_${item.variantId || 0}_${itemDescription}`.toLowerCase();
                const isAlreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);

                return (
                  <div
                    key={itemId}
                    className={`grid grid-cols-4 gap-2 items-start py-1.5 border-b hover:bg-gray-50 text-xs ${isVoided ? 'opacity-50 bg-red-50' : isComplimentary ? 'bg-green-50' : ''
                      } ${isAlreadySent && !isVoided && !isComplimentary ? 'cursor-pointer' : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="col-span-2">
                      <div className="text-xs font-medium truncate" title={itemName}>
                        {itemName}
                        {isVoided && <span className="ml-1 text-red-600 text-[10px]">(VOID)</span>}
                        {isComplimentary && <span className="ml-1 text-green-600 text-[10px]">(COMPLIMENTARY)</span>}
                      </div>

                      {variantName && (
                        <div className="text-[10px] text-blue-600 font-medium mt-0.5 truncate" title={variantName}>
                          ({variantName})
                        </div>
                      )}

                      {isVoided && item.voidReason && (
                        <div className="text-[10px] text-red-600 mt-0.5 truncate" title={item.voidReason}>
                          Reason: {item.voidReason}
                        </div>
                      )}


                      {editingItemId === itemId && !isVoided && !isAlreadySent ? (
                        <input
                          type="text"
                          value={itemDescription}
                          onChange={(e) => updateDescription(itemId, e.target.value)}
                          onBlur={() => setEditingItemId(null)}
                          placeholder="Add notes"
                          className="text-[10px] text-gray-700 mt-0.5 w-full border rounded px-1 py-0.5"
                          autoFocus
                        />
                      ) : (
                        itemDescription && (
                          <div className="text-[10px] text-gray-500 mt-0.5 truncate" title={itemDescription}>
                            {itemDescription}
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center justify-center space-x-1">
                      {!isVoided && !isAlreadySent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(itemId, itemQuantity - 1);
                          }}
                          className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                      )}
                      <span className="text-xs w-6 text-center">{itemQuantity}</span>
                      {!isVoided && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isAlreadySent) {
                              // If sent, add as new item (or increment existing unsent)
                              addToCart({ ...item, quantity: 1 });
                            } else {
                              // If not sent, just increment quantity
                              updateQuantity(itemId, itemQuantity + 1);
                            }
                          }}
                          className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-200"
                          title={isAlreadySent ? "Add Another" : "Increase Quantity"}

                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-end space-x-1">
                      <span className={`text-xs ${isVoided ? 'line-through text-gray-400' : ''}`}>
                        ₹{(itemPrice * itemQuantity).toFixed(2)}
                      </span>
                      {!isVoided && !isAlreadySent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(itemId);
                          }}
                          className="w-5 h-5 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-200"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gray-800 text-white">
          <div className="p-2 border-b border-gray-700">
            <div className="flex justify-between items-center text-xs">
              <span>Total Qty: {totalQuantity}</span>
              <span className="font-bold">Total: ₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-0">
            <button
              onClick={handleCheck}
              disabled={isCheckProcessing}
              className={`py-2.5 text-[11px] font-medium transition-colors ${isCheckProcessing
                ? 'bg-blue-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
              {isCheckProcessing ? 'Processing...' : 'Check'}
            </button>
            <button
              onClick={handleHoldClick}
              className="bg-blue-600 text-white py-2.5 text-[11px] font-medium hover:bg-blue-700"
            >
              Hold
            </button>
            <button
              onClick={handleKOT}
              disabled={isKOTProcessing}
              className={`py-2.5 text-[11px] font-medium transition-colors ${isKOTProcessing
                ? 'bg-green-400 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
              {isKOTProcessing ? 'Processing...' : 'KOT'}
            </button>
            <button
              onClick={handlePayBill}
              className="bg-blue-600 text-white py-2.5 text-[11px] font-medium hover:bg-blue-700"
            >
              Pay Bill
            </button>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={total}
        selectedItems={selectedItems.filter(item => !item.isVoided)}
        selectedTable={selectedTable}
        billNumber={billNo}
        kotNumber={kotCode}
        existingOrderId={existingOrderId}
        setExistingOrderId={setExistingOrderId}
        activeTab={activeTab}
        salesDateISO={salesDateISO}
        discount={discount}
        setDiscount={setDiscount}
        customerDetails={customerDetails}
        numPersons={numPersons}
        sentItems={sentItems}
        setSentItems={setSentItems}
        voidedItems={voidedItems}
        setVoidedItems={setVoidedItems}
        onPaymentComplete={() => {
          setSelectedItems([]);
          setSentItems([]);
          setVoidedItems([]);
          setSelectedTable(null);
          setNumPersons(null);
          setExistingOrderId(null);
          setDiscount(0);
          setCustomerDetails(null);
          const takeAwayTab = transactionTypes.find(t =>
            t.name === 'Take Away' || t.name === 'TakeAway'
          );
          if (takeAwayTab) {
            setActiveTab(takeAwayTab.name);
          }
          navigate(getKotRedirectUrl());
        }}
      />

      <HoldOrdersModal
        isOpen={showHoldOrdersModal}
        onClose={() => setShowHoldOrdersModal(false)}
        onSelectHoldOrder={handleSelectHoldOrder}
      />

      <ItemModificationModal
        isOpen={showItemModificationModal}
        onClose={() => {
          setShowItemModificationModal(false);
          setSelectedItemForModification(null);
        }}
        item={selectedItemForModification}
        onVoidItem={handleVoidItem}
        onComplimentaryItem={handleComplimentaryItem}
      />

      <CustomerDetailsModal
        isOpen={showCustomerDetailsModal}
        onClose={() => setShowCustomerDetailsModal(false)}
        onSubmit={handleCustomerDetailsSubmit}
        billNumber={billNo}
        totalAmount={total}
        buttonText="Save"
        buttonIcon="💾"
        modalTitle="Customer Details"
      />
    </>
  );
};

export default Cart;