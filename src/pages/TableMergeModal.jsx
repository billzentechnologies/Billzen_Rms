import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaTimes } from 'react-icons/fa';
import { getOccupiedTables, getMergeList, mergeTables } from '../services/apicall';

const MergeTransferPage = () => {
  const navigate = useNavigate();

  const [allTablesData, setAllTablesData] = useState([]);
  const [occupiedTablesData, setOccupiedTablesData] = useState([]);
  const [selectedTables, setSelectedTables] = useState([]);
  const [transferTarget, setTransferTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch both APIs in parallel
      const [occupiedResponse, mergeListResponse] = await Promise.all([
        getOccupiedTables(),
        getMergeList()
      ]);

      console.log('📦 Occupied Tables Response:', occupiedResponse);
      console.log('📦 Merge List Response:', mergeListResponse);

      // Process occupied tables from /api/tables/occupied
      let occupiedArray = [];
      if (occupiedResponse?.data && Array.isArray(occupiedResponse.data)) {
        occupiedArray = occupiedResponse.data;
      } else if (Array.isArray(occupiedResponse)) {
        occupiedArray = occupiedResponse;
      }

      const processedOccupied = occupiedArray.map((table) => {
        // Parse "AC / 16 / 0" format
        const parts = table['Occupied Tables']?.split(' / ') || [];
        const sectionName = parts[0] || 'Unknown';
        const tableName = parts[1] || 'Unknown';
        const pax = parseInt(parts[2]) || 0;

        return {
          orderId: table.orderid,
          sectionName: sectionName,
          name: tableName,
          pax: pax,
          fullTableName: `${sectionName} / ${tableName}`,
          status: 'Occupied',
        };
      });

      // Process all tables from /api/tables/merge-list
      let allTablesArray = [];
      if (mergeListResponse?.data && Array.isArray(mergeListResponse.data)) {
        allTablesArray = mergeListResponse.data;
      } else if (Array.isArray(mergeListResponse)) {
        allTablesArray = mergeListResponse;
      }

      const processedAllTables = allTablesArray.map((table, index) => {
        const tableParts = table.Tables?.split(' / ') || [];
        const sectionName = tableParts[0] || 'Unknown';
        const tableName = tableParts[1] || 'Unknown';

        // ✅ CRITICAL: Make tableId unique for split tables (chairs)
        // Combine physical tableId with orderId and index to ensure uniqueness in UI
        const uniqueId = `${table.tableId}_${table.orderid || 0}_${index}`;

        return {
          tableId: uniqueId,
          originalTableId: table.tableId, // Keep original numeric ID for API
          orderId: table.orderid || 0,
          name: tableName,
          sectionName: sectionName,
          chairNo: table.chairno || 0,
          pax: table.chairno || 0,
          status: table.orderid > 0 ? 'Occupied' : 'Available',
          fullTableName: table.Tables,
        };
      });

      console.log('✅ Processed occupied tables:', processedOccupied);
      console.log('✅ Processed all tables:', processedAllTables);

      setOccupiedTablesData(processedOccupied);
      setAllTablesData(processedAllTables);
    } catch (err) {
      console.error('❌ Failed to fetch tables:', err);
      showToast('Failed to load tables: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter unselected occupied tables
  const unselectedOccupiedTables = occupiedTablesData.filter(
    ot => !selectedTables.find(st => st.orderId === ot.orderId)
  );

  const handleOccupiedTableClick = (occupiedTable) => {
    // Find the full table data from allTablesData using orderId
    const fullTableData = allTablesData.find(t => t.orderId === occupiedTable.orderId);

    if (!fullTableData) {
      console.error('❌ Could not find full table data for:', occupiedTable);
      showToast('Error: Could not find complete table information', 'error');
      return;
    }

    if (!selectedTables.find(t => t.tableId === fullTableData.tableId)) {
      setSelectedTables([...selectedTables, fullTableData]);
    }
  };

  const handleSelectedTableClick = (table) => {
    setSelectedTables(selectedTables.filter(t => t.tableId !== table.tableId));

    // If the removed table was the transfer target, clear it
    if (transferTarget?.tableId === table.tableId) {
      setTransferTarget(null);
    }
  };

  const handleTransferTargetClick = (table) => {
    setTransferTarget(table);
  };

  const handleConfirm = async () => {
    if (selectedTables.length === 0) {
      showToast('Please select at least one table to merge', 'error');
      return;
    }

    if (!transferTarget) {
      showToast('Please select a transfer target table', 'error');
      return;
    }

    // Validate that at least one selected table has an order
    const tablesWithOrders = selectedTables.filter(t => t.orderId > 0);
    if (tablesWithOrders.length === 0) {
      showToast('Please select at least one occupied table with an active order', 'error');
      return;
    }

    // Determine mergeToOrderId
    let mergeToOrderId = transferTarget.orderId || 0;

    // If target table has no order, use the first selected table's order
    if (mergeToOrderId === 0 && tablesWithOrders.length > 0) {
      mergeToOrderId = tablesWithOrders[0].orderId;
      console.log('⚠️ Target table has no order, using first selected order:', mergeToOrderId);
    }

    // Create orderIds string: include ALL selected tables with orders
    let orderIdsArray = selectedTables
      .filter(t => t.orderId > 0)
      .map(t => t.orderId);

    // Check if target is in selection
    const isTargetInSelection = selectedTables.find(t => t.tableId === transferTarget.tableId);

    // If target is not in selection and has an order, add it
    if (!isTargetInSelection && transferTarget.orderId > 0) {
      orderIdsArray.push(transferTarget.orderId);
    }

    // Remove duplicates
    orderIdsArray = [...new Set(orderIdsArray)];

    if (orderIdsArray.length === 0) {
      showToast('No valid orders found to merge', 'error');
      return;
    }

    const orderIds = orderIdsArray.join('~');

    const payload = {
      mergeToOrderId: mergeToOrderId,
      orderIds: orderIds,
      mergeToTable: transferTarget.originalTableId || transferTarget.tableId,
      chairNo: getTotalPax()
    };

    try {
      console.log('🔄 Merging tables with payload:', payload);
      console.log('📊 Merge details:', {
        selectedTables: selectedTables.map(t => ({
          id: t.tableId,
          name: t.fullTableName,
          orderId: t.orderId
        })),
        targetTable: {
          id: transferTarget.tableId,
          name: transferTarget.fullTableName,
          orderId: transferTarget.orderId
        },
        orderIds: orderIdsArray
      });

      const response = await mergeTables(payload);

      console.log('✅ Merge response:', response);

      showToast(
        `Successfully merged ${selectedTables.length} tables to ${transferTarget.fullTableName}`,
        'success'
      );

      // Navigate back to tables page after a short delay
      setTimeout(() => {
        navigate('/tables');
      }, 1500);

    } catch (error) {
      console.error('❌ Merge failed:', error);
      showToast('Failed to merge tables: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleClose = () => {
    navigate('/tables');
  };

  const getTotalPax = () => {
    return selectedTables.reduce((sum, t) => sum + (t.pax || 0), 0);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <div className="text-gray-600">Loading tables...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
          <h1 className="text-xl font-semibold text-gray-800">Merge and Transfer</h1>

        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FaTimes size={24} />
        </button>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* Left Panel - Occupied Tables */}
        <div className="flex-1 flex flex-col bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-red-50 border-b px-4 py-3">
            <h3 className="font-semibold text-gray-700">
              Occupied Tables ({occupiedTablesData.length})
            </h3>
          </div>
          {/* ✅ Hidden scrollbar */}
          <div
            className="flex-1 overflow-y-auto"
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

            {unselectedOccupiedTables.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="font-medium">
                  {occupiedTablesData.length === 0 ? 'No occupied tables' : 'All occupied tables selected'}
                </div>
              </div>
            ) : (
              unselectedOccupiedTables.map((table, index) => (
                <div
                  key={`occupied-${table.orderId}-${index}`}
                  onClick={() => handleOccupiedTableClick(table)}
                  className="px-4 py-3 border-b cursor-pointer transition-all hover:bg-blue-50 active:bg-blue-100"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-800 font-medium">
                        {table.fullTableName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Order ID: {table.orderId}
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel - Selected Tables */}
        <div className="flex-1 flex flex-col bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-blue-50 border-b px-4 py-3">
            <h3 className="font-semibold text-gray-700">
              Selected Tables {selectedTables.length > 0 && `(${selectedTables.length})`}
            </h3>
          </div>
          {/* ✅ Hidden scrollbar */}
          <div
            className="flex-1 overflow-y-auto"
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

            {selectedTables.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="font-medium">No tables selected</div>
                <div className="text-sm mt-1">Select tables from the left</div>
              </div>
            ) : (
              selectedTables.map(table => (
                <div
                  key={`selected-${table.tableId}`}
                  onClick={() => handleSelectedTableClick(table)}
                  className="px-4 py-3 border-b hover:bg-red-50 cursor-pointer transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-800 font-medium">
                        {table.fullTableName}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Order ID: {table.orderId || 'None'}
                      </div>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>

          {/* Selected Summary */}
          {selectedTables.length > 0 && (
            <div className="bg-blue-50 border-t px-4 py-3">
              <div className="text-sm">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Total Tables:</span>
                  <span className="font-semibold text-gray-800">{selectedTables.length}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Active Orders:</span>
                  <span className="font-semibold text-gray-800">
                    {selectedTables.filter(t => t.orderId > 0).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Transfer to Table */}
        <div className="flex-1 flex flex-col bg-white border rounded-lg overflow-hidden shadow-sm">
          <div className="bg-green-50 border-b px-4 py-3">
            <h3 className="font-semibold text-gray-700">
              Transfer to Table ({allTablesData.length})
            </h3>
          </div>
          {/* ✅ Hidden scrollbar */}
          <div
            className="flex-1 overflow-y-auto"
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

            {allTablesData.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="text-4xl mb-3">🚫</div>
                <div className="font-medium">No tables available</div>
              </div>
            ) : (
              allTablesData.map((table, index) => {
                const isSelected = transferTarget?.tableId === table.tableId;
                const isInMergeList = selectedTables.find(t => t.tableId === table.tableId);

                return (
                  <div
                    key={`transfer-${table.tableId}-${table.orderId}-${index}`}
                    onClick={() => handleTransferTargetClick(table)}
                    className={`px-4 py-3 border-b transition-all cursor-pointer ${isSelected
                      ? 'bg-green-100 border-l-4 border-l-green-600'
                      : isInMergeList
                        ? 'bg-blue-50 hover:bg-green-50'
                        : table.status === 'Occupied'
                          ? 'bg-red-25 hover:bg-green-50'
                          : 'hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="text-gray-800 font-medium">
                          {table.fullTableName}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {table.orderId > 0 ? `Order ID: ${table.orderId}` : 'Available'}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {isSelected && (
                          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded font-medium">
                            ✓ Target
                          </span>
                        )}
                        {isInMergeList && !isSelected && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                            Merging
                          </span>
                        )}
                        {table.status === 'Occupied' && !isInMergeList && !isSelected && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                            Occupied
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Transfer Info */}
          {transferTarget && (
            <div className="bg-green-50 border-t px-4 py-3">
              <div className="text-sm">
                <div className="font-semibold text-green-800 mb-2">
                  ✓ Merge Destination Selected
                </div>
                <div className="text-gray-700">
                  <span className="font-medium">Target:</span> {transferTarget.fullTableName}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="text-sm text-gray-600">
          {selectedTables.length > 0 && transferTarget && (
            <span>
              Merging <strong>{selectedTables.length} table(s)</strong> → <strong>{transferTarget.fullTableName}</strong>
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedTables.length === 0 || !transferTarget}
            className={`px-6 py-2.5 rounded-lg transition-colors font-medium ${selectedTables.length === 0 || !transferTarget
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 shadow-lg'
              }`}
          >
            Merge & Transfer
          </button>
        </div>
      </div>
    </div>
  );
};

export default MergeTransferPage;