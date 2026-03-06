import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Printer, ArrowLeft, Loader2, X } from 'lucide-react';
import Header from '../components/Header';
import SettingsSidebar from '../components/SettingsSidebar';
import DayClosePopup from '../components/DayClosePopup';
import { printReportConfig, getReportPreview,  } from '../services/apicall';
import { PERMISSIONS, hasPermission, clearPermissions } from '../components/permissions';
import SupervisorPasswordModal from '../components/SupervisorPasswordModal';

const DayPrintConfig = () => {
    const navigate = useNavigate();
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [showSupervisorModal, setShowSupervisorModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [previewContent, setPreviewContent] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showDayClosePopup, setShowDayClosePopup] = useState(false);

    // Permission & Action States
    const [pendingAction, setPendingAction] = useState(null); // 'preview', 'print', 'dayClose'
    const [modalPermission, setModalPermission] = useState({ id: PERMISSIONS.DAY_REPORT_PRINT, name: 'Day Report Print' });

    // Cache: track the last previewed date range to avoid redundant calls
    const [lastPreviewedRange, setLastPreviewedRange] = useState({ from: null, to: null });

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

    // Cleanup blob URL on unmount only
    useEffect(() => {
        return () => {
            if (previewContent) URL.revokeObjectURL(previewContent);
        };
    }, []);

    // Unified Permission Handler
    const handleActionWithPermission = (action, permId, permName) => {
        if (hasPermission(permId)) {
            performAction(action);
        } else {
            setPendingAction(action);
            setModalPermission({ id: permId, name: permName });
            setShowSupervisorModal(true);
        }
    };

    const performAction = (action) => {
        if (action === 'preview') executePreview();
        if (action === 'print') executePrint();
        if (action === 'dayClose') executeDayClose();
    };

    // Show preview logic
    const executePreview = async () => {
        // Skip API call if same date range already loaded (client-side cache)
        if (lastPreviewedRange.from === fromDate && lastPreviewedRange.to === toDate && previewContent) {
            showToast('Already showing preview for this date range', 'info');
            return;
        }

        setPreviewLoading(true);
        try {
            if (previewContent) URL.revokeObjectURL(previewContent);

            // Send plain date strings — backend gets "2026-02-27" not a UTC timestamp
            const blob = await getReportPreview(fromDate, toDate);
            const url = URL.createObjectURL(blob);
            setPreviewContent(url);
            setLastPreviewedRange({ from: fromDate, to: toDate });
        } catch (error) {
            console.error('Preview Error:', error);
            showToast('Failed to load preview', 'error');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleSettings = () => setShowSettings(!showSettings);

    const executePrint = async () => {
        setLoading(true);
        try {
            await printReportConfig(fromDate, toDate);
            showToast('Print request sent successfully!', 'success');
        } catch (error) {
            console.error('Print Error:', error);
            showToast(error.message || 'Failed to send print request', 'error');
        } finally {
            setLoading(false);
        }
    };

    const executeDayClose = () => {
        setShowDayClosePopup(true);
    };

    const handleLogout = () => {
        // Clear permissions on logout
        clearPermissions();

        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('userId');
        localStorage.removeItem('subscriberId');
        localStorage.removeItem('restaurantName');
        localStorage.removeItem('userName');
        sessionStorage.clear();

        showToast('Logged out successfully', 'success');
        setTimeout(() => {
            navigate('/login', { replace: true });
        }, 1000);
    };

    const confirmDayClose = () => {
        setShowDayClosePopup(false);
        handleLogout();
    };

    const cancelDayClose = () => {
        setShowDayClosePopup(false);
    };

    const handleSupervisorSuccess = () => {
        setShowSupervisorModal(false);
        if (pendingAction) {
            performAction(pendingAction);
            setPendingAction(null);
        }
    };

    // Reset preview when date changes so user knows to click Preview again
    const handleFromDateChange = (e) => {
        setFromDate(e.target.value);
        setPreviewContent(null);
        setLastPreviewedRange({ from: null, to: null });
    };

    const handleToDateChange = (e) => {
        setToDate(e.target.value);
        setPreviewContent(null);
        setLastPreviewedRange({ from: null, to: null });
    };

    return (
        <div className="h-screen bg-blue-50 flex flex-col font-sans overflow-hidden">
            <Header handleSettings={handleSettings} />

            {/* TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded shadow-lg transition-all duration-300 flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-600 text-white' :
                    toast.type === 'error' ? 'bg-red-600 text-white' :
                        'bg-blue-600 text-white'
                    }`}>
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            <main className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden">
                {/* CONSOLIDATED HEADER & FILTERS */}
                <div className="bg-white rounded shadow p-3 mb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-current" />
                        </button>
                        <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Day Report Print</h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">From</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    type="date"
                                    className="pl-7 pr-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none w-36 bg-white font-medium"
                                    value={fromDate}
                                    onChange={handleFromDateChange}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">To</label>
                            <div className="relative">
                                <Calendar className="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                <input
                                    type="date"
                                    className="pl-7 pr-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 outline-none w-36 bg-white font-medium"
                                    value={toDate}
                                    onChange={handleToDateChange}
                                />
                            </div>
                        </div>

                        <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block"></div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleActionWithPermission('preview', PERMISSIONS.DAY_REPORT_PRINT, 'Day Report Print')}
                                disabled={previewLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded shadow-sm font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                <span>Preview</span>
                            </button>
                            <button
                                onClick={() => handleActionWithPermission('print', PERMISSIONS.DAY_REPORT_PRINT, 'Day Report Print')}
                                disabled={loading}
                                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-1.5 rounded shadow-sm font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {loading && pendingAction === 'print' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                                <span>Print</span>
                            </button>
                            <button
                                onClick={() => handleActionWithPermission('dayClose', PERMISSIONS.DAY_CLOSE, 'Day Close')}
                                disabled={loading}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded shadow-sm font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                            >
                                {loading && pendingAction === 'dayClose' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                <span>Day Close</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* FULL SCREEN PREVIEW SECTION */}
                <div className="flex-1 bg-white rounded shadow-md overflow-hidden flex flex-col border border-gray-200">


                    <div className="flex-1 flex flex-row bg-white">
                        {/* Left Side: Empty Space */}
                        <div className="flex-1 hidden lg:block bg-white"></div>

                        {/* Right Side: Report Preview (50% Width) */}
                        <div className="flex-1 bg-white flex flex-col relative border-l border-gray-400 shadow-2xl">
                            {previewLoading ? (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-4 bg-white/80 backdrop-blur-sm">
                                    <div className="p-4 bg-blue-50 rounded-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    </div>
                                    <p className="text-sm font-bold text-gray-700 animate-pulse">Generating high-resolution report...</p>
                                </div>
                            ) : previewContent ? (
                                <iframe
                                    src={`${previewContent}#navpanes=0&view=FitH`}
                                    className="absolute inset-0 w-full h-full border-none bg-white"
                                    title="Report Preview"
                                />
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                    <div className="p-6 bg-white rounded-full shadow-sm mb-6 border border-gray-100">
                                        <Printer className="w-12 h-12 text-gray-200" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-400">Ready to Load Preview</h3>
                                    <p className="text-sm text-gray-400 mt-2 max-w-sm">
                                        Configure your date range above and click <b>Preview</b> to visualize the report content.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <SupervisorPasswordModal
                isOpen={showSupervisorModal}
                onClose={() => setShowSupervisorModal(false)}
                onSuccess={handleSupervisorSuccess}
                permissionId={modalPermission.id}
                permissionName={modalPermission.name}
            />

            <DayClosePopup
                isOpen={showDayClosePopup}
                onConfirm={confirmDayClose}
                onCancel={cancelDayClose}
            />

            <SettingsSidebar
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
};

export default DayPrintConfig;