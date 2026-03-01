import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaTimes, FaPlus } from 'react-icons/fa';
import { addChairToTable } from '../services/apicall';

const AddChairPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const table = location.state?.table;

  if (!table) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-lg font-semibold text-gray-800 mb-2">No Table Selected</div>
          <div className="text-sm text-gray-600 mb-4">Please select a table from the tables page</div>
          <button
            onClick={() => navigate('/tables')}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to Tables
          </button>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    // Generate a unique chair code (2-digit random number)
    const chairCode = Math.floor(10 + Math.random() * 90).toString(); // Generates numbers like 22, 66, 12, etc.
    
    try {
      console.log('🪑 Creating new chair:', {
        tableId: table.tableId,
        tableName: table.name,
        chairCode: chairCode
      });

      const response = await addChairToTable(table.tableId);
      
      console.log('✅ Add chair API response:', response);

      if (response?.success || response?.childTableCode || response?.newChildCode) {
        // Use the chair code from API response
        const actualChairCode = response?.newChildCode || response?.childTableCode || chairCode;
        
        // Create a new chair table object for billing
        const newChairTable = {
          tableId: table.tableId,
          name: `${table.name}-${actualChairCode}`,
          Section_name: table.Section_name,
          sectionId: table.sectionId,
          orderId: 0, // ✅ Always 0 for new chairs - they need a new order
          orderStatus: null,
          pax: 1, // One chair
          isChild: true,
          parentTableId: table.tableId,
          childTableCode: actualChairCode,
          tableCode: response?.tableCode || `${table.name}-${actualChairCode}` // Use API's tableCode if available
        };
        
        console.log('🚀 Navigating to billing for new chair:', newChairTable);
        
        // Navigate to billing to create order for this chair
        navigate('/billing', {
          state: {
            table: newChairTable,
            numPersons: 1,
            existingOrder: false, // ✅ Always false for new chairs
            orderId: null, // ✅ Always null for new chairs - force new order creation
            items: [],
            isNewChair: true // Flag to indicate this is a newly added chair
          }
        });
      } else {
        console.error('❌ Failed to add chair:', response?.message);
      }
    } catch (error) {
      console.error('❌ Error adding chair:', error);
    }
  };

  const handleClose = () => {
    navigate('/tables');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Add Chair - Table {table.name}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a new chair for this table • {table.Section_name}
          </p>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <FaTimes size={24} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Current Table Info */}
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">PARENT TABLE</div>
                <div className="text-2xl font-semibold text-gray-800">Table {table.name}</div>
                <div className="text-gray-600 mt-1">{table.Section_name}</div>
                {table.orderId && (
                  <div className="text-sm text-gray-500 mt-2">Order #{table.orderId}</div>
                )}
              </div>
              <div className="text-right bg-blue-50 px-6 py-4 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">CURRENT PAX</div>
                <div className="text-4xl font-bold text-blue-600">{table.pax || 0}</div>
              </div>
            </div>
          </div>

          {/* Add Chair Info */}
          <div className="bg-white border rounded-lg p-8 mb-4 shadow-sm text-center">
            <div className="text-6xl mb-4">🪑</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Add New Chair</h2>
            <p className="text-gray-600 mb-6">
              A new chair will be created 
            </p>
            <p className="text-sm text-gray-500 mb-4">
              After clicking "Add Chair", you'll be taken to the billing page to create an order for this new chair.
            </p>
            
          
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-white px-6 py-4 flex justify-end gap-3 shadow-sm">
        <button
          onClick={handleClose}
          className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
        >
          <FaPlus />
          Add Chair & Create Order
        </button>
      </div>
    </div>
  );
};

export default AddChairPage;