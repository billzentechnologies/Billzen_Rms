import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import SettingsSidebar from '../components/SettingsSidebar';
import DayClosePopup from '../components/DayClosePopup';
import { getTables, getOrderDetails, getTableChildren, getItems } from '../services/apicall';

const PaxNumberPad = ({ onClose, onConfirm }) => {
  const [value, setValue] = useState('');

  const handleKeyPress = (key) => {
    if (key === 'esc') {
      onClose();
    } else if (key === 'enter') {
      if (value && !isNaN(value) && parseInt(value) > 0) {
        onConfirm(value);
      } else {
        alert('Please enter a valid number');
      }
    } else if (key === 'clear') {
      setValue('');
    } else {
      setValue((prev) => prev + key);
    }
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '0', '.', 'clear',
    'esc', 'enter',
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      <input
        className="col-span-3 border p-2 text-center font-semibold text-lg"
        value={value}
        readOnly
      />
      {keys.map((key, i) => (
        <button
          key={i}
          className={`p-2 rounded text-sm font-medium border ${key === 'enter'
            ? 'col-span-3 bg-green-500 text-white'
            : key === 'esc'
              ? 'bg-gray-300'
              : key === 'clear'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100'
            }`}
          onClick={() => handleKeyPress(key)}
        >
          {key === 'clear' ? '⌫' : key.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

const CustomAlert = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <div className="mb-4 text-gray-800">{message}</div>
        <button
          onClick={onClose}
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
        >
          OK
        </button>
      </div>
    </div>
  );
};

const TablePage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [tablesData, setTablesData] = useState([]);
  const [allTablesData, setAllTablesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('All');
  const [showPaxModal, setShowPaxModal] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDayClosePopup, setShowDayClosePopup] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showChildrenModal, setShowChildrenModal] = useState(false);
  const [tableChildren, setTableChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  const [isAddChairMode, setIsAddChairMode] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(false);

  const hasInitiallyFetched = useRef(false);

  // ✅ Helper function to enrich cart items with tax data from getItems API
  const enrichItemsWithTaxData = async (cartItems) => {
    try {
      console.log('🔍 Enriching items with tax data...');
      const itemsResponse = await getItems();
      const allItems = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse?.data || [];

      const enrichedItems = cartItems.map(cartItem => {
        const fullItemData = allItems.find(item =>
          (item.itemId || item.id) === cartItem.itemId
        );

        if (fullItemData) {
          console.log(`✅ Found tax data for ${cartItem.name}:`, fullItemData.TaxItems);
          return {
            ...cartItem,
            TaxItems: fullItemData.TaxItems || cartItem.TaxItems || [],
            TransactionItems: fullItemData.TransactionItems || cartItem.TransactionItems || [],
            SectionItemRates: fullItemData.SectionItemRates || cartItem.SectionItemRates || []
          };
        }

        console.warn(`⚠️ No tax data found for item ${cartItem.name} (ID: ${cartItem.itemId})`);
        return cartItem;
      });

      console.log('✅ Items enriched with tax data');
      return enrichedItems;
    } catch (error) {
      console.error("❌ Failed to enrich items with tax data:", error);
      return cartItems;
    }
  };

  useEffect(() => {
    const isRefresh = location.state?.refresh;

    if (!hasInitiallyFetched.current || isRefresh) {
      console.log(isRefresh ? '🔄 Refreshing tables due to refresh flag' : '🚀 Initial mount - fetching tables');
      fetchTables();
      hasInitiallyFetched.current = true;

      if (isRefresh) {
        // Clear refresh state to prevent repeated refreshes
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state?.refresh]);

  const showAlert = (message) => {
    setAlertMessage(message);
  };

  const closeAlert = () => {
    setAlertMessage('');
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching tables from API...');
      const response = await getTables();

      console.log('📦 Raw API Response:', response);

      let tablesArray = [];
      if (Array.isArray(response)) {
        tablesArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        tablesArray = response.data;
      } else if (response?.tables && Array.isArray(response.tables)) {
        tablesArray = response.tables;
      } else {
        console.error('❌ Unexpected response structure:', response);
        throw new Error('Unable to parse tables from API response');
      }

      console.log('📊 Tables Array Length:', tablesArray.length);

      const usedIds = new Set();
      let duplicateCounter = 0;

      const tablesWithOrders = tablesArray.filter((table) => {
        const isChild = Boolean(table.isChild || table.ischild || false);
        const hasOrder = Boolean(table.OrderId || table.orderId);

        if (isChild && !hasOrder) {
          console.log(`🚫 Filtering out child table without order:`, table);
          return false;
        }
        return true;
      });

      console.log(`📊 Filtered ${tablesArray.length - tablesWithOrders.length} children without orders`);

      // ✅ DEDUPLICATE: Ensure we only process each physical table/chair once
      const uniqueTablesMap = new Map();
      tablesWithOrders.forEach(table => {
        const id = table.Id || table.id || `temp-${Math.random()}`;
        const isChild = Boolean(table.isChild || table.ischild || false);
        const childCode = table.childTableCode || table.childtablecode || '';

        // Generate a unique key that accounts for split tables (chairs)
        const uniqueKey = isChild ? `${id}_child_${childCode}` : `${id}_parent`;

        // Prefer occupied tables or tables with orders if duplicates exist
        if (!uniqueTablesMap.has(uniqueKey)) {
          uniqueTablesMap.set(uniqueKey, table);
        } else {
          const existing = uniqueTablesMap.get(uniqueKey);
          const hasOrder = table.OrderId || table.orderId;
          const existingHasOrder = existing.OrderId || existing.orderId;
          if (hasOrder && !existingHasOrder) {
            uniqueTablesMap.set(uniqueKey, table);
          }
        }
      });

      const uniqueTablesArray = Array.from(uniqueTablesMap.values());

      const allProcessedTables = uniqueTablesArray.map((table, index) => {
        const orderStatus = table.OrderStatus || table.orderStatus || '';

        let status = 'Available';
        if (orderStatus === 'RO') {
          status = 'Occupied';
        } else if (orderStatus === 'CP') {
          status = 'CheckPrinted';
        }

        const tableId = Number(table.Id || table.id || 0);
        const parentId = table.parentTableId || table.parenttableid;
        const normalizedParentId = parentId ? Number(parentId) : null;
        const isChild = Boolean(table.isChild || table.ischild || false);
        const childCode = table.childTableCode || table.childtablecode || null;

        let uniqueTableId;
        if (isChild && normalizedParentId && childCode) {
          uniqueTableId = `${normalizedParentId}-${childCode}`;
        } else if (isChild && normalizedParentId) {
          uniqueTableId = `${normalizedParentId}-child${index}`;
        } else {
          uniqueTableId = String(tableId);
        }

        let finalId = uniqueTableId;
        while (usedIds.has(finalId)) {
          duplicateCounter++;
          finalId = `${uniqueTableId}-dup${duplicateCounter}`;
          console.warn(`⚠️ Duplicate ID ${uniqueTableId} detected, using ${finalId}`);
        }
        usedIds.add(finalId);

        return {
          tableId: finalId,
          Id: tableId,
          name: table.Table || table.table || `T${tableId}`,
          sectionId: Number(table.SectionId || table.sectionId || 1),
          Section_name: table.Section || table.section || 'Main Hall',
          status: status,
          orderId: Number(table.OrderId || table.orderId || 0),
          orderStatus: orderStatus || null,
          pax: Number(table.pax || table.PAX || 0),
          isChild: isChild,
          parentTableId: normalizedParentId,
          childTableCode: childCode,
          tableCode: String(table.tableCode || table.tablecode || table.Table || table.table || tableId),
          TableTotal: Number(table.TableTotal || table.tableTotal || 0),
          ...table,
        };
      });

      const parentIdsFromChildren = new Set();
      allProcessedTables.forEach((table) => {
        if (table.isChild && table.parentTableId !== null) {
          parentIdsFromChildren.add(Number(table.parentTableId));
        }
      });

      const missingParents = [];
      parentIdsFromChildren.forEach((parentId) => {
        const numericParentId = Number(parentId);

        const parentExists = allProcessedTables.some(
          (t) => !t.isChild && Number(t.Id) === numericParentId
        );

        if (!parentExists) {
          const childExample = allProcessedTables.find(
            (t) => t.isChild && Number(t.parentTableId) === numericParentId
          );

          if (childExample) {
            console.log(`📝 Creating missing parent table ${numericParentId}`);

            const parentTableId = String(numericParentId);

            let finalParentId = parentTableId;
            while (usedIds.has(finalParentId)) {
              duplicateCounter++;
              finalParentId = `${parentTableId}-parent${duplicateCounter}`;
            }
            usedIds.add(finalParentId);

            const childTableCode = childExample.tableCode || childExample.Table || '';
            const baseTableName = childTableCode.split('-')[0] || `${numericParentId}`;

            missingParents.push({
              tableId: finalParentId,
              Id: numericParentId,
              name: baseTableName,
              Table: baseTableName,
              sectionId: childExample.sectionId,
              Section_name: childExample.Section_name,
              status: 'Occupied',
              orderId: 0,
              orderStatus: 'RO',
              pax: 0,
              isChild: false,
              parentTableId: null,
              childTableCode: null,
              tableCode: baseTableName,
              TableTotal: 0,
            });
          }
        }
      });

      const allTablesWithParents = [...allProcessedTables, ...missingParents];

      const parentTables = allTablesWithParents.filter((table) => {
        return !table.isChild;
      });

      // ✅ SORT TABLES BY NAME (NUMERIC) TO MAINTAIN CONSISTENT ORDER WITH SPLITS
      const sortedParentTables = parentTables.sort((a, b) => {
        const aName = String(a.name || '');
        const bName = String(b.name || '');

        const aNum = parseInt(aName) || 0;
        const bNum = parseInt(bName) || 0;

        if (aNum !== bNum) {
          return aNum - bNum;
        }

        // If base numbers are equal (e.g., 12 and 12/2), sort by the full string
        return aName.localeCompare(bName, undefined, { numeric: true });
      });

      setAllTablesData(allTablesWithParents);

      console.log('✅ Tables with orders:', tablesWithOrders.length);
      console.log('✅ Missing parents added:', missingParents.length);
      console.log('✅ Final unique tables:', allTablesWithParents.length);
      console.log('✅ Parent tables:', sortedParentTables.length);

      if (duplicateCounter > 0) {
        console.warn(`⚠️ Total duplicates resolved: ${duplicateCounter}`);
      }

      setTablesData(sortedParentTables);
    } catch (err) {
      console.error('❌ Failed to fetch tables:', err);
      setError(`Failed to load tables: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSettings = () => {
    console.log('TablePage: handleSettings called');
    setShowSettings(!showSettings);
  };

  const handleDayClose = () => {
    console.log('TablePage: handleDayClose called - showing popup');
    setShowDayClosePopup(true);
  };

  const confirmDayClose = () => {
    console.log('TablePage: Day close confirmed - logging out');
    setShowDayClosePopup(false);
    handleLogout();
  };

  const cancelDayClose = () => {
    console.log('TablePage: Day close cancelled');
    setShowDayClosePopup(false);
  };

  const handleLogout = () => {
    console.log('TablePage: handleLogout called');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    sessionStorage.clear();

    showAlert('You have been logged out successfully.');
    setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

  const handleTableClick = async (table) => {
    console.log('🖱️ Table clicked:', table);

    if (isSplitMode) {
      console.log('✂️ Split mode active');

      if (table.status !== 'Occupied' && table.status !== 'CheckPrinted') {
        showAlert('Split is only available for occupied tables with running orders.');
        return;
      }

      console.log('✅ Table is occupied - navigating to Split page');
      setIsSplitMode(false);
      navigate('/tables/split', { state: { table: table } });
      return;
    }

    if (isAddChairMode) {
      console.log('🪑 Add Chair mode active');

      if (table.status !== 'Occupied' && table.status !== 'CheckPrinted') {
        showAlert('Add Chair is only available for occupied tables with running orders.');
        return;
      }

      console.log('✅ Table is occupied - navigating to AddChair page');
      setIsAddChairMode(false);
      navigate('/tables/addchair', { state: { table: table } });
      return;
    }

    setSelectedTable(table);

    const clickedTableId = table.tableId || table.Id || table.id;
    console.log('🔍 Looking for children of table ID:', clickedTableId);

    try {
      setLoadingChildren(true);
      const childrenData = await getTableChildren(table.tableId);
      console.log('📡 API children response:', childrenData);

      if (childrenData?.children && childrenData.children.length > 0) {
        const chairsWithOrders = childrenData.children.filter(child =>
          child.orderId && child.orderId > 0
        );

        console.log(`🪑 Found ${chairsWithOrders.length} chairs with orders (filtered from ${childrenData.children.length} total)`);

        if (chairsWithOrders.length > 0) {
          setTableChildren(chairsWithOrders);
          setShowChildrenModal(true);
          setLoadingChildren(false);
          return;
        }
      }
    } catch (error) {
      console.log('⚠️ No children found via API, trying local data:', error);
    } finally {
      setLoadingChildren(false);
    }

    const childrenFromList = allTablesData.filter((t) => {
      const isChild = t.isChild || t.ischild || false;
      const parentId = t.parentTableId || t.parenttableid || t.parentTableId || t.parenttableid;
      const hasOrder = t.orderId && t.orderId > 0;

      return isChild && hasOrder && parentId != null && (parentId === clickedTableId || parentId == clickedTableId);
    });

    console.log('🔍 Children with orders found in list:', childrenFromList);

    if (childrenFromList.length > 0) {
      const processedChildren = childrenFromList.map((child) => {
        const orderStatus = child.OrderStatus || child.orderStatus;
        return {
          tableCode: child.tableCode || child.tablecode || child.Table || child.table,
          orderId: child.OrderId || child.orderId || 0,
          chairs: child.chairs || child.pax || 1,
          total: child.TableTotal || child.tableTotal || child.total || 0,
          status: orderStatus || 'RO',
          childCode: child.childTableCode || child.childtablecode || '',
        };
      });

      console.log('✅ Showing children from list (fallback):', processedChildren);
      setTableChildren(processedChildren);
      setShowChildrenModal(true);
      return;
    }

    // If table is occupied, go directly to billing (reorder)
    if (table.status === 'Occupied' || table.status === 'CheckPrinted') {
      const orderId = table.orderId || table.OrderId;

      console.log("🔄 Reordering for table:", table.name, "OrderId:", orderId);

      if (!orderId || orderId === 0) {
        showAlert('No order ID found for this table');
        return;
      }

      // Fetch order details and navigate to billing
      (async () => {
        try {
          const apiRes = await getOrderDetails(orderId);
          console.log("📦 GetOrderDetails Response:", apiRes);

          const orderDetails = apiRes?.OrderDetailsResponse;
          const itemsFromApi = orderDetails?.OrderItemsDetails;
          const orderDiscount = orderDetails?.discount || 0;

          let cartItems = [];
          if (Array.isArray(itemsFromApi) && itemsFromApi.length > 0) {
            console.log("✅ Processing", itemsFromApi.length, "items from API");

            // ✅ Group identical items (combine sent and voided records)
            const mainItems = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) > 0);
            const modifiers = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) === 0);

            const groupedMap = new Map();

            // Process main items and attach modifiers
            mainItems.forEach((item) => {
              const itemId = item.itemId || item.ItemId || 0;
              const variantId = item.variantId || item.VariantId || 0;

              // Find modifiers for this specific main item
              const itemModifiers = modifiers.filter(m => Number(m.ModifierItem || m.modifierItem) === itemId);
              const modifierComments = itemModifiers.map(m => {
                const name = m.itemname || m.itemName || '';
                return name.replace(/^\[\[|\]\]$/g, '');
              }).filter(Boolean);

              const originalDesc = (item.addDetails || item.AddDetails || '').trim();
              const combinedDesc = [originalDesc, ...modifierComments].filter(Boolean).join(', ');

              const isComplimentary = item.is_complimentary || false;
              const key = `${itemId}_${variantId}_${combinedDesc}_${isComplimentary}`.toLowerCase();

              const qty = parseFloat(item.itemQty || item.ItemQty || 0);

              if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.quantity += qty;
              } else {
                groupedMap.set(key, {
                  ...item,
                  quantity: qty,
                  addDetails: combinedDesc // Set the combined description
                });
              }
            });

            cartItems = Array.from(groupedMap.values())
              .filter(item => item.quantity > 0)
              .map((item, index) => {
                const itemId = item.itemId || item.ItemId || index;
                const variantId = item.variantId || item.VariantId || 0;
                return {
                  id: `${itemId}_${variantId}_${index}`,
                  itemId: itemId,
                  name: item.itemname || item.itemName || item.ItemName || 'Unknown Item',
                  price: parseFloat(item.itemPrice || item.ItemPrice || 0),
                  quantity: item.quantity,
                  discount: parseFloat(item.discount || 0),
                  discType: item.discType || 'None',
                  description: item.addDetails || '',
                  variantId: variantId,
                  variantName: item.variantName || item.VariantName || '',
                  modifierItem: item.ModifierItem || item.modifierItem || 0,
                  TaxItems: item.TaxItems || item.taxItems || [],
                  TransactionItems: item.TransactionItems || item.transactionItems || [],
                  SectionItemRates: item.SectionItemRates || item.sectionItemRates || [],
                  sectionId: item.sectionId || item.SectionId,
                  sectionName: item.sectionName || item.SectionName,
                  isComplimentary: item.is_complimentary || false,
                };
              });

            console.log("🛒 Transformed cart items:", cartItems);

            // ✅ Enrich with tax data if TaxItems are missing from API
            const hasTaxData = cartItems.some(item => item.TaxItems && item.TaxItems.length > 0);
            if (!hasTaxData) {
              console.log('⚠️ TaxItems missing from API response, enriching from getItems...');
              cartItems = await enrichItemsWithTaxData(cartItems);
            }
          }

          console.log("🚀 Navigating to billing for reorder");

          navigate('/billing', {
            state: {
              table: table,
              numPersons: table.pax || 1,
              existingOrder: true,
              orderId,
              items: cartItems,
              discount: orderDiscount,
              autoOpenPayment: false,
            },
          });
        } catch (error) {
          console.error("❌ Error fetching order details:", error);
          showAlert('Failed to load order details: ' + error.message);
        }
      })();
    } else {
      setShowPaxModal(true);
    }
  };

  const handlePaxModalConfirm = (numPersons) => {
    setShowPaxModal(false);

    const pax = parseInt(numPersons, 10);
    if (isNaN(pax) || pax <= 0) {
      showAlert('Please enter a valid number of persons.');
      return;
    }

    console.log('✅ Navigating to billing with table:', selectedTable.name, 'PAX:', pax);

    navigate('/billing', {
      state: {
        table: selectedTable,
        numPersons: pax,
        existingOrder: false,
        orderId: null,
        items: [],
      },
    });
  };

  const handleReorder = async () => {
    const orderId = selectedTable.orderId || selectedTable.OrderId;

    console.log("🔄 Reordering for table:", selectedTable.name, "OrderId:", orderId);

    if (!orderId || orderId === 0) {
      showAlert('No order ID found for this table');
      return;
    }

    try {
      const apiRes = await getOrderDetails(orderId);
      console.log("📦 GetOrderDetails Response:", apiRes);

      const orderDetails = apiRes?.OrderDetailsResponse;
      const itemsFromApi = orderDetails?.OrderItemsDetails;
      const orderDiscount = orderDetails?.discount || 0;

      let cartItems = [];
      if (Array.isArray(itemsFromApi) && itemsFromApi.length > 0) {
        console.log("✅ Processing", itemsFromApi.length, "items from API");

        // ✅ Group identical items (combine sent and voided records)
        const mainItems = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) > 0);
        const modifiers = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) === 0);

        const groupedMap = new Map();

        // Process main items and attach modifiers
        mainItems.forEach((item) => {
          const itemId = item.itemId || item.ItemId || 0;
          const variantId = item.variantId || item.VariantId || 0;

          // Find modifiers for this specific main item
          const itemModifiers = modifiers.filter(m => Number(m.ModifierItem || m.modifierItem) === itemId);
          const modifierComments = itemModifiers.map(m => {
            const name = m.itemname || m.itemName || '';
            return name.replace(/^\[\[|\]\]$/g, '');
          }).filter(Boolean);

          const originalDesc = (item.addDetails || item.AddDetails || '').trim();
          const combinedDesc = [originalDesc, ...modifierComments].filter(Boolean).join(', ');

          const isComplimentary = item.is_complimentary || false;
          const key = `${itemId}_${variantId}_${combinedDesc}_${isComplimentary}`.toLowerCase();

          const qty = parseFloat(item.itemQty || item.ItemQty || 0);

          if (groupedMap.has(key)) {
            const existing = groupedMap.get(key);
            existing.quantity += qty;
          } else {
            groupedMap.set(key, {
              ...item,
              quantity: qty,
              addDetails: combinedDesc
            });
          }
        });

        cartItems = Array.from(groupedMap.values())
          .filter(item => item.quantity > 0)
          .map((item, index) => {
            const itemId = item.itemId || item.ItemId || index;
            const variantId = item.variantId || item.VariantId || 0;
            return {
              id: `${itemId}_${variantId}_${index}`,
              itemId: itemId,
              name: item.itemname || item.itemName || item.ItemName || 'Unknown Item',
              price: parseFloat(item.itemPrice || item.ItemPrice || 0),
              quantity: item.quantity,
              discount: parseFloat(item.discount || 0),
              discType: item.discType || 'None',
              description: item.addDetails || '',
              variantId: variantId,
              variantName: item.variantName || item.VariantName || '',
              modifierItem: item.ModifierItem || item.modifierItem || 0,
              isVoided: false,
              voidReason: '',
              isComplimentary: item.is_complimentary || false,
            };
          });

        console.log("🛒 Transformed cart items:", cartItems);
      }

      console.log("🚀 Navigating to billing for reorder");

      navigate('/billing', {
        state: {
          table: selectedTable,
          numPersons: selectedTable.pax || 1,
          existingOrder: true,
          orderId,
          items: cartItems,
          discount: orderDiscount,
          autoOpenPayment: false,
        },
      });
    } catch (error) {
      console.error("❌ Error fetching order details:", error);
      showAlert('Failed to load order details: ' + error.message);
    }
  };

  const handleSplitTable = () => {
    navigate('/tables/split', { state: { table: selectedTable } });
  };

  const handleMergeTransfer = () => {
    navigate('/tables/mergetransfer');
  };

  const handleAddChair = () => {
    navigate('/tables/addchair', { state: { table: selectedTable } });
  };

  const getStatusStyle = (status) => {
    if (status === 'CheckPrinted') {
      return 'bg-blue-100 text-blue-700';
    } else if (status === 'Occupied') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (status) => {
    if (status === 'CheckPrinted') {
      return 'Check Printed';
    }
    return status;
  };

  const getChildrenCount = (tableId) => {
    const children = allTablesData.filter((t) => {
      const isChild = t.isChild || t.ischild || false;
      const parentId = t.parentTableId || t.parenttableid;
      const hasOrder = t.orderId && t.orderId > 0;

      return isChild && hasOrder && parentId != null && (parentId === tableId || parentId == tableId);
    });

    return children.length;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header
          handleSettings={handleSettings}
          handleLogout={handleLogout}
          handleDayClose={handleDayClose}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <div className="text-gray-600">Loading tables...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        <Header
          handleSettings={handleSettings}
          handleLogout={handleLogout}
          handleDayClose={handleDayClose}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-600">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-lg font-semibold mb-2">Error Loading Tables</div>
            <div className="text-sm mb-4">{error}</div>
            <button
              onClick={fetchTables}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sectionNames = [...new Set(tablesData.map((t) => t.Section_name))];
  const groupedTables = sectionNames.map((section) => ({
    section,
    tables: tablesData.filter(
      (t) => {
        const matchesSection = t.Section_name === section;
        if (!matchesSection) return false;

        if (filterStatus === 'All') return true;
        if (filterStatus === 'Occupied') return t.status === 'Occupied' || t.status === 'CheckPrinted';
        return t.status === filterStatus;
      }
    ),
  }));

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        handleSettings={handleSettings}
        handleLogout={handleLogout}
        handleDayClose={handleDayClose}
      />

      <div
        className="flex-1 p-4 overflow-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style jsx>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div className="mb-4 flex justify-between items-center">
          <div className="flex gap-2">
            {['All', 'Occupied', 'Available'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded text-sm font-medium ${filterStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/tables/mergetransfer')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 transition-colors font-medium"
            >
              Merge & Transfer
            </button>
            <button
              onClick={() => {
                setIsSplitMode(!isSplitMode);
                if (isAddChairMode) setIsAddChairMode(false);
              }}
              className={`px-4 py-2 border rounded transition-colors font-medium ${isSplitMode
                ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
            >
              {isSplitMode ? '✓ Split (Click Table)' : 'Split'}
            </button>
            <button
              onClick={() => {
                setIsAddChairMode(!isAddChairMode);
                if (isSplitMode) setIsSplitMode(false);
              }}
              className={`px-4 py-2 border rounded transition-colors font-medium ${isAddChairMode
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
            >
              {isAddChairMode ? '✓ Add Chair (Click Table)' : 'Add Chair'}
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600 bg-white p-3 rounded border">
          <strong>Total:</strong> {tablesData.length} |
          <strong className="ml-2">Available:</strong> {tablesData.filter((t) => t.status === 'Available').length} |
          <strong className="ml-2">Occupied:</strong> {tablesData.filter((t) => t.status === 'Occupied' || t.status === 'CheckPrinted').length}
        </div>

        {groupedTables.length === 0 ? (
          <div className="text-center text-gray-500 mt-20">
            <div className="text-4xl mb-4">🏪</div>
            <div className="text-lg font-medium">No tables available</div>
            <div className="text-sm">Check your filter settings or refresh the page</div>
          </div>
        ) : (
          groupedTables.map(({ section, tables }) => (
            <div key={section} className="mb-6">
              <h2 className="text-lg font-semibold border-b pb-2 mb-3">
                {section} <span className="text-sm text-gray-500"></span>
              </h2>

              {tables.length === 0 ? (
                <p className="italic text-gray-400 text-sm">No tables match the current filter.</p>
              ) : (
                <div
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
                >
                  {tables.map((table) => {
                    const childrenCount = getChildrenCount(table.tableId);
                    const displayName = childrenCount > 0 ? `${table.name}/${childrenCount}` : table.name;

                    return (
                      <div
                        key={`${table.sectionId}-${table.Id}-${table.name}`}
                        onClick={() => handleTableClick(table)}
                        className="bg-white border-2 rounded-lg p-3 flex flex-col items-center text-center hover:shadow-lg transition cursor-pointer hover:border-blue-300"
                      >
                        <h3 className="text-sm font-bold mb-2">Table {displayName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(table.status)}`}>
                          {getStatusText(table.status)}
                        </span>
                        {table.TableTotal > 0 && (
                          <div className="mt-2 text-xs font-semibold text-gray-700">
                            ₹{parseFloat(table.TableTotal).toFixed(2)}
                          </div>
                        )}
                      </div>

                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showPaxModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-white rounded-lg p-6 w-80 shadow-2xl">
            <button
              className="absolute top-2 right-3 text-red-600 text-2xl font-bold hover:text-red-800"
              onClick={() => setShowPaxModal(false)}
            >
              ×
            </button>
            <div className="text-center text-lg font-semibold mb-4">
              Enter Number of Guests
            </div>
            <div className="text-center text-sm text-gray-600 mb-4">
              Table {selectedTable?.name}
            </div>
            <PaxNumberPad
              onClose={() => setShowPaxModal(false)}
              onConfirm={handlePaxModalConfirm}
            />
          </div>
        </div>
      )}

      {alertMessage && (
        <CustomAlert message={alertMessage} onClose={closeAlert} />
      )}

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

      {showChildrenModal && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="relative bg-white rounded-lg p-6 w-full max-w-2xl shadow-xl mx-4">
            <button
              className="absolute top-2 right-3 text-red-600 text-xl font-bold hover:text-red-800"
              onClick={() => setShowChildrenModal(false)}
            >
              ×
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Table {selectedTable?.name}</h2>
              <p className="text-sm text-gray-600">{selectedTable?.Section_name}</p>
              <p className="text-xs text-gray-500 mt-2">Select a chair to view details</p>
            </div>

            {loadingChildren ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4" />
                <div className="text-gray-600">Loading chairs...</div>
              </div>
            ) : tableChildren.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-lg mb-2">No active chairs found</div>
                <div className="text-sm">This table doesn't have any chairs with saved orders</div>
              </div>
            ) : (
              /* ✅ Hidden scrollbar on children modal */
              <div
                className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto"
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

                {tableChildren.map((child, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      const childTable = {
                        tableId: selectedTable.tableId || selectedTable.Id || selectedTable.id,
                        name: child.tableCode || `${selectedTable.name}${child.childCode || ''}`,
                        Section_name: selectedTable.Section_name,
                        orderId: child.orderId || 0,
                        orderStatus: child.status || 'RO',
                        pax: child.chairs || 0,
                        sectionId: selectedTable.sectionId,
                      };

                      console.log('🪑 Child table selected:', childTable);

                      setShowChildrenModal(false);
                      setSelectedTable(childTable);

                      if (child.orderId && child.orderId > 0 && (child.status === 'RO' || child.status === 'CP')) {
                        // Navigate directly to billing instead of showing occupied modal
                        const orderId = child.orderId;

                        (async () => {
                          try {
                            const apiRes = await getOrderDetails(orderId);
                            console.log("📦 GetOrderDetails Response for child:", apiRes);

                            const orderDetails = apiRes?.OrderDetailsResponse;
                            const itemsFromApi = orderDetails?.OrderItemsDetails;

                            let cartItems = [];
                            if (Array.isArray(itemsFromApi) && itemsFromApi.length > 0) {
                              cartItems = itemsFromApi.map((item, index) => ({
                                id: item.itemId || item.ItemId || index,
                                itemId: item.itemId || item.ItemId || index,
                                name: item.itemname || item.itemName || item.ItemName || 'Unknown Item',
                                price: parseFloat(item.itemPrice || item.ItemPrice || 0),
                                quantity: parseFloat(item.itemQty || item.ItemQty || 1),
                                discount: parseFloat(item.itemDisc || item.ItemDisc || 0),
                                discType: item.discType || item.DiscType || 'None',
                                description: item.addDetails || item.AddDetails || '',
                                variantId: item.variantId || item.VariantId || 0,
                                variantName: item.variantName || item.VariantName || '',
                                modifierItem: item.ModifierItem || item.modifierItem || 0,
                                // ✅ CRITICAL: Preserve TaxItems from API response
                                TaxItems: item.TaxItems || item.taxItems || [],
                                TransactionItems: item.TransactionItems || item.transactionItems || [],
                                SectionItemRates: item.SectionItemRates || item.sectionItemRates || [],
                                sectionId: item.sectionId || item.SectionId,
                                sectionName: item.sectionName || item.SectionName,
                              }));
                            }

                            // ✅ Enrich with tax data if TaxItems are missing from API
                            const hasTaxData = cartItems.some(item => item.TaxItems && item.TaxItems.length > 0);
                            if (!hasTaxData && cartItems.length > 0) {
                              console.log('⚠️ TaxItems missing from child order API, enriching...');
                              cartItems = await enrichItemsWithTaxData(cartItems);
                            }

                            navigate('/billing', {
                              state: {
                                table: childTable,
                                numPersons: childTable.pax || 1,
                                existingOrder: true,
                                orderId,
                                items: cartItems,
                                autoOpenPayment: false,
                              },
                            });
                          } catch (error) {
                            console.error("❌ Error fetching order details:", error);
                            showAlert('Failed to load order details: ' + error.message);
                          }
                        })();
                      } else {
                        setShowPaxModal(true);
                      }
                    }}
                    className="bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="text-center">
                      <h3 className="text-lg font-bold mb-2">{child.tableCode || `${selectedTable?.name}${child.childCode || ''}`}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="text-gray-600">
                          <span className="font-medium">Chairs:</span> {child.chairs || 0}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Total:</span> ₹{parseFloat(child.total || 0).toFixed(2)}
                        </div>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${child.status === 'RO' ? 'bg-red-100 text-red-700' :
                          child.status === 'OB' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                          {child.status === 'RO' ? 'Running Order' :
                            child.status === 'OB' ? 'Order Billed' :
                              child.status || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowChildrenModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablePage;