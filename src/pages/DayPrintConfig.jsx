import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Printer, ArrowLeft, Loader2, X, Table2 } from 'lucide-react';
import Header from '../components/Header';
import SettingsSidebar from '../components/SettingsSidebar';
import DayClosePopup from '../components/DayClosePopup';
import SalesDateResetPopup from '../components/SalesDateResetPopup';
import ResendReportMailPopup from '../components/ResendReportMailPopup';
import { printReportConfig, getReportPreviewData } from '../services/apicall';
import { PERMISSIONS, hasPermission, clearPermissions } from '../components/permissions';
import SupervisorPasswordModal from '../components/SupervisorPasswordModal';

const formatCellValue = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number') {
        return Number.isInteger(value)
            ? value.toLocaleString()
            : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
};

const isNumericColumn = (rows, col) => {
    if (!rows?.length) return false;
    const sample = rows.slice(0, 20).map((r) => r[col]).find((v) => v !== null && v !== undefined && v !== '');
    return typeof sample === 'number';
};

const DayPrintConfig = () => {
    const navigate = useNavigate();
    const [fromDate, setFromDate] = useState(new Date().toISOString().split('T')[0]);
    const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: '' });
    const [showSupervisorModal, setShowSupervisorModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [showDayClosePopup, setShowDayClosePopup] = useState(false);
    const [showSalesDateResetPopup, setShowSalesDateResetPopup] = useState(false);
    const [showResendReportMailPopup, setShowResendReportMailPopup] = useState(false);

    const [pendingAction, setPendingAction] = useState(null);
    const [modalPermission, setModalPermission] = useState({ id: PERMISSIONS.DAY_REPORT_PRINT, name: 'Day Report Print' });

    const [lastPreviewedRange, setLastPreviewedRange] = useState({ from: null, to: null });
    const [previewData, setPreviewData] = useState(null);

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
    };

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

    const executePreview = async () => {
        if (lastPreviewedRange.from === fromDate && lastPreviewedRange.to === toDate && previewData) {
            showToast('Already showing preview for this date range', 'info');
            return;
        }

        setPreviewLoading(true);
        try {
            const data = await getReportPreviewData(fromDate, toDate);
            if (!data?.success) {
                showToast(data?.message || 'Failed to load preview', 'error');
                setPreviewData(null);
                return;
            }

            setPreviewData(data);
            setLastPreviewedRange({ from: fromDate, to: toDate });
            showToast(data.message || 'Preview loaded', 'success');
        } catch (error) {
            console.error('Preview Error:', error);
            showToast(error?.message || 'Failed to load preview', 'error');
            setPreviewData(null);
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

    const handleSalesDateReset = () => {
        setShowSalesDateResetPopup(true);
    };

    const confirmSalesDateReset = () => {
        setShowSalesDateResetPopup(false);
        handleLogout();
    };

    const cancelSalesDateReset = () => {
        setShowSalesDateResetPopup(false);
    };

    const handleResendReportMail = () => {
        setShowResendReportMailPopup(true);
    };

    const handleSupervisorSuccess = () => {
        setShowSupervisorModal(false);
        if (pendingAction) {
            performAction(pendingAction);
            setPendingAction(null);
        }
    };

    const handleFromDateChange = (e) => {
        setFromDate(e.target.value);
        setPreviewData(null);
        setLastPreviewedRange({ from: null, to: null });
    };

    const handleToDateChange = (e) => {
        setToDate(e.target.value);
        setPreviewData(null);
        setLastPreviewedRange({ from: null, to: null });
    };

    const reports = previewData?.reports || [];
    const org = previewData?.organization;

    const dateLabel = fromDate === toDate
        ? new Date(fromDate + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
        : `${new Date(fromDate + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}  →  ${new Date(toDate + 'T00:00:00').toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;

    const renderReportSection = (report) => {
        const numericFlags = {};
        (report.columns || []).forEach((col) => {
            numericFlags[col] = isNumericColumn(report.rows, col);
        });

        return (
            <section key={report.reportName} className="mb-6 last:mb-0">
                {/* Report name — same flow as thermal print */}
                <div className="mb-2">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
                        {report.reportName}
                    </h3>
                    <div className="mt-1 border-t border-dashed border-slate-300" />
                </div>

                {report.error ? (
                    <p className="text-sm text-red-600 py-3">Error: {report.error}</p>
                ) : !report.hasData || !report.rows?.length ? (
                    <p className="text-sm text-slate-400 py-3 italic">No data for this report.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-100 border-b border-slate-200">
                                    {report.columns.map((col) => (
                                        <th
                                            key={col}
                                            className={`px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap ${
                                                numericFlags[col] ? 'text-right' : 'text-left'
                                            }`}
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {report.rows.map((row, rowIdx) => (
                                    <tr
                                        key={rowIdx}
                                        className={`border-b border-slate-100 last:border-0 ${
                                            rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                                        }`}
                                    >
                                        {report.columns.map((col) => (
                                            <td
                                                key={col}
                                                className={`px-3 py-1.5 text-slate-800 whitespace-nowrap ${
                                                    numericFlags[col]
                                                        ? 'text-right font-semibold tabular-nums'
                                                        : 'text-left'
                                                }`}
                                            >
                                                {formatCellValue(row[col])}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {report.rowCount > report.rows.length && (
                            <p className="px-3 py-1.5 text-[11px] text-amber-700 bg-amber-50 border-t border-amber-100">
                                Showing first {report.rows.length} of {report.rowCount} rows
                            </p>
                        )}
                    </div>
                )}
            </section>
        );
    };

    return (
        <div className="h-screen bg-blue-50 flex flex-col font-sans overflow-hidden">
            <Header handleSettings={handleSettings} />

            {toast.show && (
                <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded shadow-lg transition-all duration-300 flex items-center gap-2 ${
                    toast.type === 'success' ? 'bg-green-600 text-white' :
                    toast.type === 'error' ? 'bg-red-600 text-white' :
                    'bg-blue-600 text-white'
                }`}>
                    <span className="font-semibold text-sm">{toast.message}</span>
                </div>
            )}

            <main className="flex-1 p-3 flex flex-col min-h-0 overflow-hidden">
                {/* One single page: controls + report together */}
                <div className="flex-1 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col min-h-0">
                    {/* Sticky controls header (same card as report) */}
                    <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-1.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-current" />
                            </button>
                            <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Day Report Print</h1>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
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

                            <div className="h-8 w-px bg-gray-200 mx-1 hidden lg:block" />

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleActionWithPermission('preview', PERMISSIONS.DAY_REPORT_PRINT, 'Day Report Print')}
                                    disabled={previewLoading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded shadow-sm font-bold text-xs flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    {previewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Table2 className="w-3.5 h-3.5" />}
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

                    {/* Report body — same card, continuous scroll */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {previewLoading ? (
                            <div className="h-full min-h-[280px] flex flex-col items-center justify-center space-y-4">
                                <div className="p-4 bg-blue-50 rounded-full">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-700 animate-pulse">Loading report data...</p>
                            </div>
                        ) : previewData ? (
                            <div className="max-w-5xl mx-auto px-5 py-6">
                                <header className="text-center mb-5 pb-4 border-b-2 border-slate-800">
                                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                                        {org?.name || 'Organization'}
                                    </h2>
                                    {org?.address ? (
                                        <p className="text-sm text-slate-500 mt-1">{org.address}</p>
                                    ) : null}
                                    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                                        {org?.gstin ? <span>GSTIN: {org.gstin}</span> : null}
                                        {org?.contactNumber ? <span>Tel: {org.contactNumber}</span> : null}
                                    </div>
                                    <p className="mt-3 text-sm font-bold text-slate-800">
                                        {fromDate === toDate ? `Date: ${dateLabel}` : dateLabel}
                                    </p>
                                    <div className="mt-3 border-t border-dashed border-slate-300" />
                                </header>

                                {reports.map((report) => renderReportSection(report))}

                                <footer className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                        *** End of Reports ***
                                    </p>
                                </footer>
                            </div>
                        ) : (
                            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-12">
                                <div className="p-6 bg-slate-50 rounded-full shadow-sm mb-6 border border-gray-100">
                                    <Table2 className="w-12 h-12 text-gray-200" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-400">Ready to Load Reports</h3>
                                <p className="text-sm text-gray-400 mt-2 max-w-sm">
                                    Select dates above and click <b>Preview</b> to see the full day report on this page.
                                </p>
                            </div>
                        )}
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
                handleSalesDateReset={handleSalesDateReset}
                handleResendReportMail={handleResendReportMail}
            />

            <SalesDateResetPopup
                isOpen={showSalesDateResetPopup}
                onConfirm={confirmSalesDateReset}
                onCancel={cancelSalesDateReset}
            />

            <ResendReportMailPopup
                isOpen={showResendReportMailPopup}
                onClose={() => setShowResendReportMailPopup(false)}
            />
        </div>
    );
};

export default DayPrintConfig;
