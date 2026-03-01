import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Menu from '../components/Menu';
import Cart from '../components/Cart';
import SettingsSidebar from '../components/SettingsSidebar';
import PaymentModal from '../components/PaymentModal';
import DayClosePopup from '../components/DayClosePopup';
import { getSalesDate, getKotRedirectUrl, getItems } from '../services/apicall';

export default function RestaurantBilling() {
  const navigate = useNavigate();
  const location = useLocation();

  const hasLoadedItems = useRef(false);

  const [selectedTable, setSelectedTable] = useState(null);
  const [numPersons, setNumPersons] = useState(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [sentItems, setSentItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [billNo, setBillNo] = useState('');
  const [kotCode, setKotCode] = useState('');
  const [total, setTotal] = useState(0);
  const [notifications, setNotifications] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('Take Away');
  const [existingOrderId, setExistingOrderId] = useState(null);
  const [discount, setDiscount] = useState(0);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDayClosePopup, setShowDayClosePopup] = useState(false);

  const [salesDate, setSalesDate] = useState('');
  const [salesDateISO, setSalesDateISO] = useState('');
  const [nextBillId, setNextBillId] = useState('');
  const [nextOrderId, setNextOrderId] = useState('');

  const userName = localStorage.getItem('userName') || 'User';

  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleDayClose = () => {
    setShowDayClosePopup(true);
  };

  const confirmDayClose = () => {
    setShowDayClosePopup(false);
    handleLogout();
  };

  const cancelDayClose = () => {
    setShowDayClosePopup(false);
  };

  // ✅ Enrichment helper for RestaurantBilling
  const enrichItemsWithData = async (cartItems) => {
    try {
      if (!cartItems || cartItems.length === 0) return cartItems;

      console.log('🔍 Enriching items with master data (categories, etc)...');
      const itemsResponse = await getItems();
      const allItems = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse?.data || [];

      const enrichedItems = cartItems.map(cartItem => {
        const fullItemData = allItems.find(item =>
          (item.itemId || item.id) === cartItem.itemId
        );

        if (fullItemData) {
          return {
            ...cartItem,
            TaxItems: fullItemData.TaxItems || cartItem.TaxItems || [],
            TransactionItems: fullItemData.TransactionItems || cartItem.TransactionItems || [],
            SectionItemRates: fullItemData.SectionItemRates || cartItem.SectionItemRates || [],
            categoryId: fullItemData.categoryId || cartItem.categoryId || 0,
            subcategoryId: fullItemData.subcategoryId || cartItem.subcategoryId || 0,
            categoryName: fullItemData.categoryName || cartItem.categoryName || '',
            subcategoryName: fullItemData.subcategoryName || cartItem.subcategoryName || '',
            barCode: fullItemData.barCode || cartItem.barCode || '',
            hsnCode: fullItemData.hsnCode || cartItem.hsnCode || ''
          };
        }
        return cartItem;
      });

      console.log('✅ Items enriched');
      return enrichedItems;
    } catch (error) {
      console.error("❌ Failed to enrich items:", error);
      return cartItems;
    }
  };

  useEffect(() => {
    const fetchSalesDate = async () => {
      try {
        const response = await getSalesDate();
        if (response.success && response.data) {
          setSalesDateISO(response.data.saleDate);

          const date = new Date(response.data.saleDate);
          const formattedDate = date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          setSalesDate(formattedDate);
          setNextBillId(response.data.nextBillId);
          setNextOrderId(response.data.nextOrderId);
          setBillNo(response.data.nextBillId || 'B0000');

          localStorage.setItem('salesDate', response.data.saleDate);
          localStorage.setItem('salesDateFormatted', formattedDate);

          console.log("✅ Sales Date set:", formattedDate, "ISO:", response.data.saleDate);
          console.log("✅ Bill Number set:", response.data.nextBillId);
        } else {
          console.error("❌ Failed to fetch sales date - API returned no data");
          showToast("Failed to fetch sales date. Please contact support.", "error");
        }
      } catch (error) {
        console.error("❌ Error fetching sales date:", error);
        showToast("Failed to fetch sales date from server. Please contact support.", "error");
      }
    };

    fetchSalesDate();
  }, []);

  useEffect(() => {
    hasLoadedItems.current = false;

    if (location.state && location.state !== null) {
      const { table, numPersons, orderId, items, existingOrder, autoOpenPayment, discount: receivedDiscount } = location.state;

      if (table) {
        setSelectedTable(table);
        setActiveTab('Dine In');
      } else {
        setSelectedTable(null);
        setNumPersons(null);
        setActiveTab('Take Away');
      }

      if (numPersons) setNumPersons(numPersons);
      else setNumPersons(null);

      if (orderId && orderId !== 0) {
        setExistingOrderId(orderId);
      } else {
        setExistingOrderId(null);
      }

      if (receivedDiscount !== undefined) {
        setDiscount(receivedDiscount);
      } else {
        setDiscount(0);
      }

      if (items && Array.isArray(items) && items.length > 0) {
        const groupedMap = new Map();

        items.forEach((item) => {
          const itemId = item.itemId || item.id || 0;
          const variantId = item.variantId || 0;
          const description = (item.description || item.addDetails || '').trim();
          const isComplimentary = item.isComplimentary || item.is_complimentary || false;
          // Group by ID, Variant, Description AND Complimentary status
          const key = `${itemId}_${variantId}_${description}_${isComplimentary}`.toLowerCase();

          const qty = parseFloat(item.quantity || item.itemQty || 0);
          const discount = parseFloat(item.discount || item.itemDisc || 0);
          const discType = item.discType || item.DiscType || 'None';

          if (groupedMap.has(key)) {
            const existing = groupedMap.get(key);
            existing.quantity += qty;
          } else {
            groupedMap.set(key, {
              ...item,
              quantity: qty,
              isComplimentary: isComplimentary // Ensure this flag is preserved
            });
          }
        });

        const transformedItems = Array.from(groupedMap.values())
          .filter(item => item.quantity > 0)
          .map((item, index) => {
            const itemId = item.itemId || item.id || index;
            const variantId = item.variantId || 0;
            // Use existing ID if it looks unique/formatted, otherwise generate a unique one
            const id = (item.id && String(item.id).includes('_'))
              ? item.id
              : `${itemId}_${variantId}_${index}`;

            return {
              id: id,
              itemId: itemId,
              name: (item.name || item.itemname || 'Unknown Item') + (item.isComplimentary ? ' (Complimentary)' : ''),
              price: parseFloat(item.price || item.itemPrice || 0),
              quantity: item.quantity,
              discount: parseFloat(item.discount || item.itemDisc || 0),
              discType: item.discType || item.DiscType || 'None',
              description: item.description || item.addDetails || '',
              variantId: variantId,
              variantName: item.variantName || '',
              modifierItem: item.modifierItem || 0,
              isVoided: false,
              voidReason: '',
              TaxItems: item.TaxItems || [],
              categoryId: item.categoryId || item.subcategoryId || 0,
              subcategoryId: item.subcategoryId || item.SubcategoryId || 0,
            };
          });

        // ✅ Enrich with master data
        (async () => {
          const enriched = await enrichItemsWithData(transformedItems);
          setSelectedItems(enriched);
        })();

        if (existingOrder && orderId && orderId !== 0) {
          const itemKeys = transformedItems.map(item =>
            `${item.id || item.itemId}_${item.variantId}_${item.description}`.toLowerCase()
          );
          setSentItems(itemKeys);
        } else {
          setSentItems([]);
        }

        if (autoOpenPayment) {
          setTimeout(() => setShowPaymentModal(true), 300);
        }

      } else {
        setSelectedItems([]);
        setSentItems([]);
      }

    } else {
      setSelectedTable(null);
      setNumPersons(null);
      setActiveTab('Take Away');
      setExistingOrderId(null);
      setSelectedItems([]);
      setSentItems([]);
    }

    if (!location.state?.discount) {
      setDiscount(0);
    }

    hasLoadedItems.current = true;
  }, [location.state, location.pathname, location.key]);

  useEffect(() => {
    setKotCode(`KOT${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
  }, []);

  useEffect(() => {
    const sum = selectedItems
      .filter(item => !item.isVoided)
      .reduce((acc, i) => {
        return acc + (i.price * i.quantity);
      }, 0);
    setTotal(sum);
  }, [selectedItems]);

  const addToCart = (item) => {
    console.log("🛒 addToCart called with:", item);
    console.log("🔍 Item has TaxItems?", item.TaxItems);

    const itemId = item.itemId || item.id;
    const variantId = item.variantId || 0;
    const variantName = item.variantName || '';
    const itemName = item.itemName || item.name || 'Unknown Item';
    const itemPrice = parseFloat(item.salePrice || item.price || 0);

    const uniqueKey = `${itemId}_${variantId}`;

    // ✅ Check if this item exists AND is not already sent
    const existingIndex = selectedItems.findIndex(cartItem => {
      const cartKey = `${cartItem.itemId}_${cartItem.variantId || 0}`;
      const itemKey = `${cartItem.id || cartItem.itemId}_${cartItem.variantId || 0}_${cartItem.description || ''}`.toLowerCase();
      const isAlreadySent = sentItems.some(sentKey => sentKey.toLowerCase() === itemKey);

      return cartKey === uniqueKey && !cartItem.isVoided && !isAlreadySent;
    });

    const quantityToAdd = parseFloat(item.quantity || 1);

    if (existingIndex !== -1) {
      // Item exists and is not sent - update quantity
      updateQuantity(selectedItems[existingIndex].id, selectedItems[existingIndex].quantity + quantityToAdd);
      console.log("✅ Updated quantity of existing unsent item");
    } else {
      // Item doesn't exist OR is already sent - create new entry
      const cartItem = {
        id: `${itemId}_${variantId}_${Date.now()}`,
        itemId: itemId,
        name: itemName,
        price: itemPrice,
        quantity: quantityToAdd,
        discount: 0,
        discType: 'None',
        description: '',
        variantId: variantId,
        variantName: variantName,
        modifierItem: item.modifierItem || 0,
        sectionId: item.sectionId,
        sectionName: item.sectionName,
        isVoided: false,
        voidReason: '',
        isComplimentary: item.isComplimentary || false,
        complimentaryReason: item.complimentaryReason || '',
        TaxItems: item.TaxItems || [],
        TransactionItems: item.TransactionItems || [],
        SectionItemRates: item.SectionItemRates || [],
        openItemid: item.openItemid || 0,
        categoryId: item.categoryId,
        subcategoryId: item.subcategoryId,
        unitId: item.unitId,
        categoryName: item.categoryName,
        subcategoryName: item.subcategoryName,
        barCode: item.barCode,
        hsnCode: item.hsnCode,
        isActive: item.isActive
      };

      console.log("✅ Cart item created with TaxItems:", cartItem.TaxItems);
      console.log("📝 Item was", existingIndex === -1 ? "not found" : "already sent - creating new entry");

      setSelectedItems(prev => [...prev, cartItem]);
    }

    // ✅ Automatically clear search after adding to cart
    setSearchQuery('');
  };


  const updateQuantity = (id, qty) => {
    if (qty <= 0) removeFromCart(id);
    else setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const removeFromCart = (id) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };

  const createNewOrder = () => {
    setSelectedItems([]);
    setSentItems([]);
    setSelectedTable(null);
    setNumPersons(null);
    setExistingOrderId(null);
    setDiscount(0);
    hasLoadedItems.current = false;
    setActiveTab('Take Away');
    setKotCode(`KOT${(Math.random() * 1000 | 0).toString().padStart(3, '0')}`);
    showToast('New order started successfully', 'success');
  };

  const handleCallSupport = () => {
    showToast('Support: 9686067462', 'info');
  };

  const handleNotifications = () => setShowNotifications(!showNotifications);
  const handleSettings = () => setShowSettings(!showSettings);

  const handleTables = () => {
    navigate('/tables');
  };

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    sessionStorage.clear();

    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1000);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
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

      <Header
        createNewOrder={createNewOrder}
        billNo={billNo}
        setBillNo={setBillNo}
        kotCode={kotCode}
        setKotCode={setKotCode}
        selectedTable={selectedTable}
        handleCallSupport={handleCallSupport}
        handleNotifications={handleNotifications}
        handleSettings={handleSettings}
        handleLogout={handleLogout}
        notifications={notifications}
        handleTables={handleTables}
        handleDayClose={handleDayClose}
        salesDate={salesDate}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          selectedSubCategory={selectedSubCategory}
          setSelectedSubCategory={setSelectedSubCategory}
        />

        <div className="flex-1 flex overflow-x-auto overflow-y-hidden">
          <Menu
            selectedSubCategory={selectedSubCategory}
            setSelectedSubCategory={setSelectedSubCategory}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            addToCart={addToCart}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTable={selectedTable}
            numPersons={numPersons}
          />

          <Cart
            selectedItems={selectedItems}
            setSelectedItems={setSelectedItems}
            addToCart={addToCart}
            updateQuantity={updateQuantity}
            removeFromCart={removeFromCart}
            total={total}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedTable={selectedTable}
            setSelectedTable={setSelectedTable}
            numPersons={numPersons}
            setNumPersons={setNumPersons}
            existingOrderId={existingOrderId}
            setExistingOrderId={setExistingOrderId}
            billNo={billNo}
            kotCode={kotCode}
            sentItems={sentItems}
            setSentItems={setSentItems}
            salesDateISO={salesDateISO}
            discount={discount}
            setDiscount={setDiscount}
          />
        </div>
      </div>

      {/* ✅ UPDATED FOOTER - Shows existing order ID when editing, otherwise shows next order ID */}
      <div
        className="bg-black py-0.5 px-3 flex items-center justify-between"
        style={{
          fontSize: '10px',
          fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          fontWeight: 400,
          color: '#ffffff'
        }}
      >
        <div className="flex items-center gap-2">
          <span>Bill Id: {nextBillId}</span>
          <span>|</span>
          <span>Order Id: {existingOrderId || nextOrderId}</span>
          <span>|</span>
          <span>User: {userName}</span>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.9)' }}>
          BillZen Technologies Pvt. Ltd. | www.billzen.in | contact@billzen.in
        </div>
      </div>


      <SettingsSidebar
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        handleDayClose={handleDayClose}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={total}
        selectedItems={selectedItems.filter(item => !item.isVoided)}
        selectedTable={selectedTable}
        billNumber={billNo}
        kotNumber={kotCode}
        existingOrderId={existingOrderId}
        activeTab={activeTab}
        salesDateISO={salesDateISO}
        discount={discount}
        setDiscount={setDiscount}
        onPaymentComplete={() => {
          setSelectedItems([]);
          setSentItems([]);
          setExistingOrderId(null);
          setDiscount(0);
          setSelectedTable(null);
          setNumPersons(null);
          setActiveTab('Take Away');
          navigate(getKotRedirectUrl());
        }}
      />

      <DayClosePopup
        isOpen={showDayClosePopup}
        onConfirm={confirmDayClose}
        onCancel={cancelDayClose}
      />

    </div>
  );
}