import React, { useEffect, useState } from "react";
import { sendDayCloseMailAPI } from "../services/apicall";

const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDefaultDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toInputDate(yesterday);
};

const formatDisplayDate = (isoDate) =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function ResendReportMailPopup({ isOpen, onClose }) {
  const [fromDate, setFromDate] = useState(getDefaultDate());
  const [toDate, setToDate] = useState(getDefaultDate());
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      const d = getDefaultDate();
      setFromDate(d);
      setToDate(d);
      setErrorMessage("");
      setSuccessMessage("");
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!fromDate || !toDate) {
      setErrorMessage("Please select from date and to date.");
      return;
    }

    if (fromDate > toDate) {
      setErrorMessage("From date cannot be after to date.");
      return;
    }

    const today = toInputDate(new Date());
    if (fromDate > today || toDate > today) {
      setErrorMessage("Cannot send mail for a future date.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await sendDayCloseMailAPI(fromDate, toDate);

      if (response.success) {
        const rangeLabel =
          fromDate === toDate
            ? formatDisplayDate(fromDate)
            : `${formatDisplayDate(fromDate)} to ${formatDisplayDate(toDate)}`;
        setSuccessMessage(response.message || `Report mail sent for ${rangeLabel}`);
      } else {
        setErrorMessage(response.message || "Failed to send report mail");
      }
    } catch (error) {
      console.error("❌ Error resending report mail:", error);
      setErrorMessage(error.message || "Failed to send report mail. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setErrorMessage("");
    setSuccessMessage("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
        {successMessage ? (
          <>
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-3">Mail Sent</h2>
              <p className="text-sm text-gray-700 mb-4">{successMessage}</p>
            </div>
            <button
              className="w-full px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700"
              onClick={handleClose}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold mb-2">Resend Report Mail</h2>
            <p className="text-sm text-gray-600 mb-4">
              Send report mail for a date range. This does not close the day.
            </p>

            <div className="mb-3 text-left">
              <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                max={toInputDate(new Date())}
                onChange={(e) => setFromDate(e.target.value)}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4 text-left">
              <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                max={toInputDate(new Date())}
                onChange={(e) => setToDate(e.target.value)}
                disabled={isLoading}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-red-800 text-sm text-left font-medium">{errorMessage}</p>
              </div>
            )}

            <div className="flex justify-between gap-3">
              <button
                className={`flex-1 px-4 py-2 rounded transition font-medium ${
                  isLoading
                    ? "bg-blue-400 text-white cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                onClick={handleSend}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Mail"}
              </button>

              <button
                className={`flex-1 px-4 py-2 rounded transition font-medium ${
                  isLoading
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                }`}
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
