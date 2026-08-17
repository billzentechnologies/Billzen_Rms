import React, { useState, useEffect } from "react";
import { resetSalesDateAPI, getSalesDate } from "../services/apicall";

export default function SalesDateResetPopup({ isOpen, onConfirm, onCancel }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [currentSalesDate, setCurrentSalesDate] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSalesDate();
    }
  }, [isOpen]);

  const fetchSalesDate = async () => {
    try {
      const response = await getSalesDate();
      if (response.success && response.data) {
        const currentDate = new Date(response.data.saleDate);
        setCurrentSalesDate(currentDate);
      }
    } catch (error) {
      console.error("❌ Error fetching sales date for reset popup:", error);
    }
  };

  if (!isOpen) return null;

  const handleReset = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await resetSalesDateAPI();

      if (response.success) {
        setShowSuccess(true);
        setSuccessData(response.data);

        // Clear sales date from localStorage
        localStorage.removeItem('salesDate');
        localStorage.removeItem('salesDateFormatted');

        // Close popup and call onConfirm after 2 seconds
        setTimeout(() => {
          onConfirm();
        }, 2000);
      } else {
        setErrorMessage(response.message || 'Failed to reset sales date');
        setIsLoading(false);
      }
    } catch (error) {
      console.error("❌ Error resetting sales date:", error);
      setErrorMessage(error.message || "Failed to reset sales date. Please check your connection and try again.");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setErrorMessage("");
    setShowSuccess(false);
    setSuccessData(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
        {showSuccess ? (
          <>
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-3">Sales Date Reset Successfully!</h2>
              <p className="text-gray-600 text-sm mb-4">The sales date has been reset to the previous state.</p>
              <p className="text-gray-500 text-sm">Logging out...</p>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-4">Sales Date Reset</h2>

            {errorMessage ? (
              <div className="mb-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-red-800 text-sm text-left font-medium">{errorMessage}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 space-y-4">
                <p className="text-gray-700 font-medium">Are you sure you want to reset the sales date?</p>
                <p className="text-sm text-gray-500">This action will revert the current sales date. Please ensure all transactions are finalized before proceeding.</p>
                {currentSalesDate && (
                  <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Sale Date:</span>
                      <span className="font-bold text-orange-700">{currentSalesDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button
                className={`flex-1 px-4 py-2 rounded transition font-medium ${isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                  }`}
                onClick={handleReset}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Yes'}
              </button>

              <button
                className={`flex-1 px-4 py-2 rounded transition font-medium ${isLoading
                  ? 'bg-red-400 cursor-not-allowed text-white'
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-md'
                  }`}
                onClick={handleCancel}
                disabled={isLoading}
              >
                {errorMessage ? 'Close' : 'No'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
