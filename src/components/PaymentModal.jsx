import React, { useState, useEffect } from 'react';
import { X, Phone, Menu } from 'lucide-react';
import logo from '../assets/Billzen main1.png';
import { FaCreditCard, FaMoneyBillWave, FaMobile, FaPercentage, FaEllipsisH } from 'react-icons/fa';
import { saveBill, printCheck, getOrderDetails, cancelOrder, getTaxes, saveOrder, saveItemVoid, getKotRedirectUrl } from '../services/apicall';
import { useNavigate } from 'react-router-dom';
import CustomerDetailsModal from './Customerdetailsmodal';
import DiscountModal from './Discountmodal';
import OrderCancelModal from './Ordercancelmodal';
import MultiPayModal from './Multipaymodal';
import CategoryDiscountModal from './CategoryDiscountModal';
import SettingsSidebar from './SettingsSidebar';
import DayClosePopup from './DayClosePopup';
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
  const [showSettings, setShowSettings] = useState(false);
  const [showDayClosePopup, setShowDayClosePopup] = useState(false);

  // Discount state
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [apiOrderDiscAmt, setApiOrderDiscAmt] = useState(0);

  // Multi-pay data
  const [multiPayModes, setMultiPayModes] = useState(null);

  // Category-wise discount state
  const [categoryDiscounts, setCategoryDiscounts] = useState({});

  // Redesign UI states
  const [viewMode, setViewMode] = useState('denominations'); // 'denominations' or 'discounts'
  const [enteredAmount, setEnteredAmount] = useState('');
  const [sidebarTab, setSidebarTab] = useState('itemWise'); // 'itemWise', 'category', 'billWise'
  const [selectedSidebarCategory, setSelectedSidebarCategory] = useState(null);
  const [allDiscounts, setAllDiscounts] = useState([]);
  const [discountsLoading, setDiscountsLoading] = useState(false);

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

    // NOTE: Discounts are loaded lazily when user clicks the DISCOUNT button,
    // not on every modal mount. See handleDiscountToggle below.
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

  const ensureOrderExists = async (forceSave = false) => {
    const actualOrderId = existingOrderId || 0;

    // 1. Identify new items or voids
    const newItems = selectedItems.filter(item => {
      if (item.isVoided) return false;
      const itemKey = `${item.id || item.itemId}_${item.variantId || 0}_${item.description || ''}`.toLowerCase();
      const alreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);
      return !alreadySent;
    });

    // Only save if there are actual changes: new items, voids, new order, or category discounts.
    // Do NOT trigger save just because a discount is selected — discounts are saved at payment/check-print time.
    const shouldSave = forceSave || newItems.length > 0 || voidedItems.length > 0 || actualOrderId === 0 || Object.values(categoryDiscounts).some(v => v > 0);

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

      // Add new items (always need saving)
      newItems.forEach((item) => {
        const itemId = getPureItemId(item);

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

      // NOTE: Do NOT re-send already-saved items here even if they have a category discount.
      // The categoryDiscounts field at the order level (sent below) is enough for the backend
      // to apply the discount. Re-sending items with their quantity causes the backend to
      // add to the existing quantity, resulting in doubled quantities.

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
          orderstatus: 1
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

  const handleNumpadClick = (value) => {
    if (value === '.') {
      if (!enteredAmount.includes('.')) {
        setEnteredAmount(prev => prev + '.');
      }
    } else {
      setEnteredAmount(prev => prev + value);
    }
  };

  const handleBackspace = () => {
    setEnteredAmount(prev => prev.slice(0, -1));
  };

  const handleDenominationClick = (amount) => {
    const current = parseFloat(enteredAmount) || 0;
    setEnteredAmount((current + amount).toString());
  };

  const clearAmount = () => {
    setEnteredAmount('');
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

      // 1. Ensure order exists and is synchronized (Always forceSave to move status out of OC)
      const orderId = await ensureOrderExists(true);

      const user = JSON.parse(localStorage.getItem("user"));

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
          const orderId = await ensureOrderExists(true);
          // Sync backend state before final bill save
          await getOrderDetails(orderId);

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
            return {
              item_barcode: item.barcode || `ITEM${String(index + 1).padStart(3, '0')}`,
              id: getPureItemId(item),
              item_name: item.name,
              item_unit: item.unit || "Plate",
              item_quantity: item.quantity,
              item_rate: item.price,
              base_price: basePrice,
              item_discount: 0,
              price_after_discount: 0,
              item_gst_rate: 0,
              item_gst_total: 0,
              price_after_gst: 0,
              item_description: item.description || "",
              addDetails: item.description || "",
              is_complimentary: true
            };
          });

          const paymentSummary = {
            subTotal: totals.subTotal,
            itemDiscount: 0,
            billLevelDiscount: 0,
            discountPercentage: 0,
            operatorDiscount: 0,
            taxBreakdown: {},
            totalTaxAmount: 0,
            cgstTotal: 0,
            sgstTotal: 0,
            serviceCharge: 0,
            roundOff: 0,
            grandTotal: 0
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
      const orderId = await ensureOrderExists(true);
      // Sync backend state before final bill save
      await getOrderDetails(orderId);
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

  const handleDiscountToggle = () => {
    executeWithPermission(PERMISSIONS.DISCOUNT, 'Discount', () => {
      const nextMode = viewMode === 'discounts' ? 'denominations' : 'discounts';
      setViewMode(nextMode);

      // Lazily fetch discounts only when opening discount view and not yet loaded
      if (nextMode === 'discounts' && allDiscounts.length === 0) {
        const fetchDiscountsNow = async () => {
          try {
            setDiscountsLoading(true);
            const { getDiscounts } = await import('../services/apicall');
            const response = await getDiscounts();
            const discountsData = Array.isArray(response) ? response : (response?.data || []);
            const activeDiscounts = discountsData.filter(d =>
              (d.isactive === true || d.isActive === true || d.status === 1) &&
              (parseFloat(d.discountPercentage) > 0)
            );
            setAllDiscounts(activeDiscounts);
          } catch (error) {
            console.error('Failed to fetch discounts:', error);
          } finally {
            setDiscountsLoading(false);
          }
        };
        fetchDiscountsNow();
      }
    });
  };

  const handleClearDiscount = () => {
    if (selectedSidebarCategory !== null) {
      setCategoryDiscounts(prev => {
        const updated = { ...prev };
        delete updated[selectedSidebarCategory];
        return updated;
      });
      showToast(`Cleared discount for category`, 'info');
    } else {
      handleApplyDiscount(null);
      showToast(`Cleared bill discount`, 'info');
    }
  };

  const handleSplitOrder = () => {
    setShowMultiPayModal(true);
  };

  const callSupport = () => {
    const whatsappUrl = 'https://wa.me/919686067462';
    window.open(whatsappUrl, '_blank');
  };

  const handleDayClose = () => {
    setShowDayClosePopup(true);
  };

  const confirmDayClose = () => {
    setShowDayClosePopup(false);
    // Logout logic
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    sessionStorage.clear();
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1000);
  };

  const cancelDayClose = () => {
    setShowDayClosePopup(false);
  };

  return (
    <>
      {toast.show && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-lg shadow-lg transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' :
          toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>
          <span className="font-medium text-sm">{toast.message}</span>
        </div>
      )}

      {confirmDialog.show && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-black">
            <h3 className="text-lg font-bold mb-3">{confirmDialog.title}</h3>
            <p className="text-sm border-b pb-4 mb-4 whitespace-pre-line">{confirmDialog.message}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={confirmDialog.onCancel} className="px-5 py-2.5 bg-gray-200 rounded font-bold">CANCEL</button>
              <button onClick={confirmDialog.onConfirm} className="px-5 py-2.5 bg-red-600 text-white rounded font-bold">CONFIRM</button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 font-sans transition-opacity duration-300">
        <div
          className={`w-[90%] max-w-[1280px] h-[85vh] bg-[#f8f9fa] rounded-2xl shadow-2xl flex overflow-hidden transform transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main Split Layout */}
          <div className="flex-1 flex overflow-hidden">

            {/* Left Sidebar: Summary & Total Breakdown */}
            <div className="w-[30%] max-w-[400px] bg-white border-r flex flex-col shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Summary</h2>
                <div className="text-sm font-bold text-red-500">
                  Bill No: <span className="text-red-500">{billNumber || '-'}</span>
                </div>
              </div>

              {/* Scrollable Item List */}
              <div className="flex-1 overflow-y-auto">
                <div className="divide-y">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="p-2 flex items-center hover:bg-gray-50 transition-colors text-xs border-b">
                      <div className="flex-1 text-gray-900 font-medium truncate pr-2" title={item.name}>{item.name}</div>
                      <div className="w-12 text-center text-gray-900 text-xs font-medium">{item.quantity}</div>
                      <div className="w-20 text-right text-gray-900 text-xs font-medium">
                        {(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar Footer: Detailed breakdown */}
              <div className="p-2 bg-gray-50 border-t space-y-1">
                <div className="space-y-1 text-sm font-bold text-gray-600">
                  <div className="flex justify-between">
                    <span>Gross Total</span>
                    <span>{totals.subTotal.toFixed(2)}</span>
                  </div>

                  {totals.itemDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-red-600">
                        <span>Discount {selectedDiscount?.discountPercentage ? `(${selectedDiscount.discountPercentage}%)` : ''}</span>
                        <span>-{totals.itemDiscount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-200">
                        <span>After Discount</span>
                        <span>{(totals.subTotal - totals.itemDiscount).toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {Object.entries(totals.taxBreakdown).map(([key, val]) => (
                    <div key={key} className="flex justify-between">
                      <span className="uppercase">{key}</span>
                      <span>{val.amount.toFixed(2)}</span>
                    </div>
                  ))}

                  {totals.serviceCharge > 0 && (
                    <div className="flex justify-between">
                      <span>Service Charge</span>
                      <span>{totals.serviceCharge.toFixed(2)}</span>
                    </div>
                  )}

                  {Math.abs(totals.roundOff) !== 0 && (
                    <div className="flex justify-between">
                      <span>Round Off</span>
                      <span>{totals.roundOff.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#2a6d8d] pt-1 mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Grand Total</span>
                    <span className="text-2xl font-bold text-Black-800 ">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Details in Sidebar */}
                {parseFloat(enteredAmount) > 0 && (
                  <div className="mt-1 space-y-1 border-t pt-1">
                    <div className="flex justify-between text-sm font-bold text-gray-600">
                      <span className="uppercase text-xs">Tendered</span>
                      <span className="text-[#2a6d8d] font-black text-sm">₹{parseFloat(enteredAmount).toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className={`text-[10px] font-bold uppercase ${parseFloat(enteredAmount) >= totals.grandTotal ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(enteredAmount) >= totals.grandTotal ? 'Change To Return' : 'Balance To Pay'}
                      </span>
                      <span className={`text-lg font-black ${parseFloat(enteredAmount) >= totals.grandTotal ? 'text-green-600' : 'text-red-600'}`}>
                        ₹{Math.abs(totals.grandTotal - parseFloat(enteredAmount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {!enteredAmount && (
                  <div className="mt-1 pt-1 border-t flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-red-600">Balance To Pay</span>
                    <span className="text-lg font-black text-red-600">₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Content Area */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">

              {/* Header Tabs */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4 text-sm font-semibold">
                  <button
                    onClick={() => setViewMode('denominations')}
                    className={`px-3 py-1 rounded transition-colors font-bold ${viewMode === 'denominations' ? 'bg-[#d1f2f2] text-gray-900' : 'text-gray-900 hover:text-black'}`}
                  >
                    Tender
                  </button>
                  <div className="w-[1px] h-4 bg-gray-300"></div>
                  <button
                    onClick={handleDiscountToggle}
                    className={`px-3 py-1 rounded transition-colors font-bold ${viewMode === 'discounts' ? 'bg-[#d1f2f2] text-gray-900' : 'text-gray-900 hover:text-black'}`}
                  >
                    Discount
                  </button>
                  <div className="w-[1px] h-4 bg-gray-300"></div>
                  <button
                    onClick={handleClearDiscount}
                    className="px-3 py-1 text-gray-900 hover:text-black transition-colors font-bold"
                  >
                    Clear Discount
                  </button>
                  <div className="w-[1px] h-4 bg-gray-300"></div>
                  <button
                    onClick={handleNC}
                    className="px-3 py-1 text-gray-900 hover:text-black transition-colors font-bold"
                  >
                    NC
                  </button>
                  <div className="w-[1px] h-4 bg-gray-300"></div>
                  <button
                    onClick={handleOrderCancel}
                    className="px-3 py-1 text-gray-900 hover:text-black transition-colors font-bold"
                  >
                    Order Cancel
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1">
                {viewMode === 'denominations' ? (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                    {/* Tender Tab: Amount Display */}
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-gray-800">Amount</h2>
                      <div className="bg-white border rounded-xl p-4 shadow-sm flex items-center justify-center gap-8">
                        <div className="text-lg font-bold text-gray-800 border-r pr-8">
                          Total Due: <span className="text-[#2a6d8d]">{totals.grandTotal.toFixed(2)}</span>
                        </div>
                        <div className="text-lg font-bold text-gray-800">
                          Tendered: <span className="text-[#2a6d8d]">{enteredAmount || '0.00'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                      {/* Numpad row with vertical dividers */}
                      <div className="flex border-b">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num, i) => (
                          <button
                            key={num}
                            onClick={() => handleNumpadClick(num.toString())}
                            className={`flex-1 h-12 flex items-center justify-center text-2xl font-bold text-gray-800 hover:bg-gray-100 transition-colors ${i !== 9 ? 'border-r' : ''}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>

                      {/* Action row: Exact Amount, Backspace, Denominations */}
                      <div className="flex items-center justify-between px-6 py-4">
                        <button
                          onClick={() => setEnteredAmount(totals.grandTotal.toString())}
                          className="text-lg font-medium text-gray-800 hover:text-[#2a6d8d] transition-colors"
                        >
                          Exact Amount
                        </button>

                        <button onClick={handleBackspace} className="text-gray-800 hover:text-red-500 transition-colors">
                          <X className="w-7 h-7" />
                        </button>

                        <div className="flex gap-8 font-bold text-[#2a6d8d] text-lg">
                          <button onClick={() => handleDenominationClick(50)} className="underline underline-offset-4 decoration-1">₹50</button>
                          <button onClick={() => handleDenominationClick(100)} className="underline underline-offset-4 decoration-1">₹100</button>
                          <button onClick={() => handleDenominationClick(500)} className="underline underline-offset-4 decoration-1">₹500</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Discount Tab */}
                    <div className="space-y-2">
                      <h2 className="text-lg font-bold text-gray-800">Discount Selection</h2>
                      <div className="bg-white border rounded-xl p-4 shadow-sm">
                        <div className="flex flex-wrap gap-2 mb-4">
                          {allDiscounts.map(disc => (
                            <button
                              key={disc.discountId}
                              onClick={() => handleApplyDiscount(disc)}
                              className="w-24 h-24 bg-[#d1f2f2] border-2 border-[#b5e6e6] rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-[#b5e6e6] transition-all p-2 text-center"
                            >
                              <span className="text-sm font-black text-gray-900 leading-tight line-clamp-3">
                                {disc.discountName || disc.discountCategory || `${disc.discountPercentage}%`}
                              </span>
                            </button>
                          ))}
                          {/* <button className="w-40 h-24 bg-[#d1f2f2] border-2 border-gray-400 rounded-lg flex flex-col items-center justify-center p-2 text-center leading-tight hover:bg-[#b5e6e6] transition-all">
                            <span className="text-xs font-black text-gray-900">Customised Discount</span>
                          </button> */}
                        </div>

                        {/* <div className="flex items-center justify-end gap-3 pr-2 border-t pt-2">
                          <label className="text-xs font-bold text-gray-800">Custom % Value:</label>
                          <input
                            type="text"
                            className="w-24 p-1 border-2 rounded-lg text-right font-bold text-base"
                          />
                          <button className="px-4 py-1 bg-[#d1f2f2] border-gray-400 border text-gray-900 font-bold rounded shadow-sm hover:bg-[#b5e6e6] transition-colors text-sm">
                            Apply
                          </button>
                        </div> */}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Methods Section (Always Visible) */}
                <div className="mt-8 space-y-3">
                  <h2 className="text-lg font-bold text-gray-800">Payment Methods</h2>
                  <div className="grid grid-cols-5 gap-2">
                    <button
                      onClick={() => handlePaymentModeSelect({ code: 'Cash' })}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Cash
                    </button>
                    <button
                      onClick={() => handlePaymentModeSelect({ code: 'Card' })}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center gap-2 text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Card <FaCreditCard className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handlePaymentModeSelect({ code: 'UPI' })}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      <span className="text-xl italic font-black text-gray-900">UPI<span className="text-orange-500">▶</span></span>
                    </button>
                    <button
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Others
                    </button>
                    <button
                      onClick={handleSplitOrder}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Split
                    </button>

                    <button
                      onClick={handleCheck}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center gap-2 text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Check Print <span className="text-xl">🖨️</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="h-16 bg-[#d1f2f2] rounded-xl flex items-center justify-center text-base font-bold text-gray-900 shadow-sm hover:bg-[#b5e6e6] transition-all"
                    >
                      Back to Menu
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <OrderCancelModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onSubmit={handleCancelSubmit}
        billNumber={billNumber}
        totalAmount={totals.grandTotal}
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
      <SettingsSidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        handleDayClose={handleDayClose}
      />

      <DayClosePopup
        isOpen={showDayClosePopup}
        onConfirm={confirmDayClose}
        onCancel={cancelDayClose}
      />
    </>
  );
};

export default PaymentModal;