import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { getTables, getOrderDetails, splitTable, splitBill } from '../services/apicall';

// Number Pad Component for entering number of chairs/splits
const NumberPad = ({ onClose, onConfirm, title, maxValue = null }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleKeyPress = (key) => {
    setError(''); // Clear error on any key press

    if (key === 'esc') {
      onClose();
    } else if (key === 'enter') {
      const num = parseInt(value, 10);
      if (value && !isNaN(num) && num > 0) {
        if (maxValue && num > maxValue) {
          setError(`Please enter a number between 1 and ${maxValue}`);
        } else {
          onConfirm(num);
        }
      } else {
        setError('Please enter a valid number greater than 0');
      }
    } else if (key === 'clear') {
      setValue('');
      setError('');
    } else {
      // Allow up to 3 digits (up to 999 splits)
      if (value.length < 3) {
        setValue((prev) => prev + key);
      }
    }
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'clear', '0', 'enter',
  ];

  return (
    <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-80 shadow-2xl">
        <div className="text-center text-lg font-semibold mb-4">{title}</div>
        <div className="grid grid-cols-3 gap-2">
          <input
            className={`col-span-3 border p-3 text-center font-semibold text-xl mb-2 ${error ? 'border-red-500' : 'border-gray-300'
              }`}
            value={value}
            readOnly
            placeholder="Enter number"
          />
          {error && (
            <div className="col-span-3 text-red-600 text-xs text-center mb-2 -mt-1">
              {error}
            </div>
          )}
          {keys.map((key, i) => (
            <button
              key={i}
              className={`p-3 rounded text-sm font-medium border ${key === 'enter'
                ? 'bg-gray-600 text-white hover:bg-gray-700'
                : key === 'clear'
                  ? 'bg-gray-500 text-white hover:bg-gray-600'
                  : 'bg-gray-100 hover:bg-gray-200'
                }`}
              onClick={() => handleKeyPress(key)}
            >
              {key === 'clear' ? '⌫' : key === 'enter' ? '✓ OK' : key}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-3 w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

const TableSplitPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sourceTable = location.state?.table;

  // Add scrollbar hide styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-hide::-webkit-scrollbar {
        display: none;
      }
      .scrollbar-hide {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [splitMode, setSplitMode] = useState(null); // 'item' or 'bill'
  const [tablesData, setTablesData] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Item Split State
  const [showChairNumberPad, setShowChairNumberPad] = useState(false);
  const [numberOfChairs, setNumberOfChairs] = useState(0);
  const [chairs, setChairs] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemAllocations, setItemAllocations] = useState({});

  // Bill Split State
  const [showBillSplitPad, setShowBillSplitPad] = useState(false);
  const [billSplitParts, setBillSplitParts] = useState(2);

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Toast notification function
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    fetchTables();
    if (sourceTable) {
      fetchOrderItems();
    }
  }, [sourceTable]);

  const fetchTables = async () => {
    try {
      const response = await getTables();

      let tablesArray = [];
      if (Array.isArray(response)) {
        tablesArray = response;
      } else if (response?.data && Array.isArray(response.data)) {
        tablesArray = response.data;
      } else if (response?.tables && Array.isArray(response.tables)) {
        tablesArray = response.tables;
      }

      const processedTables = tablesArray.map((table) => ({
        tableId: table.Id || table.id,
        name: table.Table || table.table || `T${table.Id || table.id}`,
        sectionId: table.SectionId || table.sectionId || 1,
        Section_name: table.Section || table.section || 'Main Hall',
        status: (table.OrderStatus || table.orderStatus) === 'RO' ? 'Occupied' : 'Available',
        orderId: table.OrderId || table.orderId || 0,
        pax: table.pax || table.PAX || 0,
        ...table,
      }));

      setTablesData(processedTables);
    } catch (err) {
      console.error('Failed to fetch tables:', err);
      showToast('Failed to load tables', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderItems = async () => {
    try {
      if (!sourceTable.orderId) {
        setOrderItems([]);
        return;
      }

      const orderDetails = await getOrderDetails(sourceTable.orderId);
      const itemsFromApi = orderDetails?.OrderDetailsResponse?.OrderItemsDetails || orderDetails?.OrderItemsDetails || [];
      const mainItems = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) > 0);
      const modifiers = itemsFromApi.filter(i => (i.itemId || i.ItemId || 0) === 0);

      const processedItems = mainItems.map((item, index) => {
        const itemId = item.itemId || item.ItemId || 0;
        const variantId = item.variantId || item.VariantId || 0;
        const variantName = item.variantName || item.VariantName || '';
        const name = item.itemname || item.itemName || item.ItemName || 'Unknown Item';

        // Find modifiers for this specific main item
        const itemModifiers = modifiers.filter(m => Number(m.ModifierItem || m.modifierItem) === itemId);
        const modifierComments = itemModifiers.map(m => {
          const mName = m.itemname || m.itemName || '';
          return mName.replace(/^\[\[|\]\]$/g, '');
        }).filter(Boolean);

        const originalDesc = (item.addDetails || item.AddDetails || '').trim();
        const combinedDesc = [originalDesc, ...modifierComments].filter(Boolean).join(', ');

        return {
          id: `${itemId}_${variantId}_${index}`,
          itemId: itemId,
          name: variantName ? `${name} (${variantName})` : name,
          price: parseFloat(item.itemPrice || item.ItemPrice || 0),
          quantity: parseFloat(item.itemQty || item.ItemQty || 1),
          discount: parseFloat(item.itemDisc || item.ItemDisc || 0),
          variantId: variantId,
          variantName: variantName,
          description: combinedDesc, // Store description with modifiers
        };
      });

      setOrderItems(processedItems);
    } catch (err) {
      console.error('Failed to fetch order items:', err);
      showToast('Failed to load order items', 'error');
      setOrderItems([]);
    }
  };

  // Item Split Functions
  const handleItemSplitStart = () => {
    setSplitMode('item');
    setShowChairNumberPad(true);
  };

  const handleChairNumberConfirm = (num) => {
    setNumberOfChairs(num);
    const chairArray = Array.from({ length: num }, (_, i) => ({
      id: i + 1,
      name: `Chair ${i + 1}`,
      items: [],
    }));
    setChairs(chairArray);
    setShowChairNumberPad(false);
    showToast(`Created ${num} chairs for item split`, 'success');
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
    showToast(`Selected: ${item.name}`, 'info');
  };

  const handleChairClick = (chairId) => {
    if (!selectedItem) {
      showToast('Please select an item first', 'error');
      return;
    }

    const currentAllocation = itemAllocations[selectedItem.id] || {};
    const totalAllocated = Object.values(currentAllocation).reduce((sum, qty) => sum + qty, 0);
    const unallocatedQty = selectedItem.quantity - totalAllocated;

    if (unallocatedQty <= 0) {
      showToast(`All ${selectedItem.quantity} quantities of "${selectedItem.name}" have been allocated`, 'error');
      return;
    }

    setItemAllocations(prev => {
      const pCurrentAllocation = prev[selectedItem.id] || {};
      const pTotalAllocated = Object.values(pCurrentAllocation).reduce((sum, qty) => sum + qty, 0);
      const pUnallocatedQty = selectedItem.quantity - pTotalAllocated;

      if (pUnallocatedQty <= 0) {
        return prev;
      }

      const pChairQty = pCurrentAllocation[chairId] || 0;
      return {
        ...prev,
        [selectedItem.id]: {
          ...pCurrentAllocation,
          [chairId]: pChairQty + pUnallocatedQty,
        }
      };
    });
  };

  const handleRemoveFromChair = (itemId, chairId) => {
    setItemAllocations(prev => {
      const newAllocations = { ...prev };
      if (newAllocations[itemId] && newAllocations[itemId][chairId]) {
        newAllocations[itemId][chairId]--;
        if (newAllocations[itemId][chairId] <= 0) {
          delete newAllocations[itemId][chairId];
        }
      }
      return newAllocations;
    });
  };

  const getItemAllocationForChair = (chairId) => {
    const items = [];
    orderItems.forEach(item => {
      const allocation = itemAllocations[item.id];
      if (allocation && allocation[chairId]) {
        items.push({
          ...item,
          allocatedQty: allocation[chairId],
        });
      }
    });
    return items;
  };

  const getChairTotal = (chairId) => {
    const items = getItemAllocationForChair(chairId);
    return items.reduce((sum, item) => sum + (item.allocatedQty * item.price), 0);
  };

  const getTotalAllocatedForItem = (itemId) => {
    const allocation = itemAllocations[itemId] || {};
    return Object.values(allocation).reduce((sum, qty) => sum + qty, 0);
  };

  // Get unallocated items (items that haven't been fully allocated)
  const getUnallocatedItems = () => {
    return orderItems.filter(item => {
      const allocated = getTotalAllocatedForItem(item.id);
      return allocated < item.quantity;
    });
  };

  // Bill Split Functions
  const handleBillSplitStart = () => {
    setSplitMode('bill');
    setShowBillSplitPad(true);
  };

  const handleBillSplitConfirm = (parts) => {
    setBillSplitParts(parts);
    setShowBillSplitPad(false);
    showToast(`Bill will be split into ${parts} equal parts`, 'success');
  };

  const calculateBillTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const calculateSplitAmount = () => {
    return calculateBillTotal() / billSplitParts;
  };

  // Confirm Item Split with toast notifications
  const handleConfirmItemSplit = async () => {
    const allAllocated = orderItems.every(item => {
      const allocated = getTotalAllocatedForItem(item.id);
      return allocated === item.quantity;
    });

    if (!allAllocated) {
      const unallocated = orderItems.filter(item => {
        const allocated = getTotalAllocatedForItem(item.id);
        return allocated < item.quantity;
      });

      showToast(`Warning: ${unallocated.length} item(s) not fully allocated`, 'error');
      // Allow to continue without confirmation
    }

    if (!sourceTable?.orderId || sourceTable.orderId === 0) {
      showToast('No active order found on this table', 'error');
      return;
    }

    try {
      // Build allocations array
      const allocations = [];

      // Generate child codes dynamically based on number of chairs
      const generateChildCode = (index) => {
        return String(index + 1); // '1', '2', '3', ... '23', '50', '100', etc.
      };

      orderItems.forEach(item => {
        const allocation = itemAllocations[item.id] || {};

        // For each chair that has this item allocated
        Object.keys(allocation).forEach(chairId => {
          const qty = allocation[chairId];
          if (qty > 0) {
            const chairIndex = parseInt(chairId) - 1;
            const childCode = generateChildCode(chairIndex);

            allocations.push({
              orderItemId: 0,
              salesitemid: item.itemId,
              variantId: item.variantId || 0,
              childCode: childCode,
              qty: qty
            });
          }
        });
      });

      const payload = {
        originalOrderId: sourceTable.orderId,
        numberOfSplits: numberOfChairs,
        allocations: allocations
      };

      console.log('📤 Sending split request to tableId:', sourceTable.tableId);
      console.log('📤 Payload:', JSON.stringify(payload, null, 2));

      showToast('Processing table split...', 'info');

      const response = await splitTable(sourceTable.tableId, payload);

      console.log('✅ Split response:', response);

      if (response?.success || response?.message?.includes('success')) {
        showToast(`Table split successfully into ${numberOfChairs} chairs!`, 'success');
        setTimeout(() => {
          navigate('/tables', { state: { refresh: true, tableId: sourceTable.tableId } });
        }, 1500);
      } else {
        showToast(response?.message || 'Failed to split table', 'error');
      }
    } catch (error) {
      console.error('❌ Error splitting table:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to split table';
      showToast(`Error: ${errorMessage}`, 'error');
    }
  };

  // Bill Split Confirmation with toast notifications
  const handleConfirmBillSplit = async () => {
    if (!sourceTable?.orderId || sourceTable.orderId === 0) {
      showToast('No active order found on this table', 'error');
      return;
    }

    if (!sourceTable?.tableId) {
      showToast('Table ID not found', 'error');
      return;
    }

    try {
      const payload = {
        originalOrderId: sourceTable.orderId,
        splitCount: billSplitParts,
        tableId: sourceTable.tableId
      };

      console.log('📤 Sending bill split request:', JSON.stringify(payload, null, 2));

      showToast('Processing bill split...', 'info');

      const response = await splitBill(payload);

      console.log('✅ Bill split response:', response);

      if (response?.success || response?.message?.includes('success')) {
        showToast(`Bill split successfully into ${billSplitParts} equal parts! Each part: ₹${calculateSplitAmount().toFixed(2)}`, 'success');

        setTimeout(() => {
          navigate('/tables', { state: { refresh: true, tableId: sourceTable.tableId } });
        }, 1500);
      } else {
        showToast(response?.message || 'Failed to split bill', 'error');
      }
    } catch (error) {
      console.error('❌ Error splitting bill:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to split bill';
      showToast(`Error: ${errorMessage}`, 'error');
    }
  };

  const handleClose = () => {
    navigate('/tables');
  };

  const handleResetSplit = () => {
    setSplitMode(null);
    setNumberOfChairs(0);
    setChairs([]);
    setSelectedItem(null);
    setItemAllocations({});
    setBillSplitParts(2);
    showToast('Split reset', 'info');
  };

  if (!sourceTable) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold text-gray-800 mb-2">No Table Selected</div>
          <div className="text-sm text-gray-600 mb-4">Please select a table from the tables page</div>
          <button
            onClick={() => navigate('/tables')}
            className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Go to Tables
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4" />
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Inline CSS to hide scrollbars */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Toast Notification */}
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

      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Split Table {sourceTable?.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {splitMode === 'item' ? `Item Split - ${numberOfChairs} Chairs` :
              splitMode === 'bill' ? `Bill Split - ${billSplitParts} Parts` :
                'Choose split type'} • {sourceTable?.Section_name}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FaTimes size={24} />
        </button>
      </div>

      {/* Split Type Selection Modal */}
      {!splitMode && (
        <div className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-3xl shadow-2xl mx-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Choose Split Type</h2>
              <p className="text-gray-600">Select how you want to split this table</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Item Split Card */}
              <button
                onClick={handleItemSplitStart}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-500 hover:shadow-lg transition-all group"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Item Split</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Split items by chairs. Allocate each item to specific chairs.
                  </p>
                  <div className="text-gray-700 font-medium">
                    Click to start →
                  </div>
                </div>
              </button>

              {/* Bill Split Card */}
              <button
                onClick={handleBillSplitStart}
                className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:border-gray-500 hover:shadow-lg transition-all group"
              >
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Bill Split</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Split the total bill equally into multiple parts (1/2, 1/3, etc.)
                  </p>
                  <div className="text-gray-700 font-medium">
                    Click to start →
                  </div>
                </div>
              </button>
            </div>
            <button
              onClick={handleClose}
              className="mt-6 w-full py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Item Split View */}
      {splitMode === 'item' && numberOfChairs > 0 && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 p-4 min-h-0">
            <div className="grid grid-cols-12 gap-4 h-full">
              {/* Left: Unallocated Items */}
              <div className="col-span-4 bg-white border rounded-lg shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-100 border-b px-4 py-3 flex-shrink-0">
                  <h3 className="font-semibold text-gray-700">Unallocated Items</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                  {getUnallocatedItems().map(item => {
                    const allocated = getTotalAllocatedForItem(item.id);
                    const remaining = item.quantity - allocated;
                    const isSelected = selectedItem?.id === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${isSelected
                          ? 'bg-blue-50 border-blue-400 shadow-sm'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">{item.name}</div>
                            {item.description && (
                              <div className="text-[10px] text-blue-600 mt-1 italic font-medium">
                                {item.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
                              ₹{item.price.toFixed(2)} × {remaining} remaining
                            </div>
                            {allocated > 0 && (
                              <div className="text-xs mt-1 text-orange-600 font-medium">
                                {allocated} already allocated
                              </div>
                            )}
                          </div>
                          <div className="font-semibold text-gray-800">
                            ₹{(remaining * item.price).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {getUnallocatedItems().length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">✓</div>
                      <div className="text-sm">All items allocated!</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Middle: Chairs - FIXED SCROLLING */}
              <div className="col-span-4 bg-white border rounded-lg shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-100 border-b px-4 py-3 flex-shrink-0">
                  <h3 className="font-semibold text-gray-700">Chairs ({numberOfChairs})</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  <div className="grid grid-cols-2 gap-3 pb-4">
                    {chairs.map(chair => {
                      const chairItems = getItemAllocationForChair(chair.id);
                      const chairTotal = getChairTotal(chair.id);

                      return (
                        <button
                          key={chair.id}
                          onClick={() => handleChairClick(chair.id)}
                          className={`p-4 border-2 rounded-lg text-center transition-all ${selectedItem
                            ? 'border-blue-300 hover:border-blue-500 hover:shadow-md bg-blue-50 cursor-pointer'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            }`}
                          disabled={!selectedItem}
                        >
                          <div className="font-bold text-gray-800 text-lg">{chair.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {chairItems.length} item{chairItems.length !== 1 ? 's' : ''}
                          </div>
                          {chairTotal > 0 && (
                            <div className="text-sm font-semibold text-gray-700 mt-1">
                              ₹{chairTotal.toFixed(2)}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Allocated Items */}
              <div className="col-span-4 bg-white border rounded-lg shadow-sm flex flex-col overflow-hidden">
                <div className="bg-gray-100 border-b px-4 py-3 flex-shrink-0">
                  <h3 className="font-semibold text-gray-700">Allocated Items</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                  {chairs.map(chair => {
                    const chairItems = getItemAllocationForChair(chair.id);
                    if (chairItems.length === 0) return null;

                    return (
                      <div key={chair.id} className="border rounded-lg p-3 bg-green-50 border-green-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-800">
                            {chair.name}
                          </div>
                          <div className="text-sm font-semibold text-gray-700">
                            ₹{getChairTotal(chair.id).toFixed(2)}
                          </div>
                        </div>
                        <div className="space-y-1">
                          {chairItems.map(item => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-xs bg-white p-2 rounded border border-green-200"
                            >
                              <div className="flex-1">
                                <div className="font-medium text-gray-700">{item.name}</div>
                                {item.description && (
                                  <div className="text-[10px] text-blue-600 font-medium">
                                    {item.description}
                                  </div>
                                )}
                                <div className="text-gray-500">
                                  {item.allocatedQty} × ₹{item.price.toFixed(2)}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveFromChair(item.id, chair.id)}
                                className="ml-2 text-red-500 hover:text-red-700 font-bold text-lg"
                                title="Remove one"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {chairs.every(chair => getItemAllocationForChair(chair.id).length === 0) && (
                    <div className="text-center text-gray-400 py-8">
                      <div className="text-4xl mb-2">→</div>
                      <div className="text-sm">No allocations yet</div>
                      <div className="text-xs mt-1">Select items and assign to chairs</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Bill Split View */}
      {splitMode === 'bill' && billSplitParts > 0 && (
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white border rounded-lg shadow-sm">
              <div className="bg-gray-100 border-b px-6 py-4">
                <h3 className="text-lg font-semibold text-gray-700">Bill Split Summary</h3>
              </div>

              <div className="p-6">
                {/* Order Items */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-3">Order Items</h4>
                  <div className="space-y-2">
                    {orderItems.map(item => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded border"
                      >
                        <div>
                          <div className="font-medium text-gray-800">{item.name}</div>
                          <div className="text-sm text-gray-500">
                            ₹{item.price.toFixed(2)} × {item.quantity}
                          </div>
                        </div>
                        <div className="font-semibold text-gray-800">
                          ₹{(item.quantity * item.price).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Split Calculation */}
                <div className="border-t pt-6">
                  <div className="bg-gray-100 rounded-lg p-6 mb-4">
                    <div className="flex justify-between items-center text-lg mb-4">
                      <span className="font-semibold text-gray-700">Total Bill Amount:</span>
                      <span className="text-2xl font-bold text-gray-900">
                        ₹{calculateBillTotal().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold text-gray-700">Split Into:</span>
                      <span className="text-xl font-bold text-gray-700">
                        {billSplitParts} Parts (1/{billSplitParts})
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-100 rounded-lg p-6">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-2">Amount Per Part</div>
                      <div className="text-4xl font-bold text-gray-700">
                        ₹{calculateSplitAmount().toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Change Split Parts */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowBillSplitPad(true)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Change Split Parts
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      {splitMode && (
        <div className="border-t bg-white px-6 py-4 flex justify-between items-center shadow-sm">
          <button
            onClick={handleResetSplit}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            ← Back to Split Type
          </button>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={splitMode === 'item' ? handleConfirmItemSplit : handleConfirmBillSplit}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Confirm {splitMode === 'item' ? 'Item Split' : 'Bill Split'}
            </button>
          </div>
        </div>
      )}   


      {/* Number Pad Modals */}   
      {showChairNumberPad && (
        <NumberPad
          title="Enter Number of Chairs"
          onClose={() => setShowChairNumberPad(false)}
          onConfirm={handleChairNumberConfirm}
        />
      )}

      {showBillSplitPad && (
        <NumberPad
          title="Split Bill Into How Many Parts?"
          onClose={() => setShowBillSplitPad(false)}
          onConfirm={handleBillSplitConfirm}
        />
      )}
    </div>
  );
};

export default TableSplitPage;