import React, { useState, useRef, useEffect } from 'react';
import { Printer } from 'lucide-react';
import {
  getBillWiseReport,
  getPaymentWiseReport,
  getSalesByItem,
  getTransactionReport,
  getVoidReport,
  getCancelReport,
  getSubCategoryReport,
  getDiscountReport,
  getSectionWiseReport,
  getComplimentaryReport,
} from '../services/apicall';

const ReportButton = ({ label, tab, activeTab, setActiveTab }) => (
  <button
    onClick={() => setActiveTab(tab)}
    className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-700 ${activeTab === tab ? 'bg-gray-700 font-semibold' : ''
      } text-white`}
  >
    {label}
  </button>
);

const ReportWrapper = ({ title, printRef, onPrint, children }) => (
  <div className="bg-white rounded-xl shadow p-4 mb-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <button
        onClick={onPrint}
        className="flex items-center bg-gray-800 gap-1 text-white px-3 py-1.5 rounded hover:bg-gray-700 text-sm"
      >
        <Printer size={16} /> Print
      </button>
    </div>
    <div ref={printRef}>{children}</div>
  </div>
);

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [voidReports, setVoidReports] = useState([]);
  const [voidReportsAPI, setVoidReportsAPI] = useState([]);
  const [cancelReports, setCancelReports] = useState([]);
  const [cancelReportsAPI, setCancelReportsAPI] = useState([]);
  const [ncReports, setNcReports] = useState([]);
  const [discountReports, setDiscountReports] = useState([]);
  const [billWiseReports, setBillWiseReports] = useState([]);
  const [paymentWiseReports, setPaymentWiseReports] = useState([]);
  const [itemWiseReports, setItemWiseReports] = useState([]);
  const [transactionReports, setTransactionReports] = useState([]);
  const [subCategoryReportsAPI, setSubCategoryReportsAPI] = useState([]);
  const [discountReportsAPI, setDiscountReportsAPI] = useState([]);
  const [sectionWiseReportsAPI, setSectionWiseReportsAPI] = useState([]);
  const [itemComplimentaryReportsAPI, setItemComplimentaryReportsAPI] = useState([]);

  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('itemWise');
  const [filters, setFilters] = useState({
    fromDate: new Date().toISOString().split('T')[0],
    toDate: new Date().toISOString().split('T')[0],
    itemName: '',
    category: '',
    subCategory: '',
    paymentMethod: '',
    billNumber: '',
    username: '',
    section: '',
    transactionType: '',
    sectionName: '',
  });

  const printRef = useRef(null);

  // Load local data
  useEffect(() => {
    setReports(JSON.parse(localStorage.getItem('reports') || '[]'));
    setVoidReports(JSON.parse(localStorage.getItem('voidReports') || '[]'));
    setCancelReports(JSON.parse(localStorage.getItem('cancelReports') || '[]'));
    setNcReports(JSON.parse(localStorage.getItem('ncReports') || '[]'));
    setDiscountReports(JSON.parse(localStorage.getItem('discountReports') || '[]'));
  }, []);

  // API calls per tab
  useEffect(() => {
    if (activeTab === 'billWise' && filters.fromDate && filters.toDate) {
      fetchBillWiseReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'paymentSummary' && filters.fromDate && filters.toDate) {
      fetchPaymentWiseReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'itemWise' && filters.fromDate && filters.toDate) {
      fetchItemWiseReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'transactionWise' && filters.fromDate && filters.toDate) {
      fetchTransactionReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'itemVoid' && filters.fromDate && filters.toDate) {
      fetchVoidReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'cancelReport' && filters.fromDate && filters.toDate) {
      fetchCancelReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'subCategoryReport' && filters.fromDate && filters.toDate) {
      fetchSubCategoryReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'discountReport' && filters.fromDate && filters.toDate) {
      fetchDiscountReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'sectionWise' && filters.fromDate && filters.toDate) {
      fetchSectionWiseReport();
      fetchDiscountReport(); // Fetch discount report to get total discount
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'itemComplimentary' && filters.fromDate && filters.toDate) {
      fetchItemComplimentaryReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  const fetchBillWiseReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const data = await getBillWiseReport(filters.fromDate, filters.toDate);
      if (data.StatusCode === '200') {
        setBillWiseReports(data.BillWiseReports || []);
      } else {
        setBillWiseReports([]);
      }
    } catch (error) {
      console.error('Failed to fetch bill wise report:', error);
      setBillWiseReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentWiseReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const data = await getPaymentWiseReport(filters.fromDate, filters.toDate);
      if (data.StatusCode === '200') {
        setPaymentWiseReports(data.PaymentWiseReports || []);
      } else {
        setPaymentWiseReports([]);
      }
    } catch (error) {
      console.error('Failed to fetch payment wise report:', error);
      setPaymentWiseReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemWiseReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const data = await getSalesByItem(filters.fromDate, filters.toDate);
      const rows = Array.isArray(data) ? data : data.SalesByItem || [];
      setItemWiseReports(rows);
    } catch (error) {
      console.error('Failed to fetch item wise report:', error);
      setItemWiseReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactionReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getTransactionReport(filters.fromDate, filters.toDate);
      console.log('Transaction Report API Response:', response);

      if (response.success || response.data?.Success) {
        const transactionData = response.data?.TransactionSalesData || response.TransactionSalesData || [];
        setTransactionReports(transactionData);
      } else {
        setTransactionReports([]);
      }
    } catch (error) {
      console.error('Failed to fetch transaction report:', error);
      setTransactionReports([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchVoidReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getVoidReport(filters.fromDate, filters.toDate);
      console.log('Void Report API Response:', response);

      if (response.success && response.data) {
        setVoidReportsAPI(response.data);
      } else {
        setVoidReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch void report:', error);
      setVoidReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCancelReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getCancelReport(filters.fromDate, filters.toDate);
      console.log('Cancel Report API Response:', response);

      if (response.success && response.data) {
        setCancelReportsAPI(response.data);
      } else {
        setCancelReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch cancel report:', error);
      setCancelReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubCategoryReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getSubCategoryReport(filters.fromDate, filters.toDate);
      console.log('Sub-Category Report API Response:', response);

      if (response.success && response.data) {
        setSubCategoryReportsAPI(response.data);
      } else {
        setSubCategoryReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch sub-category report:', error);
      setSubCategoryReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiscountReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getDiscountReport(filters.fromDate, filters.toDate);
      console.log('Discount Report API Response:', response);

      if (response.success && response.data) {
        setDiscountReportsAPI(response.data);
      } else {
        setDiscountReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch discount report:', error);
      setDiscountReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionWiseReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getSectionWiseReport(
        filters.fromDate,
        filters.toDate,
        null,
        null
      );
      console.log('Section-wise Report API Response:', response);

      // Check different possible response structures
      if (response.success && response.data) {
        setSectionWiseReportsAPI(response.data);
      } else if (Array.isArray(response)) {
        setSectionWiseReportsAPI(response);
      } else if (response.data) {
        setSectionWiseReportsAPI(response.data);
      } else {
        setSectionWiseReportsAPI(Array.isArray(response) ? response : []);
      }
    } catch (error) {
      console.error('Failed to fetch section-wise report:', error);
      setSectionWiseReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchItemComplimentaryReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;

    setLoading(true);
    try {
      const response = await getComplimentaryReport(filters.fromDate, filters.toDate);
      console.log('Item Complimentary Report API Response:', response);

      if (response.success && response.data) {
        setItemComplimentaryReportsAPI(response.data);
      } else {
        setItemComplimentaryReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch item complimentary report:', error);
      setItemComplimentaryReportsAPI([]);
    } finally {
      setLoading(false);
    }
  };

  // ---------- LOCAL REPORT CALCS ----------
  const itemWiseData = {};
  reports.forEach(r =>
    r.items.forEach(item => {
      const key = item.name;
      if (!itemWiseData[key]) {
        itemWiseData[key] = {
          quantity: 0,
          gross: 0,
          category: item.category || '',
          subCategory: item.subCategory || '',
        };
      }
      itemWiseData[key].quantity += item.quantity;
      itemWiseData[key].gross += item.quantity * item.price;
    })
  );
  Object.values(itemWiseData).forEach(d => {
    d.sgst = d.gross * 0.025;
    d.cgst = d.gross * 0.025;
    d.net = d.gross + d.sgst + d.cgst;
  });

  // SUB-CATEGORY WISE
  const subCategoryWiseData = {};
  Object.entries(itemWiseData).forEach(([name, d]) => {
    const sc = d.subCategory || 'Uncategorized';
    if (!subCategoryWiseData[sc]) {
      subCategoryWiseData[sc] = { quantity: 0, gross: 0, sgst: 0, cgst: 0, net: 0 };
    }
    subCategoryWiseData[sc].quantity += d.quantity;
    subCategoryWiseData[sc].gross += d.gross;
    subCategoryWiseData[sc].sgst += d.sgst;
    subCategoryWiseData[sc].cgst += d.cgst;
    subCategoryWiseData[sc].net += d.net;
  });

  // SECTION-WISE DATA (from API)
  const sectionWiseData = {};
  if (sectionWiseReportsAPI.length > 0) {
    sectionWiseReportsAPI.forEach(section => {
      const sectionName = section.sectionName || section.SectionName || 'Uncategorized';

      if (!sectionWiseData[sectionName]) {
        sectionWiseData[sectionName] = {
          items: [],
          sectionTotal: section.sectionTotal || 0
        };
      }

      // Process items within each section
      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
          sectionWiseData[sectionName].items.push({
            name: item.productDescription || item.ProductDescription || '',
            category: item.category || item.Category || '',
            quantity: Number(item.quantity || item.Quantity || 0),
            rate: Number(item.rate || item.Rate || 0),
            gross: Number(item.netValue || item.NetValue || 0)
          });
        });
      }
    });
  }

  // Calculate total discount from discount reports
  const totalDiscountAmount = discountReportsAPI.reduce(
    (sum, item) => sum + Number(item.discountAmount || item.DiscountAmount || 0),
    0
  );

  // Extract unique sections and categories for filters
  const sections = [...new Set(sectionWiseReportsAPI.map(section =>
    section.sectionName || section.SectionName
  ).filter(Boolean))].sort();

  const sectionCategories = [...new Set(
    sectionWiseReportsAPI.flatMap(section =>
      (section.items || []).map(item => item.category || item.Category)
    ).filter(Boolean)
  )].sort();

  // Extract unique section names from billWiseReports for filter
  const billSectionNames = [...new Set(
    billWiseReports
      .map(r => (r.SectionName || r.sectionName || '').trim())
      .filter(Boolean)
  )].sort();

  const paymentSummary = reports.reduce((acc, r) => {
    acc[r.paymentMethod] = (acc[r.paymentMethod] || 0) + r.total;
    return acc;
  }, {});

  const categories = [
    ...new Set(reports.flatMap(r => r.items.map(i => i.category)).filter(Boolean)),
  ];
  const subCategories = [
    ...new Set(reports.flatMap(r => r.items.map(i => i.subCategory)).filter(Boolean)),
  ];

  const paymentMethods = [
    ...new Set(reports.map(r => r.paymentMethod).filter(Boolean)),
  ];

  const transactionTypes = [
    ...new Set(
      billWiseReports
        .map(r => r.TransactionType)
        .filter(Boolean)
    )
  ].sort();

  const inDateRange = dateStr => {
    const d = new Date(dateStr + 'T00:00:00');
    const from = filters.fromDate ? new Date(filters.fromDate + 'T00:00:00') : null;
    const to = filters.toDate ? new Date(filters.toDate + 'T23:59:59') : null;
    return (!from || d >= from) && (!to || d <= to);
  };

  const filteredReports = reports.filter(r => {
    const okDate = inDateRange(r.date);
    if (activeTab === 'paymentSummary') {
      return okDate && (!filters.paymentMethod || r.paymentMethod === filters.paymentMethod);
    }
    if (activeTab === 'billWise') {
      return okDate;
    }
    return okDate;
  });

  const billWiseData = filteredReports.map(r => ({
    billNo: r.billNumber || '',
    netTotal: r.total || 0,
    paymentMode: r.paymentMethod || '',
  }));

  const filteredBillWiseData = billWiseData.filter(r => {
    const mb = filters.billNumber.toLowerCase();
    const mp = filters.paymentMethod;
    const paymentFilter = !mp || r.paymentMode === mp;
    return (!mb || (r.billNo || '').toLowerCase().includes(mb)) && paymentFilter;
  });

  const filteredVoidReports = voidReports.filter(r => {
    const ok = inDateRange(r.date);
    const mb = filters.billNumber.toLowerCase();
    const mu = filters.username.toLowerCase();
    return (
      ok &&
      (!mb || (r.billNumber || '').toLowerCase().includes(mb)) &&
      (!mu || (r.username || '').toLowerCase().includes(mu))
    );
  });

  const filteredCancelReports = cancelReports.filter(r => {
    const ok = inDateRange(r.date);
    const mb = filters.billNumber.toLowerCase();
    const mu = filters.username.toLowerCase();
    return (
      ok &&
      (!mb || (r.billNumber || '').toLowerCase().includes(mb)) &&
      (!mu || (r.username || '').toLowerCase().includes(mu))
    );
  });

  const filteredNcReports = ncReports.filter(r => {
    const ok = inDateRange(r.date);
    const mb = filters.billNumber.toLowerCase();
    const mu = filters.username.toLowerCase();
    return (
      ok &&
      (!mb || (r.billNumber || '').toLowerCase().includes(mb)) &&
      (!mu || (r.username || '').toLowerCase().includes(mu))
    );
  });

  const filteredDiscountReports = discountReports.filter(r => {
    const ok = inDateRange(r.date);
    const mb = filters.billNumber.toLowerCase();
    return (
      ok &&
      (!mb || (r.billNumber || '').toLowerCase().includes(mb))
    );
  });

  const handlePrint = () => {
    const win = window.open('', '', 'width=1000,height=700');
    win.document.write(`<html><head><title>Report</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background: #f3f3f3; }
        .text-right { text-align: right; }
      </style>
      </head><body>
      <h2>${{
        itemWise: 'Item-wise Sales Report',
        paymentSummary: 'Payment Summary',
        billWise: 'Bill-wise Report',
        itemVoid: 'Item Void Report',
        cancelReport: 'Cancel Report',
        ncReport: 'NC (No Charge) Report',
        discountReport: 'Discount Report',
        transactionWise: 'Transaction-wise Report',
        sectionWise: 'Section-wise Report',
        subCategoryReport: 'Sub-category Report',
        itemComplimentary: 'Item Complimentary Report',
      }[activeTab]
      }</h2>
      ${printRef.current.innerHTML}
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const clearFilters = () =>
    setFilters({
      fromDate: new Date().toISOString().split('T')[0],
      toDate: new Date().toISOString().split('T')[0],
      itemName: '',
      category: '',
      subCategory: '',
      paymentMethod: '',
      billNumber: '',
      username: '',
      section: '',
      transactionType: '',
      sectionName: '',
    });

  const displayBillWiseData =
    activeTab === 'billWise' && billWiseReports.length > 0
      ? billWiseReports
      : filteredBillWiseData;

  const displayPaymentSummary =
    activeTab === 'paymentSummary' && paymentWiseReports.length > 0
      ? paymentWiseReports
      : Object.entries(paymentSummary);

  const displayItemWiseData =
    activeTab === 'itemWise' && itemWiseReports.length > 0
      ? itemWiseReports
      : Object.entries(itemWiseData).map(([name, d]) => ({
        item_name: name,
        category: d.category,
        subCategory: d.subCategory,
        Quantity: d.quantity,
        GrossAmount: d.gross,
        SGST: d.sgst,
        CGST: d.cgst,
        NetAmount: d.net,
      }));

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-gray-800 p-6 shadow-md text-white">
        <h2 className="text-lg font-bold mb-4">Reports</h2>
        <ReportButton
          label="Item-wise Sales Report"
          tab="itemWise"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Payment Summary"
          tab="paymentSummary"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Bill-wise Report"
          tab="billWise"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Item Void Report"
          tab="itemVoid"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Cancel Report"
          tab="cancelReport"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="NC Report"
          tab="ncReport"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Discount Report"
          tab="discountReport"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Transaction-wise Report"
          tab="transactionWise"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Section-wise Report"
          tab="sectionWise"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Sub-category Report"
          tab="subCategoryReport"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
        <ReportButton
          label="Item Complimentary Report"
          tab="itemComplimentary"
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </aside>

      <main className="flex-1 p-6 flex flex-col overflow-hidden" style={{ height: '100vh' }}>
        {/* Filters */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex-shrink-0">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label>From Date</label>
              <input
                type="date"
                value={filters.fromDate}
                onChange={e =>
                  setFilters({ ...filters, fromDate: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label>To Date</label>
              <input
                type="date"
                value={filters.toDate}
                onChange={e =>
                  setFilters({ ...filters, toDate: e.target.value })
                }
                className="mt-1 w-full border rounded px-2 py-1 text-sm"
              />
            </div>

            {activeTab === 'sectionWise' && (
              <>
                <div>
                  <label>Section</label>
                  <select
                    value={filters.section}
                    onChange={e =>
                      setFilters({ ...filters, section: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All Sections</option>
                    {sections.map((sec, i) => (
                      <option key={i} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Category</label>
                  <select
                    value={filters.category}
                    onChange={e =>
                      setFilters({ ...filters, category: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All Categories</option>
                    {sectionCategories.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(activeTab === 'billWise' ||
              activeTab === 'itemVoid' ||
              activeTab === 'cancelReport' ||
              activeTab === 'ncReport' ||
              activeTab === 'discountReport') && (
                <div>
                  <label>Bill Number</label>
                  <input
                    type="text"
                    value={filters.billNumber}
                    onChange={e =>
                      setFilters({ ...filters, billNumber: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                    placeholder="Search bill..."
                  />
                </div>
              )}

            {activeTab === 'billWise' && (
              <>
                <div>
                  <label>Transaction Type</label>
                  <select
                    value={filters.transactionType}
                    onChange={e =>
                      setFilters({ ...filters, transactionType: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All Types</option>
                    {transactionTypes.map((type, i) => (
                      <option key={i} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Section Name</label>
                  <select
                    value={filters.sectionName}
                    onChange={e =>
                      setFilters({ ...filters, sectionName: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">All Sections</option>
                    {billSectionNames.map((section, i) => (
                      <option key={i} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(activeTab === 'itemVoid' ||
              activeTab === 'cancelReport' ||
              activeTab === 'ncReport') && (
                <div>
                  <label>Username</label>
                  <input
                    type="text"
                    value={filters.username}
                    onChange={e =>
                      setFilters({ ...filters, username: e.target.value })
                    }
                    className="mt-1 w-full border rounded px-2 py-1 text-sm"
                    placeholder="Search user..."
                  />
                </div>
              )}
          </div>

          <button
            onClick={clearFilters}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Clear Filters
          </button>
        </div>

        {/* Reports Container */}
        <div className="flex-1 overflow-hidden">
          {/* ITEM WISE */}
          {activeTab === 'itemWise' && (
            <ReportWrapper
              title="Item-wise Sales Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Item</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Qty</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Gross</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">SGST</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">CGST</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Net</th>
                      </tr>
                    </thead>

                    <tbody>
                      {displayItemWiseData
                        .filter(it =>
                          (it.item_name || "").toLowerCase().includes(filters.itemName.toLowerCase())
                        )
                        .filter(it => !filters.category || (it.category || "") === filters.category)
                        .filter(it => !filters.subCategory || (it.subCategory || "") === filters.subCategory)
                        .map((it, i) => (
                          <tr key={i} className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                            <td className="py-1 px-3">{it.item_name}</td>
                            <td className="py-1 px-3 text-right">{Number(it.Quantity || 0).toLocaleString('en-IN')}</td>
                            <td className="py-1 px-3 text-right">{Number(it.GrossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(it.SGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(it.CGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(it.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}

                      {displayItemWiseData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-gray-500">
                            No items found for the selected date range
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {displayItemWiseData.length > 0 && (
                      <tfoot>
                        <tr className="font-semibold border-t-2 border-gray-300 text-gray-800 bg-gray-50">
                          <td colSpan={5} className="text-right py-2 px-3 pr-8">
                            Grand Total
                          </td>
                          <td className="py-2 px-3 text-right">
                            {displayItemWiseData
                              .reduce((sum, it) => sum + Number(it.NetAmount || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* PAYMENT SUMMARY */}
          {activeTab === 'paymentSummary' && (
            <ReportWrapper
              title="Payment Summary"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Payment Method</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(paymentWiseReports.length > 0
                        ? paymentWiseReports
                        : Object.entries(paymentSummary).map(
                          ([method, amount]) => ({
                            Pay_Mode: method,
                            Net_Amount: amount,
                          })
                        )
                      )
                        .filter(
                          r =>
                            !filters.paymentMethod ||
                            r.Pay_Mode === filters.paymentMethod
                        )
                        .map((r, i) => (
                          <tr
                            key={r.Pay_Mode || i}
                            className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="py-1 px-3">{r.Pay_Mode}</td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(r.Net_Amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      {paymentWiseReports.length === 0 &&
                        Object.keys(paymentSummary).length === 0 && (
                          <tr>
                            <td
                              colSpan={2}
                              className="py-8 text-center text-gray-500"
                            >
                              No payment data available
                            </td>
                          </tr>
                        )}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold border-t-2 border-gray-300 text-gray-800 bg-gray-50">
                        <td className="text-right py-2 px-3">Grand Total</td>
                        <td className="py-2 px-3 text-right">
                          {(paymentWiseReports.length > 0
                            ? paymentWiseReports
                            : Object.entries(paymentSummary).map(
                              ([, amount]) => ({
                                Net_Amount: amount,
                              })
                            )
                          )
                            .filter(
                              r =>
                                !filters.paymentMethod ||
                                r.Pay_Mode === filters.paymentMethod
                            )
                            .reduce(
                              (sum, r) => sum + Number(r.Net_Amount || 0),
                              0
                            )
                            .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* BILL WISE */}
          {activeTab === 'billWise' && (
            <ReportWrapper
              title="Bill-wise Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">S.No</th>
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Bill No</th>
                        <th className="py-2 px-3 bg-gray-100">Section</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Net Amount</th>
                        <th className="py-2 px-3 bg-gray-100">Pay Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredData = displayBillWiseData.filter(bill => {
                          const mb = filters.billNumber.toLowerCase().trim();
                          const mp = filters.paymentMethod;
                          const mt = filters.transactionType;
                          const ms = filters.sectionName;

                          const billNoMatch =
                            !mb ||
                            (bill.Bill_No || bill.billNo || '')
                              .toString()
                              .toLowerCase()
                              .trim()
                              .includes(mb);

                          const paymentMatch =
                            !mp || (bill.Pay_Mode || bill.paymentMode || '').trim() === mp.trim();

                          const transactionMatch =
                            !mt || (bill.TransactionType || '').trim() === mt.trim();

                          const sectionMatch =
                            !ms ||
                            (bill.SectionName || bill.sectionName || '').trim().toLowerCase() === ms.trim().toLowerCase();

                          return billNoMatch && paymentMatch && transactionMatch && sectionMatch;
                        });

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td
                                colSpan={6}
                                className="py-8 text-center text-gray-500"
                              >
                                {billWiseReports.length === 0 &&
                                  filters.fromDate &&
                                  filters.toDate
                                  ? 'No bills found from API for the selected date range'
                                  : 'No bills found for the selected filters'}
                              </td>
                            </tr>
                          );
                        }

                        const groupedByTransaction = {};
                        filteredData.forEach(bill => {
                          const transType = bill.TransactionType || 'Unknown';
                          if (!groupedByTransaction[transType]) {
                            groupedByTransaction[transType] = [];
                          }
                          groupedByTransaction[transType].push(bill);
                        });

                        let globalIndex = 0; // ✅ Create a global counter for unique keys

                        return Object.entries(groupedByTransaction).map(([transType, bills]) => (
                          <React.Fragment key={transType}>
                            <tr className="bg-gray-50 border-t-2 border-gray-400">
                              <td colSpan={6} className="py-2 px-3 font-semibold text-gray-800">
                                Transaction Type: {transType}
                              </td>
                            </tr>

                            {bills.map((bill) => {
                              const uniqueKey = `${transType}-${bill.Order_Id || bill.billNo || ''}-${bill.Bill_No || ''}-${globalIndex++}`; // ✅ Create unique key
                              return (
                                <tr
                                  key={uniqueKey} // ✅ Use unique key
                                  className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                                >
                                  <td className="py-1 px-3 pl-6">{bill.SNo || globalIndex}</td>
                                  <td className="py-1 px-3">
                                    {bill.Date
                                      ? new Date(bill.Date).toLocaleDateString()
                                      : ''}
                                  </td>
                                  <td className="py-1 px-3">
                                    {bill.Bill_No || bill.billNo || ''}
                                  </td>
                                  <td className="py-1 px-3">
                                    {bill.SectionName || ''}
                                  </td>
                                  <td className="py-1 px-3 text-right font-semibold text-black">
                                    {(bill.Net_Amount || bill.netTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-1 px-3">
                                    {bill.Pay_Mode || bill.paymentMode || ''}
                                  </td>
                                </tr>
                              );
                            })}

                            <tr className="bg-gray-100 border-b-2 border-gray-300 font-semibold text-gray-800">
                              <td className="py-2 px-3" colSpan={4}>Subtotal</td>
                              <td className="py-2 px-3 text-right">
                                {bills.reduce((sum, bill) =>
                                  sum + (bill.Net_Amount || bill.netTotal || 0), 0
                                ).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="py-2 px-3"></td>
                            </tr>
                          </React.Fragment>
                        ));
                      })()}
                    </tbody>
                    {(() => {
                      const filteredData = displayBillWiseData.filter(bill => {
                        const mb = filters.billNumber.toLowerCase().trim();
                        const mp = filters.paymentMethod;
                        const mt = filters.transactionType;
                        const ms = filters.sectionName;

                        const billNoMatch =
                          !mb ||
                          (bill.Bill_No || bill.billNo || '')
                            .toString()
                            .toLowerCase()
                            .trim()
                            .includes(mb);

                        const paymentMatch =
                          !mp || (bill.Pay_Mode || bill.paymentMode || '').trim() === mp.trim();

                        const transactionMatch =
                          !mt || (bill.TransactionType || '').trim() === mt.trim();

                        const sectionMatch =
                          !ms ||
                          (bill.SectionName || bill.sectionName || '').trim().toLowerCase() === ms.trim().toLowerCase();

                        return billNoMatch && paymentMatch && transactionMatch && sectionMatch;
                      });

                      if (filteredData.length > 0) {
                        const total = filteredData.reduce(
                          (sum, bill) =>
                            sum + (bill.Net_Amount || bill.netTotal || 0),
                          0
                        );

                        return (
                          <tfoot>
                            <tr className="font-bold border-t-2 border-gray-400 text-gray-900 bg-gray-100">
                              <td
                                colSpan={4}
                                className="py-2 px-3"
                              >
                                Grand Total
                              </td>
                              <td className="py-2 px-3 text-right">{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td></td>
                            </tr>
                          </tfoot>
                        );
                      }
                      return null;
                    })()}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* ITEM VOID */}
          {activeTab === 'itemVoid' && (
            <ReportWrapper
              title="Item Void Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Order No</th>
                        <th className="py-2 px-3 bg-gray-100">Table</th>
                        <th className="py-2 px-3 bg-gray-100">Items</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                        <th className="py-2 px-3 bg-gray-100">Reason</th>
                        <th className="py-2 px-3 bg-gray-100">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dataSource = voidReportsAPI.length > 0 ? voidReportsAPI : filteredVoidReports;

                        const filteredData = voidReportsAPI.length > 0
                          ? voidReportsAPI.filter(e => {
                            const mb = filters.billNumber.toLowerCase();
                            const mu = filters.username.toLowerCase();
                            const billMatch = !mb || (e.OrderNo?.toString() || e.billNumber || '').toLowerCase().includes(mb);
                            const userMatch = !mu || (e.StaffName || e.username || '').toLowerCase().includes(mu);
                            return billMatch && userMatch;
                          })
                          : filteredVoidReports;

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-500">
                                {filters.fromDate && filters.toDate
                                  ? 'No void records found for the selected date range'
                                  : 'Please select a date range to view void report'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredData.map((e, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="py-1 px-3">
                              {e.Date
                                ? new Date(e.Date).toLocaleDateString()
                                : e.date || ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.OrderNo || e.billNumber || ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.Table || e.tableNumber || ''}
                            </td>
                            <td className="py-1 px-3 space-y-1">
                              {voidReportsAPI.length > 0 ? (
                                <div>{e.Items || ''}</div>
                              ) : (
                                e.items?.map((it, j) => (
                                  <div key={j}>
                                    {it.name} × {it.quantity}
                                  </div>
                                ))
                              )}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(e.Amount || e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3">
                              {e.Reason || e.reason || 'N/A'}
                            </td>
                            <td className="py-1 px-3">
                              {e.StaffName || e.username || ''}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    {(() => {
                      const dataSource = voidReportsAPI.length > 0 ? voidReportsAPI : filteredVoidReports;
                      const filteredData = voidReportsAPI.length > 0
                        ? voidReportsAPI.filter(e => {
                          const mb = filters.billNumber.toLowerCase();
                          const mu = filters.username.toLowerCase();
                          const billMatch = !mb || (e.OrderNo?.toString() || e.billNumber || '').toLowerCase().includes(mb);
                          const userMatch = !mu || (e.StaffName || e.username || '').toLowerCase().includes(mu);
                          return billMatch && userMatch;
                        })
                        : filteredVoidReports;

                      if (filteredData.length > 0) {
                        const totalAmount = filteredData.reduce(
                          (a, c) => a + Number(c.Amount || c.amount || 0),
                          0
                        );

                        return (
                          <tfoot>
                            <tr className="font-semibold border-t border-gray-300 text-gray-800 bg-white">
                              <td colSpan={4} className="text-right py-2 px-3">
                                Total voided amount
                              </td>
                              <td className="py-2 px-3 text-right">
                                {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        );
                      }
                      return null;
                    })()}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* CANCEL REPORT */}
          {activeTab === 'cancelReport' && (
            <ReportWrapper
              title="Cancel Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Order No</th>
                        <th className="py-2 px-3 bg-gray-100">Table</th>
                        <th className="py-2 px-3 bg-gray-100">Items</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                        <th className="py-2 px-3 bg-gray-100">Reason</th>
                        <th className="py-2 px-3 bg-gray-100">User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dataSource = cancelReportsAPI.length > 0 ? cancelReportsAPI : filteredCancelReports;

                        const filteredData = cancelReportsAPI.length > 0
                          ? cancelReportsAPI.filter(e => {
                            const mb = filters.billNumber.toLowerCase();
                            const mu = filters.username.toLowerCase();
                            const billMatch = !mb || (e.OrderNo?.toString() || e.billNumber || '').toLowerCase().includes(mb);
                            const userMatch = !mu || (e.Staff || e.StaffName || e.username || '').toLowerCase().includes(mu);
                            return billMatch && userMatch;
                          })
                          : filteredCancelReports;

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-gray-500">
                                {filters.fromDate && filters.toDate
                                  ? 'No cancel records found for the selected date range'
                                  : 'Please select a date range to view cancel report'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredData.map((e, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="py-1 px-3">
                              {e.Date
                                ? new Date(e.Date).toLocaleDateString()
                                : e.date || ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.OrderNo || e.billNumber || ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.Table || e.tableNumber || ''}
                            </td>
                            <td className="py-1 px-3 space-y-1">
                              {cancelReportsAPI.length > 0 ? (
                                <div>{e.Items || ''}</div>
                              ) : (
                                e.items?.map((it, j) => (
                                  <div key={j}>
                                    {it.name} × {it.quantity}
                                  </div>
                                ))
                              )}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(e.Amount || e.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3">
                              {e.Reason || e.reason || 'N/A'}
                            </td>
                            <td className="py-1 px-3">
                              {e.Staff || e.StaffName || e.username || ''}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    {(() => {
                      const dataSource = cancelReportsAPI.length > 0 ? cancelReportsAPI : filteredCancelReports;
                      const filteredData = cancelReportsAPI.length > 0
                        ? cancelReportsAPI.filter(e => {
                          const mb = filters.billNumber.toLowerCase();
                          const mu = filters.username.toLowerCase();
                          const billMatch = !mb || (e.OrderNo?.toString() || e.billNumber || '').toLowerCase().includes(mb);
                          const userMatch = !mu || (e.Staff || e.StaffName || e.username || '').toLowerCase().includes(mu);
                          return billMatch && userMatch;
                        })
                        : filteredCancelReports;

                      if (filteredData.length > 0) {
                        const totalAmount = filteredData.reduce(
                          (a, c) => a + Number(c.Amount || c.amount || 0),
                          0
                        );

                        return (
                          <tfoot>
                            <tr className="font-semibold border-t border-gray-300 text-gray-800 bg-white">
                              <td colSpan={4} className="text-right py-2 px-3">
                                Total canceled amount
                              </td>
                              <td className="py-2 px-3 text-right">
                                {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2} />
                            </tr>
                          </tfoot>
                        );
                      }
                      return null;
                    })()}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* NC (NO CHARGE) REPORT */}
          {activeTab === 'ncReport' && (
            <ReportWrapper
              title="NC (No Charge) Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                      <th className="py-2 px-3 bg-gray-100">Date</th>
                      <th className="py-2 px-3 bg-gray-100">Bill No</th>
                      <th className="py-2 px-3 bg-gray-100">Table</th>
                      <th className="py-2 px-3 bg-gray-100">Items</th>
                      <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                      <th className="py-2 px-3 bg-gray-100">Reason</th>
                      <th className="py-2 px-3 bg-gray-100">Authorized By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNcReports.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500">
                          No NC (No Charge) records found for the selected date range
                        </td>
                      </tr>
                    ) : (
                      filteredNcReports.map((e, i) => (
                        <tr
                          key={i}
                          className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                        >
                          <td className="py-1 px-3">{e.date}</td>
                          <td className="py-1 px-3">{e.billNumber}</td>
                          <td className="py-1 px-3">{e.tableNumber}</td>
                          <td className="py-1 px-3 space-y-1">
                            {e.items.map((it, j) => (
                              <div key={j}>
                                {it.name} × {it.quantity}
                              </div>
                            ))}
                          </td>
                          <td className="py-1 px-3 text-right font-semibold text-black">
                            {e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-1 px-3">{e.reason || 'N/A'}</td>
                          <td className="py-1 px-3">{e.username}</td>
                        </tr>
                      ))
                    )}
                    {filteredNcReports.length > 0 && (
                      <tr className="font-semibold border-t border-gray-300 text-gray-800 bg-white">
                        <td colSpan={4} className="text-right py-2 px-3">
                          Total NC amount
                        </td>
                        <td className="py-2 px-3 text-right">
                          {filteredNcReports
                            .reduce((a, c) => a + c.amount, 0)
                            .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ReportWrapper>
          )}

          {/* DISCOUNT REPORT */}
          {activeTab === 'discountReport' && (
            <ReportWrapper
              title="Discount Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Bill No</th>
                        <th className="py-2 px-3 bg-gray-100">Table</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Original Amount</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Discount Amount</th>
                        <th className="py-2 px-3 bg-gray-100">Discount Type</th>
                        <th className="py-2 px-3 bg-gray-100">User</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Final Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dataSource = discountReportsAPI.length > 0 ? discountReportsAPI : filteredDiscountReports;

                        const filteredData = discountReportsAPI.length > 0
                          ? discountReportsAPI.filter(e => {
                            const mb = filters.billNumber.toLowerCase();
                            const billMatch = !mb || (e.billNo?.toString() || e.billNumber?.toString() || '').toLowerCase().includes(mb);
                            return billMatch;
                          })
                          : filteredDiscountReports;

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={8} className="py-8 text-center text-gray-500">
                                {filters.fromDate && filters.toDate
                                  ? 'No discount records found for the selected date range'
                                  : 'Please select a date range to view discount report'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredData.map((e, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="py-1 px-3">
                              {e.date
                                ? new Date(e.date).toLocaleDateString()
                                : e.Date
                                  ? new Date(e.Date).toLocaleDateString()
                                  : ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.billNo || e.BillNo || e.billNumber || ''}
                            </td>
                            <td className="py-1 px-3">
                              {e.table || e.Table || e.TableNo || e.tableNumber || 'N/A'}
                            </td>
                            <td className="py-1 px-3 text-right">
                              {Number(e.originalAmount || e.OriginalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-red-600">
                              -{Number(e.discountAmount || e.DiscountAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3">
                              {e.reason || e.Reason || e.DiscountType || 'N/A'}
                            </td>
                            <td className="py-1 px-3">
                              {e.user || e.User || e.StaffName || e.username || ''}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(e.finalAmount || e.FinalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    {(() => {
                      const dataSource = discountReportsAPI.length > 0 ? discountReportsAPI : filteredDiscountReports;
                      const filteredData = discountReportsAPI.length > 0
                        ? discountReportsAPI.filter(e => {
                          const mb = filters.billNumber.toLowerCase();
                          const billMatch = !mb || (e.billNo?.toString() || e.billNumber?.toString() || '').toLowerCase().includes(mb);
                          return billMatch;
                        })
                        : filteredDiscountReports;

                      if (filteredData.length > 0) {
                        const totalDiscount = filteredData.reduce(
                          (a, c) => a + Number(c.discountAmount || c.DiscountAmount || 0),
                          0
                        );
                        const totalFinal = filteredData.reduce(
                          (a, c) => a + Number(c.finalAmount || c.FinalAmount || 0),
                          0
                        );

                        return (
                          <tfoot>
                            <tr className="font-semibold border-t border-gray-300 text-gray-800 bg-white">
                              <td colSpan={4} className="text-right py-2 px-3">
                                Total discount given
                              </td>
                              <td className="py-2 px-3 text-right text-red-600">
                                -{totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td colSpan={2}></td>
                              <td className="py-2 px-3 text-right">
                                {totalFinal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        );
                      }
                      return null;
                    })()}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* TRANSACTION WISE */}
          {activeTab === 'transactionWise' && (
            <ReportWrapper
              title="Transaction-wise Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Transaction Type</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Bill Count</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Gross Amount</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Discount</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">NoCash</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">CGST</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">SGST</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Net Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionReports.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            {filters.fromDate && filters.toDate
                              ? 'No transaction data available for the selected date range'
                              : 'Please select a date range to view transaction report'}
                          </td>
                        </tr>
                      ) : (
                        transactionReports.map((transaction, i) => (
                          <tr
                            key={i}
                            className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            <td className="py-1 px-3">{transaction.TransactionType || 'N/A'}</td>
                            <td className="py-1 px-3 text-right">{(transaction.BillCount || 0).toLocaleString('en-IN')}</td>
                            <td className="py-1 px-3 text-right">{Number(transaction.GrossAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(transaction.Discount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(transaction.NoCash || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(transaction.CGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right">{Number(transaction.SGST || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(transaction.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {transactionReports.length > 0 && (
                      <tfoot>
                        <tr className="font-semibold border-t-2 border-gray-300 text-gray-800 bg-gray-50">
                          <td className="py-2 px-3">Total</td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports.reduce((sum, t) => sum + (t.BillCount || 0), 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.GrossAmount || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.Discount || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.NoCash || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.CGST || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.SGST || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {transactionReports
                              .reduce((sum, t) => sum + Number(t.NetAmount || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* SECTION WISE */}
          {activeTab === 'sectionWise' && (
            <ReportWrapper
              title="Section-wise Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Product Description</th>
                        <th className="py-2 px-3 bg-gray-100">Category</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Quantity</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Rate</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Net Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(sectionWiseData).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            {filters.fromDate && filters.toDate
                              ? 'No section-wise data found for the selected date range'
                              : 'Please select a date range to view section-wise report'}
                          </td>
                        </tr>
                      ) : (
                        Object.entries(sectionWiseData)
                          .filter(([section]) => !filters.section || section === filters.section)
                          .map(([section, data]) => {
                            const filteredItems = data.items.filter(
                              item => !filters.category || item.category === filters.category
                            );

                            const filteredQty = filteredItems.reduce((sum, item) => sum + item.quantity, 0);
                            const filteredGross = filteredItems.reduce((sum, item) => sum + item.gross, 0);

                            if (filteredItems.length === 0) return null;

                            return (
                              <React.Fragment key={section}>
                                <tr className="bg-gray-50 border-t-2 border-gray-400">
                                  <td colSpan={5} className="py-2 px-3 font-semibold text-gray-800">
                                    Section: {section}
                                  </td>
                                </tr>

                                {filteredItems.map((item, idx) => (
                                  <tr key={idx} className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                                    <td className="py-1 px-3 pl-6">{item.name}</td>
                                    <td className="py-1 px-3">{item.category}</td>
                                    <td className="py-1 px-3 text-right">{item.quantity.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                    <td className="py-1 px-3 text-right">{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td className="py-1 px-3 text-right font-semibold text-black">
                                      {item.gross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ))}

                                <tr className="bg-gray-100 border-b-2 border-gray-300 font-semibold text-gray-800">
                                  <td className="py-2 px-3">Subtotal</td>
                                  <td className="py-2 px-3"></td>
                                  <td className="py-2 px-3 text-right">{filteredQty.toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}</td>
                                  <td className="py-2 px-3"></td>
                                  <td className="py-2 px-3 text-right">{filteredGross.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                </tr>
                              </React.Fragment>
                            );
                          })
                      )}
                    </tbody>

                    {Object.keys(sectionWiseData).length > 0 &&
                      Object.entries(sectionWiseData)
                        .filter(([section]) => !filters.section || section === filters.section)
                        .some(([, data]) =>
                          data.items.filter(item => !filters.category || item.category === filters.category).length > 0
                        ) && (
                        <tfoot>
                          <tr className="font-bold border-t-2 border-gray-400 text-gray-900 bg-gray-100">
                            <td className="py-2 px-3">Grand Total</td>
                            <td className="py-2 px-3"></td>
                            <td className="py-2 px-3 text-right">
                              {Object.entries(sectionWiseData)
                                .filter(([section]) => !filters.section || section === filters.section)
                                .flatMap(([, data]) =>
                                  data.items.filter(item => !filters.category || item.category === filters.category)
                                )
                                .reduce((sum, item) => sum + item.quantity, 0)
                                .toLocaleString('en-IN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                            </td>
                            <td className="py-2 px-3"></td>
                            <td className="py-2 px-3 text-right">
                              {Object.entries(sectionWiseData)
                                .filter(([section]) => !filters.section || section === filters.section)
                                .flatMap(([, data]) =>
                                  data.items.filter(item => !filters.category || item.category === filters.category)
                                )
                                .reduce((sum, item) => sum + item.gross, 0)
                                .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>

                          {/* Discount Deduction Row - Only show when no filters are applied */}
                          {totalDiscountAmount > 0 && !filters.section && !filters.category && (
                            <tr className="font-semibold border-t border-gray-300 text-red-600 bg-red-50">
                              <td colSpan={4} className="py-2 px-3 text-right">
                                Less: Total Discount
                              </td>
                              <td className="py-2 px-3 text-right">
                                -{totalDiscountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}

                          {/* Net Total After Discount - Only show when no filters are applied */}
                          {!filters.section && !filters.category && (
                            <tr className="font-bold border-t-2 border-gray-400 text-gray-900 bg-gray-200">
                              <td colSpan={4} className="py-2 px-3 text-right">
                                Net Total (After Discount)
                              </td>
                              <td className="py-2 px-3 text-right">
                                {(Object.entries(sectionWiseData)
                                  .filter(([section]) => !filters.section || section === filters.section)
                                  .flatMap(([, data]) =>
                                    data.items.filter(item => !filters.category || item.category === filters.category)
                                  )
                                  .reduce((sum, item) => sum + item.gross, 0) - totalDiscountAmount)
                                  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          )}
                        </tfoot>
                      )}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* SUB-CATEGORY REPORT */}
          {activeTab === 'subCategoryReport' && (
            <ReportWrapper
              title="Sub-category Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Category Name</th>
                        <th className="py-2 px-3 bg-gray-100">Sub-category</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dataSource = subCategoryReportsAPI.length > 0
                          ? subCategoryReportsAPI
                          : Object.entries(subCategoryWiseData).map(([sc, d]) => ({
                            Category: '',
                            SubCategory: sc,
                            Amount: d.net
                          }));

                        const filteredData = dataSource.filter(item =>
                          !filters.subCategory || (item.SubCategory || item.subCategory) === filters.subCategory
                        );

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={3} className="py-8 text-center text-gray-500">
                                {filters.fromDate && filters.toDate
                                  ? 'No data for selected date range'
                                  : 'Please select a date range to view sub-category report'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredData.map((item, i) => (
                          <tr key={i} className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                            <td className="py-1 px-3">
                              {item.Category || item.category || item.CategoryName || item.categoryName || '-'}
                            </td>
                            <td className="py-1 px-3">{item.SubCategory || item.subCategory}</td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(item.Amount || item.NetAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                    {(() => {
                      const dataSource = subCategoryReportsAPI.length > 0
                        ? subCategoryReportsAPI
                        : Object.entries(subCategoryWiseData).map(([sc, d]) => ({
                          Category: '',
                          SubCategory: sc,
                          Amount: d.net
                        }));

                      const filteredData = dataSource.filter(item =>
                        !filters.subCategory || (item.SubCategory || item.subCategory) === filters.subCategory
                      );

                      if (filteredData.length > 0) {
                        return (
                          <tfoot>
                            <tr className="font-semibold border-t-2 border-gray-300 text-gray-800 bg-gray-50">
                              <td colSpan={2} className="text-right py-2 px-3 pr-8">
                                Grand Total
                              </td>
                              <td className="py-2 px-3 text-right">
                                {filteredData
                                  .reduce((sum, item) => sum + Number(item.Amount || item.NetAmount || 0), 0)
                                  .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tfoot>
                        );
                      }
                      return null;
                    })()}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}

          {/* ITEM COMPLIMENTARY REPORT */}
          {activeTab === 'itemComplimentary' && (
            <ReportWrapper
              title="Item Complimentary Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Item Name</th>
                        <th className="py-2 px-3 bg-gray-100">Sub Category</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Qty</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Price</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Total Value</th>
                        <th className="py-2 px-3 bg-gray-100">Reason</th>
                        <th className="py-2 px-3 bg-gray-100">Staff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemComplimentaryReportsAPI.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-gray-500">
                            {filters.fromDate && filters.toDate
                              ? 'No complimentary items found for the selected date range'
                              : 'Please select a date range to view complimentary report'}
                          </td>
                        </tr>
                      ) : (
                        itemComplimentaryReportsAPI.map((item, i) => (
                          <tr key={i} className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                            <td className="py-1 px-3">
                              {item.Date ? new Date(item.Date).toLocaleDateString() : ''}
                            </td>
                            <td className="py-1 px-3">{item.ItemName}</td>
                            <td className="py-1 px-3">{item.SubCategoryName}</td>
                            <td className="py-1 px-3 text-right">{item.Quantity}</td>
                            <td className="py-1 px-3 text-right">
                              {Number(item.OriginalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3 text-right font-semibold text-black">
                              {Number(item.TotalOriginalValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-1 px-3">{item.Reason}</td>
                            <td className="py-1 px-3">{item.StaffName}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {itemComplimentaryReportsAPI.length > 0 && (
                      <tfoot>
                        <tr className="font-semibold border-t-2 border-gray-300 text-gray-800 bg-gray-50">
                          <td colSpan={3} className="text-right py-2 px-3">Grand Total</td>
                          <td className="py-2 px-3 text-right">
                            {itemComplimentaryReportsAPI.reduce((sum, item) => sum + (item.Quantity || 0), 0)}
                          </td>
                          <td className="py-2 px-3"></td>
                          <td className="py-2 px-3 text-right">
                            {itemComplimentaryReportsAPI
                              .reduce((sum, item) => sum + (item.TotalOriginalValue || 0), 0)
                              .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </ReportWrapper>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reports;