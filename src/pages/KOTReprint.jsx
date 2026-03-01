import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, X, ChevronRight, CheckCircle2 } from 'lucide-react';
// import Header from '../components/Header';
import { getRunningOrders, getOrderKOTs, reprintKOT } from '../services/apicall';
import { usePermission } from '../context/PermissionContext';
import { PERMISSIONS } from '../components/permissions';

const KOTReprint = () => {
    const navigate = useNavigate();
    const { executeWithPermission } = usePermission();

    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [kots, setKots] = useState([]);
    const [selectedKOT, setSelectedKOT] = useState(null);
    const [items, setItems] = useState([]);
    const [selectedItems, setSelectedItems] = useState({});
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [loadingKOTs, setLoadingKOTs] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: '' });

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
            const response = await getRunningOrders();
            const orderList = Array.isArray(response) ? response : response.data || [];
            setOrders(orderList);
        } catch (error) {
            console.error('Error fetching orders:', error);
            showToast('Failed to load running orders', 'error');
        } finally {
            setLoadingOrders(false);
        }
    };

    const handleOrderSelect = async (order) => {
        console.log("🖱️ Order selected:", order);
        setSelectedOrder(order);
        setSelectedKOT(null);
        setKots([]);
        setItems([]);
        setLoadingKOTs(true);
        try {
            const orderId = order.orderId || order.OrderId || order.id || order.Id;
            if (!orderId) {
                showToast('Invalid Order ID', 'error');
                return;
            }

            const response = await getOrderKOTs(orderId);

            let kotList = [];
            if (Array.isArray(response)) {
                kotList = response;
            } else if (response?.data && Array.isArray(response.data)) {
                kotList = response.data;
            } else if (response?.OrderKots && Array.isArray(response.OrderKots)) {
                kotList = response.OrderKots;
            } else if (response?.kots && Array.isArray(response.kots)) {
                kotList = response.kots;
            }

            setKots(kotList);
        } catch (error) {
            console.error('Error fetching KOTs:', error);
            showToast('Failed to load KOTs', 'error');
        } finally {
            setLoadingKOTs(false);
        }
    };

    const handleKOTSelect = (kot) => {
        console.log("🖱️ KOT selected:", kot);
        setSelectedKOT(kot);

        const kotItems = kot.items || kot.OrderItemsDetails || kot.orderItemsDetails || kot.Items || kot.KOTItems || [];

        const mainItems = kotItems.filter(i => (i.itemId || i.ItemId || 0) > 0);
        const modifiers = kotItems.filter(i => (i.itemId || i.ItemId || 0) === 0);

        const processedItems = mainItems.map((item, index) => {
            const itemId = item.itemId || item.ItemId || 0;

            // Find modifiers for this specific main item
            const itemModifiers = modifiers.filter(m => Number(m.ModifierItem || m.modifierItem) === itemId);
            const modifierComments = itemModifiers.map(m => {
                const name = m.itemname || m.itemName || '';
                return name.replace(/^\[\[|\]\]$/g, '');
            }).filter(Boolean);

            const originalDesc = (item.addDetails || item.AddDetails || '').trim();
            const combinedDesc = [originalDesc, ...modifierComments].filter(Boolean).join(', ');

            return {
                ...item,
                addDetails: combinedDesc,
                displayDescription: combinedDesc
            };
        });

        setItems(processedItems);

        const newSelectedItems = {};
        processedItems.forEach((item, index) => {
            const id = item.itemId || item.ItemId || item.id || `item-${index}`;
            newSelectedItems[id] = true;
        });
        setSelectedItems(newSelectedItems);
    };

    const toggleItemSelection = (itemId) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: !prev[itemId]
        }));
    };

    const selectAllItems = (checked) => {
        const newSelectedItems = {};
        if (checked) {
            items.forEach((item, index) => {
                const id = item.itemId || item.ItemId || item.id || `item-${index}`;
                newSelectedItems[id] = true;
            });
        }
        setSelectedItems(newSelectedItems);
    };

    const handleReprint = async () => {
        const selectedItemIds = Object.keys(selectedItems).filter(id => selectedItems[id]);

        if (selectedItemIds.length === 0) {
            showToast('Please select items to reprint', 'error');
            return;
        }

        setPrinting(true);
        try {
            const payload = {
                orderId: selectedOrder.orderId || selectedOrder.id,
                kotNo: selectedKOT.kotNo || selectedKOT.KotNo,
                items: items.filter(item => selectedItems[item.itemId || item.ItemId])   
            };

            await reprintKOT(payload);
            showToast('Reprint successful', 'success');
        } catch (error) {
            console.error('Reprint error:', error);
            showToast('Failed to reprint', 'error');
        } finally {
            setPrinting(false);
        }
    };
    
    const filteredOrders = orders.filter(order => {
        const orderText = `${order.orderId} ${order.Table || ''}`.toLowerCase();
        return orderText.includes(searchTerm.toLowerCase());
    });

    const isAllSelected = items.length > 0 && items.every((item, index) => selectedItems[item.itemId || item.ItemId || item.id || `item-${index}`]);

    return (
        <div className="h-screen flex flex-col bg-[#F8FAFC] overflow-hidden font-sans text-gray-900">
            {/* <Header /> */}

            {/* Premium Toast */}
            {toast.show && (
                <div className={`fixed top-6 right-6 z-[100] px-6 py-3 rounded-xl shadow-2xl transition-all duration-500 transform translate-y-0 ${toast.type === 'success' ? 'bg-green-600' :
                    toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                    } text-white font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-4`}>
                    {toast.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                    <span>{toast.message}</span>
                </div>
            )}

            <div className="flex-1 flex flex-col p-3 md:p-5 gap-4 overflow-hidden">
                {/* Simplified Header Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">KOT Reprint</h1>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">Manage and reprint kitchen order tokens</p>
                    </div>
                    <div className="flex w-full sm:w-auto gap-3">
                        <div className="relative flex-1 sm:w-64">
                            <input
                                type="text"
                                placeholder="Search by Order # or Table"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none text-sm font-medium"
                            />
                        </div>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors sm:hidden"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Main Content Areas - Responsive Grid */}
                <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden">

                    {/* Column 1: Running Orders */}
                    <div className="flex-[1] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[200px] lg:min-h-0">
                        <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Running Orders</h2>
                            <span className="bg-blue-50 text-blue-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                                {filteredOrders.length}
                            </span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                            {loadingOrders ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-gray-400">
                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                    <span className="text-xs font-medium">Loading...</span>
                                </div>
                            ) : filteredOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400 opacity-60">
                                    <p className="text-xs font-medium italic">No orders found</p>
                                </div>
                            ) : (
                                filteredOrders.map(order => (
                                    <button
                                        key={order.orderId || order.id}
                                        onClick={() => handleOrderSelect(order)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 group ${selectedOrder?.orderId === order.orderId
                                            ? 'bg-blue-600 border-blue-600 shadow-md transform scale-[1.01]'
                                            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className={`text-sm font-bold ${selectedOrder?.orderId === order.orderId ? 'text-white' : 'text-gray-900'}`}>
                                                    Order #{order.orderId || order.id}
                                                </p>
                                                <p className={`text-[11px] font-semibold ${selectedOrder?.orderId === order.orderId ? 'text-blue-100' : 'text-gray-500'}`}>
                                                    {order.Table || 'Dine In'}
                                                </p>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedOrder?.orderId === order.orderId ? 'text-white' : 'text-gray-300 group-hover:text-gray-400'
                                                }`} />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 2: KOTs */}
                    <div className="flex-[1] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[150px] lg:min-h-0">
                        <div className="px-4 py-3 border-b bg-gray-50/50">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">KOT Numbers</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                            {!selectedOrder ? (
                                <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400 opacity-60">
                                    <p className="text-xs font-medium italic">Select an order</p>
                                </div>
                            ) : loadingKOTs ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2 py-8 text-gray-400">
                                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                                    <span className="text-xs font-medium">Loading...</span>
                                </div>
                            ) : kots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-8 text-gray-400 opacity-60 text-center">
                                    <p className="text-xs font-medium">No KOTs available</p>
                                </div>
                            ) : (
                                kots.map((kot, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleKOTSelect(kot)}
                                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all duration-200 flex items-center justify-between group ${selectedKOT === kot
                                            ? 'bg-blue-600 border-blue-600 shadow-md transform scale-[1.01]'
                                            : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                                            }`}
                                    >
                                        <div>
                                            <p className={`text-sm font-bold ${selectedKOT === kot ? 'text-white' : 'text-gray-900'}`}>
                                                KOT #{kot.kotNo || kot.KotNo}
                                            </p>
                                            <p className={`text-[10px] font-medium ${selectedKOT === kot ? 'text-blue-100' : 'text-gray-400'}`}>
                                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedKOT === kot ? 'text-white' : 'text-gray-200 group-hover:text-gray-400'
                                            }`} />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Column 3: Items Table */}
                    <div className="flex-[2] flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:min-h-0">
                        <div className="px-5 py-3 border-b bg-gray-50/50 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">KOT Items</h2>
                            {items.length > 0 && (
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <span className="text-[11px] font-bold text-gray-500 group-hover:text-blue-600 transition-colors uppercase tracking-tight">Select All</span>
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        onChange={(e) => selectAllItems(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {!selectedKOT ? (
                                <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 opacity-60">
                                    <p className="text-xs font-semibold uppercase tracking-widest">Select KOT to view items</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm text-gray-500 text-[10px] font-bold uppercase tracking-wider z-10 border-b">
                                        <tr>
                                            <th className="py-3 px-5 w-12 text-center">Print</th>
                                            <th className="py-3 px-5 w-16">Qty</th>
                                            <th className="py-3 px-5">Item Name</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, idx) => {
                                            const itemId = item.itemId || item.ItemId || item.id || `item-${idx}`;
                                            return (
                                                <tr key={idx} className={`transition-colors group hover:bg-gray-50/50 ${selectedItems[itemId] ? 'bg-blue-50/20' : ''}`}>
                                                    <td className="py-3 px-5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!selectedItems[itemId]}
                                                            onChange={() => toggleItemSelection(itemId)}
                                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="py-3 px-5">
                                                        <span className="bg-gray-100 text-gray-700 font-bold text-xs px-2 py-0.5 rounded-md min-w-[24px] inline-block text-center border border-gray-200">
                                                            {item.itemQty || item.quantity || 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-5 text-sm text-gray-800">
                                                        <div className="font-bold">{item.itemname || item.name || item.itemName}</div>
                                                        {item.displayDescription && (
                                                            <div className="text-[11px] text-blue-600 mt-1 font-medium bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100/50 inline-block">
                                                                {item.displayDescription}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="p-4 border-t bg-gray-50/30 flex flex-col sm:flex-row gap-3 items-center justify-between">
                            <button
                                onClick={fetchOrders}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                disabled={loadingOrders}
                            >
                                <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                            <div className="flex w-full sm:w-auto gap-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex-1 sm:flex-none px-8 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300 transition-all active:scale-95"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleReprint}
                                    disabled={!selectedKOT || printing || Object.values(selectedItems).every(v => !v)}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md active:scale-95 disabled:bg-gray-300 disabled:shadow-none transition-all"
                                >
                                    {printing ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        'Reprint KOT'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 5px;
                  height: 5px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background: #e2e8f0;
                  border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background: #cbd5e1;
                }
            `}</style>
        </div>
    );
};

export default KOTReprint;
