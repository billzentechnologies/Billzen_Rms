import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FaCreditCard, FaMoneyBillWave, FaMobile, FaPercentage, FaEllipsisH } from 'react-icons/fa';
import { saveBill, printCheck, getOrderDetails, cancelOrder, getTaxes, saveOrder, saveItemVoid, getKotRedirectUrl } from '../services/apicall';
import { useNavigate } from 'react-router-dom';
import CustomerDetailsModal from './Customerdetailsmodal';
import DiscountModal from './Discountmodal';
import OrderCancelModal from './Ordercancelmodal';
import MultiPayModal from './Multipaymodal';
import CategoryDiscountModal from './CategoryDiscountModal';
import { PERMISSIONS } from './permissions';
import { usePermission } from '../context/PermissionContext';

const PaymentModal = ({
  isOpen,
  onClose,
  total,
  selectedItems,
  selectedTable,
  billNumber,
  kotNumber,
  onPaymentComplete,
  existingOrderId,
  activeTab,
  salesDateISO,
  customerDetails,
  setExistingOrderId,
  numPersons,
  sentItems = [],
  setSentItems = () => { },
  voidedItems = [],
  setVoidedItems = () => { },
  discount = 0,
  setDiscount = () => { }
}) => {
  const navigate = useNavigate();
  const { executeWithPermission } = usePermission();
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showMultiPayModal, setShowMultiPayModal] = useState(false);
  const [showCategoryDiscountModal, setShowCategoryDiscountModal] = useState(false);

  // Discount state
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [apiOrderDiscAmt, setApiOrderDiscAmt] = useState(0);

  // Multi-pay data
  const [multiPayModes, setMultiPayModes] = useState(null);

  // Category-wise discount state
  const [categoryDiscounts, setCategoryDiscounts] = useState({});

  // Transaction type state
  const [orderTransactionType, setOrderTransactionType] = useState(null);

  // Tax master data
  const [taxMasterData, setTaxMasterData] = useState([]);
  const [taxesLoading, setTaxesLoading] = useState(true);

  // Table details state
  const [tableDetails, setTableDetails] = useState({
    sectionTable: 0,
    chairNo: 0,
    PAX: 0
  });

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null
  });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm,
      onCancel: () => setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null })
    });
  };

  // Payment methods - Wallet and Net Banking removed
  const paymentMethods = [
    { id: 1, name: 'Cash', code: 'Cash', icon: FaMoneyBillWave },
    { id: 2, name: 'Card', code: 'Card', icon: FaCreditCard },
    { id: 3, name: 'UPI', code: 'UPI', icon: FaMobile },
    { id: 4, name: 'Other', code: 'OTHER', icon: FaEllipsisH },
  ];

  const getPureItemId = (item) => {
    const rawId = item.id || item.itemId;

    if (typeof rawId === 'number') return rawId;

    if (typeof rawId === 'string') {
      const numericPart = rawId.split('_')[0];
      return Number(numericPart);
    }

    return 0;
  };

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        setTaxesLoading(true);
        console.log('🔍 Fetching tax master data...');
        const response = await getTaxes();
        console.log('📥 Tax master data received:', response);

        let taxesData = [];
        if (Array.isArray(response)) {
          taxesData = response.filter(tax => tax.isactive === true);
        } else if (response?.taxes && Array.isArray(response.taxes)) {
          taxesData = response.taxes.filter(tax => tax.isactive === true);
        } else if (response?.data && Array.isArray(response.data)) {
          taxesData = response.data.filter(tax => tax.isactive === true);
        }

        const mappedTaxes = taxesData.map(tax => ({
          taxId: tax.taxId,
          taxName: tax.taxName,
          taxPercentage: parseFloat(tax.tax_percent || tax.taxPercentage || 0),
          transactionId: tax.transactionId,
          isActive: tax.isactive || tax.isActive
        }));

        setTaxMasterData(mappedTaxes);
        console.log('✅ Tax master data set:', mappedTaxes);
      } catch (error) {
        console.error('❌ Failed to fetch tax master data:', error);
        setTaxMasterData([
          { taxId: 28, taxName: 'SGST', taxPercentage: 2.5, transactionId: 1, isActive: true },
          { taxId: 29, taxName: 'CGST', taxPercentage: 2.5, transactionId: 1, isActive: true }
        ]);
      } finally {
        setTaxesLoading(false);
      }
    };

    fetchTaxes();
  }, []);

  useEffect(() => {
    // ℹ️ We've removed the getOrderDetails call here because the Cart component 
    // already passes the up-to-date orderId, selectedTable, and numPersons as props.
    // Fetching again here was causing redundant API calls and potential state sync issues.

    if (isOpen) {
      console.log('💳 Payment Modal Opened with Order:', existingOrderId, 'Initial Discount:', discount);
      setTableDetails({
        sectionTable: selectedTable?.tableId || 0,
        chairNo: 450,
        PAX: numPersons || 1
      });
      setOrderTransactionType(null); // Will fallback to activeTab mapping

      // ✅ Sync initial discount from order if no discount is selected yet
      if (discount > 0 && !selectedDiscount) {
        setSelectedDiscount({
          discountId: 0,
          discountName: `Discount ${discount}%`,
          discountPercentage: discount,
          isManual: true
        });
      }
    }
  }, [isOpen, existingOrderId, selectedTable, numPersons, discount]);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!isOpen || !existingOrderId || existingOrderId === 0) return;

      try {
        console.log('🔍 Fetching existing order details:', existingOrderId);
        const data = await getOrderDetails(existingOrderId);

        if (data && data.OrderDetailsResponse) {
          const response = data.OrderDetailsResponse;

          // 1. Capture bill-level discount amount
          if (response.orderDiscAmt) {
            const discAmt = parseFloat(response.orderDiscAmt) || 0;
            console.log('💰 Setting API order discount amount:', discAmt);
            setApiOrderDiscAmt(discAmt);

            // ✅ Calculate effective percentage for highlighting in modal
            const subtotal = response.OrderItemsDetails?.reduce((s, i) => s + (parseFloat(i.itemPrice || 0) * parseFloat(i.itemQty || 0)), 0) || 0;
            const individDisc = response.OrderItemsDetails?.reduce((s, i) => s + (parseFloat(i.discount || i.itemDisc || 0) * parseFloat(i.itemQty || 0)), 0) || 0;
            const netBeforeBillDisc = subtotal - individDisc;

            if (netBeforeBillDisc > 0 && !selectedDiscount) {
              const derivedPercent = Math.round((discAmt / netBeforeBillDisc) * 100);
              console.log('📊 Derived discount percentage:', derivedPercent);

              setSelectedDiscount({
                discountId: 0,
                discountName: `Discount ${derivedPercent}%`,
                discountPercentage: derivedPercent,
                isManual: true
              });
            }
          }

          // 2. Capture category-level discounts
          if (response.categoryDiscounts && Array.isArray(response.categoryDiscounts)) {
            // Priority 1: Use dedicated order-level category discounts
            const catDiscs = {};
            response.categoryDiscounts.forEach(cd => {
              if (cd.categoryId && cd.discountPercentage) {
                catDiscs[cd.categoryId] = cd.discountPercentage;
              }
            });
            if (Object.keys(catDiscs).length > 0) {
              setCategoryDiscounts(catDiscs);
            }
          } else if (response.OrderItemsDetails && Array.isArray(response.OrderItemsDetails)) {
            // Priority 2: Fallback to deriving from items (backward compatibility)
            const catDiscs = {};
            response.OrderItemsDetails.forEach(item => {
              const enrichedItem = selectedItems?.find(si => si.itemId === item.itemId);
              const catId = enrichedItem?.categoryId || item.categoryId || 0;
              const itemDisc = parseFloat(item.discount || item.itemDisc || 0);

              if (catId > 0 && itemDisc > 0) {
                catDiscs[catId] = itemDisc;
              }
            });

            if (Object.keys(catDiscs).length > 0) {
              console.log('🏷️ Deriving category discounts from items:', catDiscs);
              setCategoryDiscounts(catDiscs);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to fetch order details:', error);
      }
    };

    fetchOrderDetails();
  }, [isOpen, existingOrderId]);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      setSelectedPaymentMode('');
      setSelectedDiscount(null);
      setOrderTransactionType(null);
      setTableDetails({ sectionTable: 0, chairNo: 0, PAX: 0 });
      setShowCustomerModal(false);
      setShowDiscountModal(false);
      setShowCancelModal(false);
      setShowMultiPayModal(false);
      setMultiPayModes(null);
      setCategoryDiscounts({});
      setApiOrderDiscAmt(0);
      document.body.style.overflow = 'unset';
      setIsProcessing(false);
    }
    return () => document.body.style.overflow = 'unset';
  }, [isOpen]);

  if (!isOpen) return null;

  const getTaxDetailsById = (taxId) => {
    const tax = taxMasterData.find(t => t.taxId === taxId);
    return tax || null;
  };

  const calculateBillTotals = () => {
    const subTotal = selectedItems.reduce((sum, item) =>
      sum + (item.price * item.quantity), 0
    );

    const individualItemDiscount = selectedItems.reduce((sum, item) => {
      const catId = item.categoryId || item.subcategoryId || 0;
      const catDiscPercent = categoryDiscounts[catId] || 0;

      if (catDiscPercent > 0) {
        // Use category discount for this item
        return sum + (item.price * item.quantity * (catDiscPercent / 100));
      }
      // Use standard item-level discount
      return sum + ((item.discount || 0) * item.quantity);
    }, 0);

    let billLevelDiscount = 0;
    if (selectedDiscount) {
      billLevelDiscount = (subTotal - individualItemDiscount) * (selectedDiscount.discountPercentage / 100);
    } else if (apiOrderDiscAmt > 0) {
      billLevelDiscount = apiOrderDiscAmt;
    }

    const totalItemDiscount = individualItemDiscount + billLevelDiscount;
    const priceAfterDiscount = subTotal - totalItemDiscount;

    let currentTransactionTypeId = orderTransactionType;

    if (currentTransactionTypeId === null) {
      if (activeTab === 'Dine In') {
        currentTransactionTypeId = 1;
      } else if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
        currentTransactionTypeId = 2;
      } else if (activeTab === 'Home Delivery') {
        currentTransactionTypeId = 3;
      } else {
        currentTransactionTypeId = 1;
      }
    }

    const taxBreakdown = {};
    let totalTaxAmount = 0;

    selectedItems.forEach((item, itemIndex) => {
      if (item.isVoided) return;

      const itemBasePrice = item.price * item.quantity;
      const catId = item.categoryId || item.subcategoryId || 0;
      const catDiscPercent = categoryDiscounts[catId] || 0;

      const itemIndividualDiscount = catDiscPercent > 0
        ? (itemBasePrice * catDiscPercent / 100)
        : ((item.discount || 0) * item.quantity);

      const itemPriceAfterIndividualDiscount = itemBasePrice - itemIndividualDiscount;

      const itemBillDiscount = billLevelDiscount > 0
        ? (itemBasePrice / (subTotal - individualItemDiscount)) * billLevelDiscount
        : 0;

      const itemFinalPrice = itemPriceAfterIndividualDiscount - itemBillDiscount;

      if (!item.TaxItems || !Array.isArray(item.TaxItems) || item.TaxItems.length === 0) {
        return;
      }

      const activeTaxMappings = item.TaxItems.filter(taxItem => taxItem.isActive === true);

      if (activeTaxMappings.length === 0) {
        return;
      }

      activeTaxMappings.forEach((taxMapping) => {
        const taxId = taxMapping.taxId;
        const taxDetails = getTaxDetailsById(taxId);

        if (!taxDetails) return;

        if (taxDetails.transactionId !== currentTransactionTypeId && taxDetails.transactionId !== 0) {
          return;
        }

        const itemTaxAmount = (itemFinalPrice * taxDetails.taxPercentage) / 100;
        const taxKey = `${taxDetails.taxName} (${taxDetails.taxPercentage}%)`;

        if (!taxBreakdown[taxKey]) {
          taxBreakdown[taxKey] = {
            percentage: taxDetails.taxPercentage,
            amount: 0,
            taxName: taxDetails.taxName
          };
        }

        taxBreakdown[taxKey].amount += itemTaxAmount;
        totalTaxAmount += itemTaxAmount;
      });
    });

    Object.keys(taxBreakdown).forEach(key => {
      taxBreakdown[key].amount = parseFloat(taxBreakdown[key].amount.toFixed(2));
    });

    let cgstTotal = 0;
    let sgstTotal = 0;

    Object.values(taxBreakdown).forEach(tax => {
      const taxNameUpper = (tax.taxName || "").toUpperCase();
      if (taxNameUpper.includes('CGST')) {
        cgstTotal += tax.amount;
      } else if (taxNameUpper.includes('SGST')) {
        sgstTotal += tax.amount;
      }
    });

    const grandTotalBeforeRound = priceAfterDiscount + totalTaxAmount;
    const roundOff = Math.round(grandTotalBeforeRound) - grandTotalBeforeRound;
    const grandTotal = Math.round(grandTotalBeforeRound);

    return {
      subTotal: parseFloat(subTotal.toFixed(2)),
      itemDiscount: parseFloat(totalItemDiscount.toFixed(2)),
      operatorDiscount: 0,
      individualItemDiscount: parseFloat(individualItemDiscount.toFixed(2)),
      billLevelDiscount: parseFloat(billLevelDiscount.toFixed(2)),
      taxBreakdown,
      totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
      cgstTotal: parseFloat(cgstTotal.toFixed(2)),
      sgstTotal: parseFloat(sgstTotal.toFixed(2)),
      serviceCharge: 0,
      roundOff: parseFloat(roundOff.toFixed(2)),
      grandTotal: grandTotal
    };
  };

  // const totals = calculateBillTotals();

  // const ensureOrderExists = async () => {
  //   const actualOrderId = existingOrderId || 0;

  //   // 1. Identify new items or voids
  //   const newItems = selectedItems.filter(item => {
  //     if (item.isVoided) return false;
  //     const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
  //     const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);
  //     return !alreadySent;
  //   });

  //   const shouldSave = newItems.length > 0 || voidedItems.length > 0 || actualOrderId === 0;

  //   if (!shouldSave) {
  //     console.log('✅ Order is already up to date:', actualOrderId);
  //     return actualOrderId;
  //   }

  //   console.log('📝 Saving order updates to synchronize with backend...');

  //   try {
  //     const user = JSON.parse(localStorage.getItem("user"));
  //     const posId = JSON.parse(localStorage.getItem("posId"));
  //     const orderDate = salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString();

  //     let transactionTypeId = 1;
  //     if (orderTransactionType !== null) {
  //       transactionTypeId = orderTransactionType;
  //     } else {
  //       if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
  //         transactionTypeId = 2;
  //       } else if (activeTab === 'Home Delivery') {
  //         transactionTypeId = 3;
  //       }
  //     }

  //     const orderItemsDetails = [];

  //     // Add voided items
  //     if (voidedItems.length > 0) {
  //       voidedItems.forEach((item) => {
  //         const itemId = getPureItemId(item);
  //         orderItemsDetails.push({
  //           itemId: itemId,
  //           itemPrice: item.price,
  //           itemQty: -item.quantity,
  //           itemDisc: item.discount || 0,
  //           discType: item.discType || "None",
  //           itemname: item.name,
  //           ModifierItem: item.modifierItem || 0,
  //           addDetails: "",
  //           variantId: item.variantId || 0,
  //           variantName: item.variantName || "",
  //           openItemid: 0
  //         });
  //       });
  //     }

  //     // Add new items
  //     newItems.forEach((item) => {
  //       const itemId = getPureItemId(item);
  //       orderItemsDetails.push({
  //         itemId: itemId,
  //         itemPrice: item.price,
  //         itemQty: item.quantity,
  //         itemDisc: item.discount || 0,
  //         discType: item.discType || "None",
  //         itemname: item.name,
  //         ModifierItem: item.modifierItem || 0,
  //         addDetails: "",
  //         variantId: item.variantId || 0,
  //         variantName: item.variantName || "",
  //         openItemid: 0
  //       });

  //       if (item.description && item.description.trim()) {
  //         orderItemsDetails.push({
  //           itemId: 0,
  //           itemPrice: 0,
  //           itemQty: 0,
  //           itemDisc: 0,
  //           discType: "",
  //           itemname: `[${item.description.trim()}]`,
  //           ModifierItem: String(itemId),
  //           addDetails: "",
  //           variantId: 0,
  //           variantName: "",
  //           openItemid: 0
  //         });
  //       }
  //     });

  //     const orderPayload = {
  //       SaveOrderRequest: {
  //         orderDetails: {
  //           orderText: activeTab === 'Dine In' && selectedTable
  //             ? `Table ${selectedTable.Section_name} ${selectedTable.name}`
  //             : `${activeTab} Order`,
  //           orderId: actualOrderId,
  //           orderDate: orderDate,
  //           customerId: customerDetails ? 1 : 0,
  //           transactionType: transactionTypeId,
  //           sectionTable: tableDetails.sectionTable,
  //           PAX: tableDetails.PAX,
  //           chairNo: tableDetails.chairNo,
  //           outletId: 1,
  //           kotNo: kotNumber,
  //           kotBy: user?.id || 0,
  //           posId: posId || 1,
  //           orderItemsDetails: orderItemsDetails
  //         },
  //         orderstatus: 1
  //       }
  //     };

  //     if (customerDetails) {
  //       orderPayload.SaveOrderRequest.orderDetails.customerName = customerDetails.name || '';
  //       orderPayload.SaveOrderRequest.orderDetails.customerMobile = customerDetails.mobile || '';
  //       orderPayload.SaveOrderRequest.orderDetails.customerAddress = customerDetails.address || '';
  //       orderPayload.SaveOrderRequest.orderDetails.customerEmail = customerDetails.email || '';
  //     }

  //     const response = await saveOrder(orderPayload);

  //     let newId = actualOrderId;
  //     if (response?.orderId) newId = response.orderId;
  //     else if (response?.OrderId) newId = response.OrderId;
  //     else if (response?.data?.orderId) newId = response.data.orderId;
  //     else if (response?.SaveOrderResponse?.orderId) newId = response.SaveOrderResponse.orderId;

  //     if (!newId || newId === 0) {
  //       throw new Error("Failed to save order - no ID returned");
  //     }

  //     if (actualOrderId === 0 && setExistingOrderId) {
  //       setExistingOrderId(newId);
  //     }
  //     itemDiscount: parseFloat(totalItemDiscount.toFixed(2)),
  //     operatorDiscount: 0,
  //     individualItemDiscount: parseFloat(individualItemDiscount.toFixed(2)),
  //     billLevelDiscount: parseFloat(billLevelDiscount.toFixed(2)),
  //     taxBreakdown,
  //     totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
  //     cgstTotal: 0,
  //     sgstTotal: 0,
  //     serviceCharge: 0,
  //     roundOff: parseFloat(roundOff.toFixed(2)),
  //     grandTotal: grandTotal
  //   };
  // };

  const totals = calculateBillTotals();

  const ensureOrderExists = async () => {
    const actualOrderId = existingOrderId || 0;

    // 1. Identify new items or voids
    const newItems = selectedItems.filter(item => {
      if (item.isVoided) return false;
      const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
      const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);
      return !alreadySent;
    });

    const shouldSave = newItems.length > 0 || voidedItems.length > 0 || actualOrderId === 0 || selectedDiscount !== null || Object.values(categoryDiscounts).some(v => v > 0);

    if (!shouldSave) {
      console.log('✅ Order is already up to date:', actualOrderId);
      return actualOrderId;
    }

    console.log('📝 Saving order updates to synchronize with backend...');

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      const posId = JSON.parse(localStorage.getItem("posId"));
      const orderDate = salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString();

      let transactionTypeId = 1;
      if (orderTransactionType !== null) {
        transactionTypeId = orderTransactionType;
      } else {
        if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
          transactionTypeId = 2;
        } else if (activeTab === 'Home Delivery') {
          transactionTypeId = 3;
        }
      }

      const orderItemsDetails = [];

      // Add voided items
      if (voidedItems.length > 0) {
        voidedItems.forEach((item) => {
          const itemId = getPureItemId(item);
          const catId = item.categoryId || item.subcategoryId || 0;
          const categoryDisc = categoryDiscounts[catId] || 0;

          orderItemsDetails.push({
            itemId: itemId,
            itemPrice: item.price,
            itemQty: -item.quantity,
            // DO NOT send itemDisc for Category discounts to avoid line-price reduction and doubling in print
            itemDisc: 0,
            discType: categoryDisc > 0 ? "Category" : (item.discType || "None"),
            itemname: item.name,
            ModifierItem: item.modifierItem || 0,
            addDetails: item.description && item.description.trim() ? item.description.trim() : "",
            variantId: item.variantId || 0,
            variantName: item.variantName || "",
            openItemid: 0,
            is_complimentary: item.isComplimentary || false,
            subcategoryId: item.subcategoryId || 0
          });
        });
      }

      // If category discounts are applied, we need to ensure ALL items in those categories are sent
      // to the backend to save the discount, even if they were already sent.
      const discountedItemKeys = new Set();

      // Add new items (always need saving)
      newItems.forEach((item) => {
        const itemId = getPureItemId(item);
        const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
        discountedItemKeys.add(itemKey);

        const catIdForLookup = item.categoryId || item.subcategoryId || 0;
        const categoryDisc = categoryDiscounts[catIdForLookup] || 0;

        orderItemsDetails.push({
          itemId: itemId,
          itemPrice: item.price,
          itemQty: item.quantity,
          // Use 0 for itemDisc when it's a category discount to keep original price on bill line
          itemDisc: 0,
          discType: categoryDisc > 0 ? "Category" : (item.discType || "None"),
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

      // Add already sent items if they have a category discount
      selectedItems.forEach((item) => {
        if (item.isVoided) return;
        const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();

        // Skip if already added as a new item
        if (discountedItemKeys.has(itemKey)) return;

        const catIdForLookup = item.categoryId || item.subcategoryId || 0;
        const categoryDisc = categoryDiscounts[catIdForLookup] || 0;

        // If a category discount is active for this item, include it in the save request with 0 disc
        if (categoryDisc > 0) {
          const itemId = getPureItemId(item);
          orderItemsDetails.push({
            itemId: itemId,
            itemPrice: item.price,
            itemQty: item.quantity,
            itemDisc: 0,
            discType: "Category",
            itemname: item.name,
            ModifierItem: item.modifierItem || 0,
            addDetails: item.description && item.description.trim() ? item.description.trim() : "",
            variantId: item.variantId || 0,
            variantName: item.variantName || "",
            openItemid: 0,
            is_complimentary: item.isComplimentary || false,
            subcategoryId: item.subcategoryId || 0
          });
        }
      });

      // Bill-level discount amount for SaveOrder (must subtract all line-level discounts first)
      const subTotalForDisc = selectedItems.filter(i => !i.isVoided).reduce((s, i) => s + (i.price * i.quantity), 0);
      const individualItemDisc = selectedItems.filter(i => !i.isVoided).reduce((sum, item) => {
        const catId = item.categoryId || item.subcategoryId || 0;
        const catDiscPercent = categoryDiscounts[catId] || 0;
        if (catDiscPercent > 0) {
          return sum + (item.price * item.quantity * (catDiscPercent / 100));
        }
        return sum + ((item.discount || 0) * item.quantity);
      }, 0);

      const billLevelDiscAmt = selectedDiscount
        ? parseFloat(((subTotalForDisc - individualItemDisc) * (selectedDiscount.discountPercentage / 100)).toFixed(2))
        : 0;

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
            sectionTable: Number(tableDetails.sectionTable) || 0,
            PAX: Number(tableDetails.PAX) || 0,
            chairNo: 0,
            outletId: 1,
            kotNo: kotNumber,
            kotBy: user?.id || 0,
            posId: posId || 1,
            discAmt: billLevelDiscAmt,
            categoryDiscounts: Object.keys(categoryDiscounts)
              .filter(catId => categoryDiscounts[catId] > 0)
              .map(catId => ({
                categoryId: Number(catId),
                discountPercentage: categoryDiscounts[catId]
              })),
            orderItemsDetails: orderItemsDetails
          },
          orderstatus: 0
        }
      };

      const response = await saveOrder(orderPayload);

      let newId = actualOrderId;
      if (response?.orderId) newId = response.orderId;
      else if (response?.OrderId) newId = response.OrderId;
      else if (response?.data?.orderId) newId = response.data.orderId;
      else if (response?.SaveOrderResponse?.orderId) newId = response.SaveOrderResponse.orderId;

      if (!newId || newId === 0) {
        throw new Error("Failed to save order - no ID returned");
      }

      if (actualOrderId === 0 && setExistingOrderId) {
        setExistingOrderId(newId);
      }

      // Sync sent items locally
      if (newItems.length > 0 && setSentItems) {
        const newItemKeys = newItems.map(item =>
          `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase()
        );
        setSentItems([...sentItems, ...newItemKeys]);
      }

      return newId;

    } catch (error) {
      console.error("❌ Sync failed in PaymentModal:", error);
      throw error;
    }
  };

  const handleMultiPayConfirm = (paymentModes) => {
    setMultiPayModes(paymentModes);
    setShowMultiPayModal(false);
    setTimeout(() => handleBillWithMultiPay(paymentModes), 100);
  };

  const handlePaymentModeSelect = async (method) => {
    if (isProcessing) return;

    if (selectedItems.length === 0) {
      showToast('No items in cart', 'error');
      return;
    }

    // Set the payment mode
    setSelectedPaymentMode(method.code);

    // Automatically process the bill
    await processBill([{ PaymentType: method.code, Amount: totals.grandTotal }]);
  };

  const handleApplyDiscount = (discount) => {
    // 🔐 Check DISCOUNT permission
    setDiscount(discount?.discountPercentage || 0);
    setSelectedDiscount(discount);
    // ✅ Clear API-level flat discount when a manual/predefined one is selected or cleared
    setApiOrderDiscAmt(0);
    setShowDiscountModal(false);
  };

  const handleCheck = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

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

      // 1. Handle void items if any
      if (voidedItems.length > 0 && actualOrderId !== 0) {
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
        } catch (error) {
          console.error("❌ Void API Error:", error);
          throw new Error(`Failed to void items: ${error.message || 'Unknown error'}`);
        }
      }

      // 2. Identify new items that haven't been sent yet
      const newItems = selectedItems.filter(item => {
        if (item.isVoided) return false;
        const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
        const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);
        return !alreadySent;
      });

      // 3. Only save if there are changes or it's a new order
      const shouldSave = newItems.length > 0 || voidedItems.length > 0 || actualOrderId === 0 || selectedDiscount !== null || Object.keys(categoryDiscounts).length > 0;

      let orderId = actualOrderId;

      if (shouldSave) {
        const orderItemsDetails = [];

        // Add voided items with negative quantity (for saveOrder API)
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
          });
        }

        // Add new items
        newItems.forEach((item) => {
          const itemId = getPureItemId(item);
          const subId = item.subcategoryId || 0;
          const categoryDisc = categoryDiscounts[subId] || 0;

          orderItemsDetails.push({
            itemId: itemId,
            itemPrice: item.price,
            itemQty: item.quantity,
            itemDisc: categoryDisc > 0 ? categoryDisc : (item.discount || 0),
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

        // Bill-level discount amount for SaveOrder (same as "Bill Discount" in Payment modal)
        const subTotalForDisc = selectedItems.filter(i => !i.isVoided).reduce((s, i) => s + (i.price * i.quantity), 0);
        const individualItemDisc = selectedItems.filter(i => !i.isVoided).reduce((s, i) => s + ((i.discount || 0) * i.quantity), 0);
        const billLevelDiscAmt = selectedDiscount
          ? parseFloat(((subTotalForDisc - individualItemDisc) * (selectedDiscount.discountPercentage / 100)).toFixed(2))
          : 0;

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
              PAX: numPersons || 1,
              chairNo: 0,
              outletId: 1,
              kotNo: kotNumber,
              kotBy: user?.id || 0,
              posId: posId || 1,
              discAmt: billLevelDiscAmt,
              orderItemsDetails: orderItemsDetails
            },
            orderstatus: 0
          }
        };

        const saveResponse = await saveOrder(orderPayload);

        // Extract order ID
        if (saveResponse?.orderId) orderId = saveResponse.orderId;
        else if (saveResponse?.OrderId) orderId = saveResponse.OrderId;
        else if (saveResponse?.data?.orderId) orderId = saveResponse.data.orderId;
        else if (saveResponse?.data?.OrderId) orderId = saveResponse.data.OrderId;
        else if (saveResponse?.SaveOrderResponse?.orderId) orderId = saveResponse.SaveOrderResponse.orderId;
        else if (saveResponse?.SaveOrderResponse?.OrderId) orderId = saveResponse.SaveOrderResponse.OrderId;

        if (!orderId || orderId === 0) {
          throw new Error("Failed to save order - no order ID returned");
        }

        if (actualOrderId === 0 && setExistingOrderId) {
          setExistingOrderId(orderId);
        }
      }

      // 4. Print the check
      const categoryDiscountsList = Object.keys(categoryDiscounts)
        .filter(catId => categoryDiscounts[catId] > 0)
        .map(catId => ({
          categoryId: Number(catId),
          discountPercentage: categoryDiscounts[catId]
        }));

      const hasCategoryDiscounts = categoryDiscountsList.length > 0;

      const checkPrintPayload = {
        CheckPrintRequest: {
          OrderId: Number(orderId),
          staffId: user?.id || 0,
          printType: 0,
          // If category discounts are present, set bill-level discountPercentage to 0 to avoid doubling
          discountPercentage: hasCategoryDiscounts ? 0 : (selectedDiscount?.discountPercentage || 0),
          categoryDiscounts: categoryDiscountsList
        }
      };

      await printCheck(checkPrintPayload);

      showToast(
        `Check printed! Bill: ${billNumber}, Order: ${orderId}, Total: ₹${totals.grandTotal}`,
        'success'
      );

      // 5. Reset and Navigate (Matches Cart.jsx behavior)
      setTimeout(() => {
        onPaymentComplete();
        onClose();
        navigate(getKotRedirectUrl(), { replace: true });
      }, 1500);

    } catch (error) {
      console.error("❌ Error printing check:", error);
      showToast(`Failed to print check: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNC = () => {
    // 🔐 Check NC permission
    executeWithPermission(PERMISSIONS.NC, 'NC', () => {
      if (selectedItems.length === 0) {
        showToast('No items in cart', 'error');
        return;
      }
      setShowCustomerModal(true);
    });
  };

  const handleNCSubmit = async (customerDetailsNC) => {


    showConfirmDialog(
      'Confirm No Charge (NC) Bill',
      `Customer: ${customerDetailsNC.name}\nMobile: ${customerDetailsNC.mobile}\nBill: ${billNumber}\nTable: ${selectedTable?.name || 'N/A'}\nAmount: ₹${totals.grandTotal.toFixed(2)}\n\nThis order will be completed with ZERO payment.`,
      async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
        setIsProcessing(true);
        setShowCustomerModal(false);

        try {
          const orderId = await ensureOrderExists();

          const user = JSON.parse(localStorage.getItem("user"));
          const posId = JSON.parse(localStorage.getItem("posId"));

          let transactionTypeId = 1;

          if (orderTransactionType !== null) {
            transactionTypeId = orderTransactionType;
          } else {
            if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
              transactionTypeId = 2;
            } else if (activeTab === 'Home Delivery') {
              transactionTypeId = 3;
            }
          }

          const finalItems = selectedItems.filter(item => !item.isVoided);
          const groupedItemsMap = new Map();

          finalItems.forEach(item => {
            const pureItemId = getPureItemId(item);
            const variantId = item.variantId || 0;
            const key = `${pureItemId}_${variantId}`;

            if (groupedItemsMap.has(key)) {
              const existing = groupedItemsMap.get(key);
              existing.quantity += item.quantity;
            } else {
              groupedItemsMap.set(key, { ...item });
            }
          });

          const uniqueItems = Array.from(groupedItemsMap.values());

          const items = uniqueItems.map((item, index) => {
            const basePrice = item.price * item.quantity;
            const itemDiscount = (item.discount || 0) * item.quantity;
            const priceAfterDiscount = basePrice - itemDiscount;

            let itemGstTotal = 0;
            let totalTaxRate = 0;

            if (item.TaxItems && Array.isArray(item.TaxItems) && item.TaxItems.length > 0) {
              const activeTaxMappings = item.TaxItems.filter(t => t.isActive === true);

              activeTaxMappings.forEach(taxMapping => {
                const taxDetails = getTaxDetailsById(taxMapping.taxId);
                if (taxDetails && (taxDetails.transactionId === transactionTypeId || taxDetails.transactionId === 0)) {
                  const taxAmount = (priceAfterDiscount * taxDetails.taxPercentage) / 100;
                  itemGstTotal += taxAmount;
                  totalTaxRate += taxDetails.taxPercentage;
                }
              });
            }

            const priceAfterGst = priceAfterDiscount + itemGstTotal;

            return {
              item_barcode: item.barcode || `ITEM${String(index + 1).padStart(3, '0')}`,
              id: getPureItemId(item),
              item_name: item.name,
              item_unit: item.unit || "Plate",
              item_quantity: item.quantity,
              item_rate: item.price,
              base_price: basePrice,
              item_discount: itemDiscount,
              price_after_discount: priceAfterDiscount,
              item_gst_rate: totalTaxRate,
              item_gst_total: parseFloat(itemGstTotal.toFixed(2)),
              price_after_gst: parseFloat(priceAfterGst.toFixed(2)),
              item_description: item.description || "",
              addDetails: item.description || ""
            };
          });

          const paymentSummary = {
            subTotal: totals.subTotal,
            itemDiscount: totals.subTotal,
            operatorDiscount: 0,
            taxBreakdown: totals.taxBreakdown,
            totalTaxAmount: totals.totalTaxAmount,
            cgstTotal: totals.cgstTotal,
            sgstTotal: totals.sgstTotal,
            serviceCharge: 0,
            roundOff: 0,
            grandTotal: 0
          };

          paymentSummary.discountDetails = {
            discountId: 0,
            discountName: "No Charge (NC)",
            discountPercentage: 100,
            discountAmount: totals.subTotal
          };

          const billPayload = {
            customer_id: 1,
            customer_name: customerDetailsNC.name.trim(),
            customer_mobile: customerDetailsNC.mobile.trim(),
            customer_address: customerDetailsNC.address.trim() || "",
            customer_email: customerDetailsNC.email.trim() || "",
            outlet_id: 1,
            counter_id: posId || 1,
            orderId: orderId,
            staffId: user?.id || 12,
            transactionType: transactionTypeId,

            sectionTable: tableDetails.sectionTable,
            chairNo: tableDetails.chairNo,
            PAX: tableDetails.PAX,

            date_of_sale: salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString(),
            is_credit_bill: false,
            payment_summary: paymentSummary,
            paymentModes: [{ PaymentType: "NC", Amount: 0 }],
            items: items
          };

          console.log("📤 Sending NC bill:", billPayload);
          const response = await saveBill(billPayload);
          console.log("✅ NC Bill saved:", response);

          showToast(`NC Bill Completed! Customer: ${customerDetailsNC.name}, Bill: ${billNumber}, Original: ₹${totals.grandTotal}, Charged: ₹0.00`, 'success');

          setIsProcessing(false);
          onClose();

          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            setTimeout(() => navigate(getKotRedirectUrl()), 500);
          }

        } catch (error) {
          console.error("❌ Error saving NC bill:", error);
          showToast(`Failed to complete NC bill: ${error.message || 'Unknown error'}`, 'error');
          setIsProcessing(false);
        }
      }
    );
  };

  const handleOrderCancel = () => {
    // 🔐 Check ORDER_CANCEL permission
    executeWithPermission(PERMISSIONS.ORDER_CANCEL, 'Order Cancel', () => {
      if (selectedItems.length === 0) {
        showToast('No items to cancel', 'error');
        return;
      }

      if (!existingOrderId || existingOrderId === 0) {
        showToast('Cannot cancel - order has not been created yet', 'error');
        return;
      }

      setShowCancelModal(true);
    });
  };

  const handleCancelSubmit = async (reason) => {

    showConfirmDialog(
      '⚠️ CONFIRM ORDER CANCELLATION',
      `Bill: ${billNumber}\nTable: ${selectedTable?.name || 'N/A'}\nItems: ${selectedItems.length}\nAmount: ₹${totals.grandTotal.toFixed(2)}\n\nReason: ${reason}\n\nThis action CANNOT be undone!`,
      async () => {
        setConfirmDialog({ show: false, title: '', message: '', onConfirm: null, onCancel: null });
        setIsProcessing(true);
        setShowCancelModal(false);

        try {
          const user = JSON.parse(localStorage.getItem("user"));
          const orderId = existingOrderId;
          const staffId = user?.id || 12;

          console.log("🗑️ Cancelling order:", { orderId, staffId, reason });

          const response = await cancelOrder(orderId, staffId, reason);

          console.log("✅ Order cancelled successfully:", response);

          const successMessage = response?.message || "Order cancelled successfully";
          const orderStatus = response?.orderStatus || "OC";

          showToast(`${successMessage} - Bill: ${billNumber}, Order: ${orderId}, Status: ${orderStatus}`, 'success');

          setIsProcessing(false);
          onClose();

          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            setTimeout(() => navigate(getKotRedirectUrl()), 500);
          }

        } catch (error) {
          console.error("❌ Error cancelling order:", error);

          let errorMessage = 'Unknown error';
          if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }

          showToast(`Failed to cancel order: ${errorMessage}`, 'error');
          setIsProcessing(false);
          setShowCancelModal(false);
        }
      }
    );
  };

  const handleBillWithMultiPay = async (paymentModes) => {
    if (selectedItems.length === 0) {
      showToast('No items in cart', 'error');
      return;
    }

    await processBill(paymentModes);
  };

  const processBill = async (paymentModesArray) => {
    setIsProcessing(true);

    try {
      const orderId = await ensureOrderExists();
      console.log('💳 Processing payment for Order ID:', orderId);

      const user = JSON.parse(localStorage.getItem("user"));
      const posId = JSON.parse(localStorage.getItem("posId"));

      let transactionTypeId = 1;

      if (orderTransactionType !== null) {
        transactionTypeId = orderTransactionType;
      } else {
        if (activeTab === 'Take Away' || activeTab === 'TakeAway') {
          transactionTypeId = 2;
        } else if (activeTab === 'Home Delivery') {
          transactionTypeId = 3;
        }
      }

      const finalItems = selectedItems.filter(item => !item.isVoided);

      console.log("🔍 Selected Items Count:", selectedItems.length);
      console.log("🔍 After Void Filter:", finalItems.length);

      const groupedItemsMap = new Map();

      finalItems.forEach(item => {
        const pureItemId = getPureItemId(item);
        const variantId = item.variantId || 0;
        const key = `${pureItemId}_${variantId}`;

        if (groupedItemsMap.has(key)) {
          const existing = groupedItemsMap.get(key);
          existing.quantity += item.quantity;
          console.log(`✅ Combined quantities for ${item.name}: ${existing.quantity}`);
        } else {
          groupedItemsMap.set(key, { ...item });
        }
      });

      const uniqueItems = Array.from(groupedItemsMap.values());
      console.log("📦 Unique Items After Grouping:", uniqueItems.length);

      const items = uniqueItems.map((item, index) => {
        const basePrice = item.price * item.quantity;
        const itemDiscount = (item.discount || 0) * item.quantity;
        const priceAfterDiscount = basePrice - itemDiscount;

        let itemGstTotal = 0;
        let totalTaxRate = 0;

        if (item.TaxItems && Array.isArray(item.TaxItems) && item.TaxItems.length > 0) {
          const activeTaxMappings = item.TaxItems.filter(t => t.isActive === true);

          activeTaxMappings.forEach(taxMapping => {
            const taxDetails = getTaxDetailsById(taxMapping.taxId);
            if (taxDetails && (taxDetails.transactionId === transactionTypeId || taxDetails.transactionId === 0)) {
              const taxAmount = (priceAfterDiscount * taxDetails.taxPercentage) / 100;
              itemGstTotal += taxAmount;
              totalTaxRate += taxDetails.taxPercentage;
            }
          });
        }

        const priceAfterGst = priceAfterDiscount + itemGstTotal;

        return {
          item_barcode: item.barcode || `ITEM${String(index + 1).padStart(3, '0')}`,
          id: getPureItemId(item),
          item_name: item.name,
          item_unit: item.unit || "Plate",
          item_quantity: item.quantity,
          item_rate: item.price,
          base_price: basePrice,
          item_discount: itemDiscount,
          price_after_discount: priceAfterDiscount,
          item_gst_rate: totalTaxRate,
          item_gst_total: parseFloat(itemGstTotal.toFixed(2)),
          price_after_gst: parseFloat(priceAfterGst.toFixed(2)),
          item_description: item.description || "",
          addDetails: item.description || ""
        };
      });

      const paymentSummary = {
        subTotal: totals.subTotal,
        itemDiscount: totals.itemDiscount,
        billLevelDiscount: totals.billLevelDiscount,
        discountPercentage: totals.discountPercentage,
        operatorDiscount: 0,
        taxBreakdown: totals.taxBreakdown,
        totalTaxAmount: totals.totalTaxAmount,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        serviceCharge: totals.serviceCharge,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal
      };

      if (selectedDiscount) {
        paymentSummary.discountDetails = {
          discountId: selectedDiscount.discountId,
          discountName: selectedDiscount.discountName,
          discountPercentage: selectedDiscount.discountPercentage,
          discountAmount: totals.billLevelDiscount
        };
      }

      const billPayload = {
        customer_id: customerDetails ? 1 : 0,
        customer_name: customerDetails?.name || "",
        customer_mobile: customerDetails?.mobile || "",
        customer_address: customerDetails?.address || "",
        customer_email: customerDetails?.email || "",
        outlet_id: 1,
        counter_id: posId || 1,
        orderId: orderId,
        staffId: user?.id || 12,
        transactionType: transactionTypeId,

        sectionTable: tableDetails.sectionTable,
        chairNo: tableDetails.chairNo,
        PAX: tableDetails.PAX,

        date_of_sale: salesDateISO || localStorage.getItem('salesDate') || new Date().toISOString(),
        is_credit_bill: false,
        payment_summary: paymentSummary,
        paymentModes: paymentModesArray,
        items: items
      };

      console.log("📤 Sending bill payload:", billPayload);
      const response = await saveBill(billPayload);
      console.log("✅ Bill saved:", response);

      const paymentModeDisplay = paymentModesArray.length > 1
        ? 'Multi-Pay: ' + paymentModesArray.map(p => `${p.PaymentType}: ₹${p.Amount.toFixed(2)}`).join(', ')
        : paymentModesArray[0].PaymentType;

      const customerInfo = customerDetails
        ? ` | Customer: ${customerDetails.name}`
        : '';

      showToast(`Bill Completed! Bill: ${billNumber}, Payment: ${paymentModeDisplay}, Total: ₹${totals.grandTotal.toFixed(2)}${customerInfo}`, 'success');

      setIsProcessing(false);
      onClose();

      if (onPaymentComplete) {
        onPaymentComplete();
      } else {
        setTimeout(() => navigate(getKotRedirectUrl()), 500);
      }

    } catch (error) {
      console.error("❌ Error saving bill:", error);
      showToast(`Failed to complete bill: ${error.message || 'Unknown error'}`, 'error');
      setIsProcessing(false);
    }
  };

  // 🔐 Open discount modal with permission check
  const openDiscountModal = () => {
    setShowDiscountModal(true);
  };

  return (
    <>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' :
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
            <span className="font-medium text-sm">{toast.message}</span>
          </div>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-black mb-3">{confirmDialog.title}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line mb-6">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={confirmDialog.onCancel}
                className="px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 transition-all duration-300 ${isVisible ? 'bg-black bg-opacity-50' : 'bg-black bg-opacity-0'
        }`} onClick={(e) => { if (e.target === e.currentTarget && !isProcessing) onClose(); }}>
        <div className={`relative bg-white rounded-lg shadow-2xl border border-gray-300 w-full max-w-[420px] max-h-[95vh] overflow-hidden transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
          }`} onClick={(e) => e.stopPropagation()}>

          <div className="bg-white text-black px-3 py-2 relative border-b border-gray-300">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>

            <div className="flex items-center gap-1.5">
              <div>
                <h2 className="text-base font-bold text-black">Payment</h2>
                {selectedTable?.name && (
                  <p className="text-[11px] text-gray-600 leading-tight">
                    Table: {selectedTable.name}
                  </p>
                )}
                {customerDetails && (
                  <p className="text-[11px] text-green-600 leading-tight">
                    👤 {customerDetails.name} ({customerDetails.mobile})
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="p-2 max-h-[calc(95vh-120px)] overflow-y-auto bg-white">

            <div className="bg-white border border-gray-300 rounded shadow-sm mb-2">
              <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-300">
                <h3 className="text-xs font-bold text-black flex items-center gap-1">
                  📋 Sales Summary
                </h3>
              </div>

              <div className="p-2">
                {taxesLoading ? (
                  <div className="text-center py-3">
                    <div className="inline-block w-5 h-5 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-gray-600 mt-1">Loading taxes...</p>
                  </div>
                ) : (
                  <div className="space-y-1 text-xs">

                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Sub Total</span>
                      <span className="font-semibold text-black">
                        ₹{totals.subTotal.toFixed(2)}
                      </span>
                    </div>

                    {totals.individualItemDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1">
                          <FaPercentage className="text-[10px]" />
                          Item Discount
                        </span>
                        <span className="font-semibold">
                          -₹{totals.individualItemDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {totals.billLevelDiscount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="flex items-center gap-1">
                          <FaPercentage className="text-[10px]" />
                          Bill Discount {selectedDiscount ? `(${selectedDiscount.discountPercentage}%)` : ''}
                        </span>
                        <span className="font-semibold">
                          -₹{totals.billLevelDiscount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {totals.itemDiscount > 0 && (
                      <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                        <span className="text-gray-700">Subtotal After Discount</span>
                        <span className="font-semibold text-black">
                          ₹{(totals.subTotal - totals.itemDiscount).toFixed(2)}
                        </span>
                      </div>
                    )}

                    {Object.entries(totals.taxBreakdown).length > 0 && (
                      <div className="border-t border-gray-200 pt-1 space-y-1">
                        {Object.entries(totals.taxBreakdown).map(([taxKey, taxData]) => (
                          <div key={taxKey} className="flex justify-between items-center">
                            <span className="text-gray-700">{taxKey}</span>
                            <span className="font-semibold text-black">
                              ₹{taxData.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center text-gray-700">
                          <span className="font-medium">Total Tax</span>
                          <span className="font-semibold">
                            ₹{totals.totalTaxAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {totals.roundOff !== 0 && (
                      <div className="flex justify-between items-center border-t border-gray-200 pt-1">
                        <span className="text-gray-700">Round Off</span>
                        <span
                          className={`font-semibold ${totals.roundOff >= 0 ? 'text-black' : 'text-red-600'
                            }`}
                        >
                          {totals.roundOff >= 0 ? '+' : ''}
                          ₹{totals.roundOff.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1.5 border-t-2 border-gray-400 mt-1.5">
                      <span className="text-black font-bold text-sm">Net Amount</span>
                      <span className="font-bold text-black text-base">
                        ₹{totals.grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2">
              <button
                onClick={() => setShowDiscountModal(true)}
                disabled={isProcessing}
                className={`w-full px-2 py-1.5 text-xs font-bold rounded border ${selectedDiscount
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {selectedDiscount
                  ? `Discount: ${selectedDiscount.discountPercentage}%`
                  : 'Apply Discount'}
              </button>
            </div>

            <div className="mb-2">
              <button
                onClick={() => setShowCategoryDiscountModal(true)}
                disabled={isProcessing}
                className={`w-full px-2 py-1.5 text-xs font-bold rounded border ${Object.keys(categoryDiscounts).length > 0
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-black border-gray-300 hover:border-gray-400'
                  } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {Object.keys(categoryDiscounts).length > 0
                  ? `Category Disc Applied`
                  : 'Category Discount'}
              </button>
            </div>

            <div className="bg-white border border-gray-300 rounded shadow-sm mb-2">
              <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-300">
                <h4 className="text-xs font-bold text-black">💳 Payment Method</h4>
              </div>

              <div className="p-2">
                <div className="grid grid-cols-2 gap-1.5">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.id}
                        onClick={() => handlePaymentModeSelect(method)}
                        disabled={isProcessing}
                        className={`p-2 text-[11px] font-bold rounded border flex items-center justify-center gap-1 ${selectedPaymentMode === method.code
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-black border-gray-300 hover:border-gray-400'
                          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Icon className="text-xs" />
                        <span>{method.name}</span>
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setShowMultiPayModal(true)}
                    disabled={isProcessing}
                    className="p-2 text-[11px] font-bold rounded border bg-white text-black border-gray-300 hover:border-gray-400 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>💳 Multi-Pay</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white border-t border-gray-300 px-3 py-3">
            <div className="flex justify-between gap-2 mb-2">
              <button
                onClick={handleNC}
                disabled={isProcessing}
                className="flex-1 px-3 py-2 bg-white text-black border-2 border-gray-300 hover:border-gray-400 rounded font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'PROCESSING...' : '💳 NC'}
              </button>
              <button
                onClick={handleOrderCancel}
                disabled={isProcessing || !existingOrderId || existingOrderId === 0}
                className="flex-1 px-3 py-2 bg-white text-black border-2 border-gray-300 hover:border-gray-400 rounded font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'PROCESSING...' : '🗑️ CANCEL'}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCheck}
                disabled={isProcessing}
                className="px-4 py-2 bg-white text-black border-2 border-gray-300 hover:border-gray-400 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    CHECK
                  </>
                ) : (
                  '🖨️ CHECK'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <DiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApplyDiscount={handleApplyDiscount}
        selectedDiscount={selectedDiscount}
      />

      <CustomerDetailsModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSubmit={handleNCSubmit}
        billNumber={billNumber}
        totalAmount={totals.grandTotal}
        buttonText="Confirm NC"
        buttonIcon="💳"
        modalTitle="💳 No Charge - Customer Details"
      />

      <OrderCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancelSubmit}
        billNumber={billNumber}
        totalAmount={totals.grandTotal}
      />

      <MultiPayModal
        isOpen={showMultiPayModal}
        onClose={() => setShowMultiPayModal(false)}
        totalAmount={totals.grandTotal}
        onConfirm={handleMultiPayConfirm}
      />

      <CategoryDiscountModal
        isOpen={showCategoryDiscountModal}
        onClose={() => setShowCategoryDiscountModal(false)}
        selectedItems={selectedItems}
        onApplyCategoryDiscounts={(discounts) => setCategoryDiscounts(discounts)}
        existingCategoryDiscounts={categoryDiscounts}
      />
    </>
  );
};

export default PaymentModal;