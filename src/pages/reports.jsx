import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Printer, Menu, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  getNCReport,
  getComplimentaryReport,
  getCompany,
  getSalesSummary,
  getCategorySectionReport,
} from '../services/apicall';

const ReportButton = ({ label, tab, activeTab, setActiveTab, onClose }) => (
  <button
    onClick={() => {
      setActiveTab(tab);
      onClose && onClose();
    }}
    className={`block w-full text-left px-3 py-2.5 rounded-lg transition-colors ${activeTab === tab
      ? 'bg-blue-600 font-semibold text-white'
      : 'text-white hover:bg-gray-700'
      }`}
  >
    {label}
  </button>
);

const ReportWrapper = ({ title, printRef, onPrint, children }) => (
  <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
      <button
        onClick={onPrint}
        className="flex items-center bg-gray-800 gap-1.5 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-gray-700 text-sm transition-colors w-full sm:w-auto justify-center"
      >
        <Printer size={16} /> Print
      </button>
    </div>
    <div ref={printRef}>{children}</div>
  </div>
);

const MobileCard = ({ children, className = "" }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-3 mb-3 shadow-sm ${className}`}>
    {children}
  </div>
);

const MobileRow = ({ label, value, highlight = false }) => (
  <div className="flex justify-between items-start py-1.5">
    <span className="text-gray-600 text-sm font-medium">{label}:</span>
    <span className={`text-sm text-right ${highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
      {value}
    </span>
  </div>
);

const Reports = () => {
  const navigate = useNavigate();
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
  const [ncReportsAPI, setNcReportsAPI] = useState([]);
  const [itemComplimentaryReportsAPI, setItemComplimentaryReportsAPI] = useState([]);
  const [categorySectionReport, setCategorySectionReport] = useState(null);
  const [globalSections, setGlobalSections] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [salesSummaryLoading, setSalesSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        const data = await getCompany();
        if (data && data.length > 0) {
          // Filter for the company where active status is 'active' or true
          // Find the company where isactive is true
          const activeCompany = data.find(c => c.isactive === true) || data[0];
          setCompanyInfo(activeCompany);
        }
      } catch (error) {
        console.error('Failed to fetch company info:', error);
      }
    };
    fetchCompanyData();

    const fetchSectionsData = async () => {
      try {
        const data = await getSectionWiseReport(filters.fromDate, filters.toDate);
        if (data && data.data) {
          const uniqueSections = [];
          const seenIds = new Set();
          data.data.forEach(s => {
            const name = s.sectionName || s.SectionName;
            const id = s.sectionId || s.SectionId;
            if (name && !seenIds.has(id)) {
              uniqueSections.push({ id, name });
              seenIds.add(id);
            }
          });
          setGlobalSections(uniqueSections.sort((a, b) => a.name.localeCompare(b.name)));
        }
      } catch (error) {
        console.error('Failed to fetch sections list:', error);
      }
    };
    fetchSectionsData();

    setReports(JSON.parse(localStorage.getItem('reports') || '[]'));
    setVoidReports(JSON.parse(localStorage.getItem('voidReports') || '[]'));
    setCancelReports(JSON.parse(localStorage.getItem('cancelReports') || '[]'));
    setNcReports(JSON.parse(localStorage.getItem('ncReports') || '[]'));
    setDiscountReports(JSON.parse(localStorage.getItem('discountReports') || '[]'));
  }, []);

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

  // Fetch sales summary whenever date range or relevant filters change
  useEffect(() => {
    if (!filters.fromDate || !filters.toDate) {
      setSalesSummary(null);
      return;
    }

    if (activeTab === 'itemWise') {
      // 1. Item-wise report: only date filters
      fetchSalesSummary(null, null);
    } else if (activeTab === 'sectionWise') {
      // 2. Section-wise report: transactionType must be 1, include section filter
      fetchSalesSummary(filters.section, 1);
    } else if (activeTab === 'categorySectionReport' || activeTab === 'subCategoryReport') {
      // 3. Category/Subcategory reports: include all filters
      fetchSalesSummary(filters.section, filters.transactionType);
    } else {
      // Default: basic summary
      fetchSalesSummary();
    }
  }, [filters.fromDate, filters.toDate, filters.section, filters.transactionType, activeTab]);

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
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'ncReport' && filters.fromDate && filters.toDate) {
      fetchNCReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'itemComplimentary' && filters.fromDate && filters.toDate) {
      fetchItemComplimentaryReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);

  useEffect(() => {
    if (activeTab === 'categorySectionReport' && filters.fromDate && filters.toDate) {
      fetchCategorySectionReport();
    }
  }, [activeTab, filters.fromDate, filters.toDate]);





  const fetchBillWiseReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;
    setLoading(true);
    try {
      const data = await getBillWiseReport(filters.fromDate, filters.toDate);
      console.log('Bill Wise Report Response:', data);
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

  const fetchSalesSummary = async (customSection = null, customTrans = null) => {
    if (!filters.fromDate || !filters.toDate) return;
    setSalesSummaryLoading(true);
    try {
      const data = await getSalesSummary(
        filters.fromDate,
        filters.toDate,
        customSection || filters.section || null,
        customTrans || filters.transactionType || null
      );
      setSalesSummary(data);
    } catch (error) {
      console.error('Failed to fetch sales summary:', error);
      setSalesSummary(null);
    } finally {
      setSalesSummaryLoading(false);
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

  const fetchNCReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;
    setLoading(true);
    try {
      const formatDateForAPI = (dateStr) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}-${month}-${year}`;
      };

      const response = await getNCReport(
        formatDateForAPI(filters.fromDate),
        formatDateForAPI(filters.toDate)
      );

      console.log('✅ NC Report Full API Response:', response);
      console.log('✅ Response Data Array:', response.data);

      if (response.data && response.data.length > 0) {
        console.log('✅ First Record:', response.data[0]);
        console.log('✅ All field names:', Object.keys(response.data[0]));
      }

      if (response.success && response.data) {
        setNcReportsAPI(response.data);
      } else {
        setNcReportsAPI([]);
      }
    } catch (error) {
      console.error('Failed to fetch NC report:', error);
      setNcReportsAPI([]);
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

  const fetchCategorySectionReport = async () => {
    if (!filters.fromDate || !filters.toDate) return;
    setLoading(true);
    try {
      const data = await getCategorySectionReport(filters.fromDate, filters.toDate);
      setCategorySectionReport(data);
    } catch (error) {
      console.error('Failed to fetch category section report:', error);
      setCategorySectionReport(null);
    } finally {
      setLoading(false);
    }
  };

  // Data processing
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
    d.net = d.gross;
  });

  const subCategoryWiseData = {};
  Object.entries(itemWiseData).forEach(([name, d]) => {
    const sc = d.subCategory || 'Uncategorized';
    if (!subCategoryWiseData[sc]) {
      subCategoryWiseData[sc] = { quantity: 0, gross: 0, net: 0 };
    }
    subCategoryWiseData[sc].quantity += d.quantity;
    subCategoryWiseData[sc].gross += d.gross;
    subCategoryWiseData[sc].net += d.net;
  });

  const sectionWiseData = {};
  if (sectionWiseReportsAPI.length > 0) {
    sectionWiseReportsAPI.forEach(section => {
      const sectionName = section.sectionName || section.SectionName || 'Uncategorized';
      const sectionId = section.sectionId || section.SectionId;
      const key = sectionId || sectionName;

      if (!sectionWiseData[key]) {
        sectionWiseData[key] = {
          name: sectionName,
          items: [],
          sectionTotal: section.sectionTotal || 0
        };
      }

      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
          sectionWiseData[key].items.push({
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

  const sectionCategories = [...new Set(
    sectionWiseReportsAPI.flatMap(section =>
      (section.items || []).map(item => item.category || item.Category)
    ).filter(Boolean)
  )].sort();

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

    const companyHeader = companyInfo ? `
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        ${companyInfo.logo && companyInfo.logo.startsWith('data:') ? `<img src="${companyInfo.logo}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;" />` : ''}
        <h1 style="margin: 0; color: #333;">${companyInfo.companyname || ''}</h1>
        <p style="margin: 5px 0;">${companyInfo.address || ''}</p>
        <p style="margin: 5px 0;">Phone: ${companyInfo.contactnumber || ''} | Email: ${companyInfo.email || ''}</p>
        ${companyInfo.gstnumber ? `<p style="margin: 5px 0;">GSTIN: ${companyInfo.gstnumber}</p>` : ''}
      </div>
    ` : '';

    win.document.write(`<html><head><title>Report</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 10px; text-align: left; font-size: 12px; }
        th { background: #f3f3f3; font-weight: bold; }
        .text-right { text-align: right; }
        .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; }
        @media print {
          .no-print { display: none; }
        }
      </style>
      </head><body>
      ${companyHeader}
      <h2 style="text-align: center;">${{
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
        categorySectionReport: 'Category Section Report',
        itemComplimentary: 'Item Complimentary Report',
      }[activeTab]
      }</h2>
      <p style="text-align: center; font-size: 14px;">Period: ${filters.fromDate} to ${filters.toDate}</p>
      <div style="margin-top: 20px;">
        ${printRef.current.innerHTML}
      </div>
      <div class="footer">
        Printed on: ${new Date().toLocaleString()}
      </div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
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



  const displayItemWiseData =
    activeTab === 'itemWise' && itemWiseReports.length > 0
      ? itemWiseReports
      : Object.entries(itemWiseData).map(([name, d]) => ({
        item_name: name,
        category: d.category,
        subCategory: d.subCategory,
        Quantity: d.quantity,
        GrossAmount: d.gross,
        NetAmount: d.net,
      }));

  // Extract sales summary from API - use exact keys from response: GrossAmount, NoCash, Discount, SGST, CGST, NetAmount
  const summaryData = (() => {
    if (!salesSummary || typeof salesSummary !== 'object') return null;
    const raw = salesSummary.data != null ? salesSummary.data : salesSummary;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const num = (v) => (v != null && v !== '' ? Number(v) : 0);
    return {
      GrossAmount: num(raw.GrossAmount),
      NoCash: num(raw.NoCash),
      Discount: num(raw.Discount),
      SGST: num(raw.SGST),
      CGST: num(raw.CGST),
      NetAmount: num(raw.NetAmount),
    };
  })();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 right-4 z-50 bg-transparent text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
        aria-label="Go Back"
      >
        <X size={22} />
      </button>

      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky top-0 h-screen
          w-64 bg-gray-800 p-4 sm:p-6 shadow-xl z-40
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          overflow-y-auto
        `}
      >
        <h2 className="text-xl font-bold mb-6 text-white mt-12 lg:mt-0">Reports</h2>
        <div className="space-y-2">
          <ReportButton label="Item-wise Sales" tab="itemWise" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Payment Summary" tab="paymentSummary" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Bill-wise Report" tab="billWise" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Item Void Report" tab="itemVoid" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Cancel Report" tab="cancelReport" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="NC Report" tab="ncReport" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Discount Report" tab="discountReport" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Transaction-wise" tab="transactionWise" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Section-wise" tab="sectionWise" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Sub-category" tab="subCategoryReport" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Category Section Report" tab="categorySectionReport" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
          <ReportButton label="Item Complimentary" tab="itemComplimentary" activeTab={activeTab} setActiveTab={setActiveTab} onClose={() => setSidebarOpen(false)} />
        </div>
      </aside>

      <main className="flex-1 p-3 sm:p-4 lg:p-6 flex flex-col overflow-hidden ml-0 lg:ml-0">
        <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-4 sm:mb-6 flex-shrink-0">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="lg:hidden flex items-center justify-between w-full mb-3"
          >
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
            {filtersOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          <h2 className="hidden lg:block text-lg font-semibold mb-4 text-gray-800">Filters</h2>

          <div className={`${filtersOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.fromDate}
                  onChange={e => setFilters({ ...filters, fromDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.toDate}
                  onChange={e => setFilters({ ...filters, toDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {(activeTab === 'sectionWise' || activeTab === 'categorySectionReport' || activeTab === 'subCategoryReport') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                    <select
                      value={filters.section}
                      onChange={e => setFilters({ ...filters, section: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Sections</option>
                      {globalSections.map((sec, i) => (
                        <option key={i} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={filters.category}
                      onChange={e => setFilters({ ...filters, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      {sectionCategories.map((cat, i) => (
                        <option key={i} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(activeTab === 'billWise' || activeTab === 'itemVoid' || activeTab === 'cancelReport' || activeTab === 'ncReport' || activeTab === 'discountReport') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                  <input
                    type="text"
                    value={filters.billNumber}
                    onChange={e => setFilters({ ...filters, billNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search bill..."
                  />
                </div>
              )}

              {activeTab === 'billWise' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                    <select
                      value={filters.paymentMethod}
                      onChange={e => setFilters({ ...filters, paymentMethod: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Payment Modes</option>
                      {[...new Set(
                        billWiseReports
                          .map(r => r.Pay_Mode || r.paymentMode || '')
                          .filter(Boolean)
                      )].sort().map((mode, i) => (
                        <option key={i} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                    <select
                      value={filters.transactionType}
                      onChange={e => setFilters({ ...filters, transactionType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Types</option>
                      {transactionTypes.map((type, i) => (
                        <option key={i} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
                    <select
                      value={filters.sectionName}
                      onChange={e => setFilters({ ...filters, sectionName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Sections</option>
                      {billSectionNames.map((section, i) => (
                        <option key={i} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {(activeTab === 'itemVoid' || activeTab === 'cancelReport' || activeTab === 'ncReport') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={filters.username}
                    onChange={e => setFilters({ ...filters, username: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search user..."
                  />
                </div>
              )}
            </div>

            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">

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
                          </tr>
                        ))}

                      {displayItemWiseData.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            No items found for the selected date range
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {summaryData && (
                    <table className="w-full text-sm border-collapse border-t-2 border-gray-300 mt-4">
                      <tbody>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-700 font-medium">Total</td>
                          <td className="py-2 px-3 text-right text-gray-900 font-semibold">{Number(summaryData.GrossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-700 font-medium">NoCash</td>
                          <td className="py-2 px-3 text-right text-gray-900 font-semibold">{Number(summaryData.NoCash).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-700 font-medium">Discount</td>
                          <td className="py-2 px-3 text-right text-red-600 font-semibold">{Number(summaryData.Discount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-700 font-medium">CGST</td>
                          <td className="py-2 px-3 text-right text-gray-900 font-semibold">{Number(summaryData.CGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="py-2 px-3 text-gray-700 font-medium">SGST</td>
                          <td className="py-2 px-3 text-right text-gray-900 font-semibold">{Number(summaryData.SGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <tr className="bg-gray-100 border-b border-gray-300 font-semibold text-gray-800">
                          <td className="py-2.5 px-3">Grand Total</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">{Number(summaryData.NetAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
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

                  {/* Sales Summary consolidated footer moved to relevant tabs */}
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
                        <th className="py-2 px-3 bg-gray-100">Transaction</th>
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
                              <td colSpan={8} className="py-8 text-center text-gray-500">
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
                              {e.TransactionName || e.transactionName || ''}
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
                              <td colSpan={5} className="text-right py-2 px-3">
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
                        <th className="py-2 px-3 bg-gray-100">Transaction</th>
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
                              <td colSpan={8} className="py-8 text-center text-gray-500">
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
                              {e.TransactionName || e.transactionName || ''}
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
                              <td colSpan={5} className="text-right py-2 px-3">
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
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                        <th className="py-2 px-3 bg-gray-100">Date</th>
                        <th className="py-2 px-3 bg-gray-100">Bill No</th>
                        <th className="py-2 px-3 bg-gray-100">Transaction</th>
                        <th className="py-2 px-3 bg-gray-100">Table</th>
                        <th className="py-2 px-3 bg-gray-100">Section</th>
                        <th className="py-2 px-3 bg-gray-100">Items</th>
                        <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                        <th className="py-2 px-3 bg-gray-100">User</th>
                        <th className="py-2 px-3 bg-gray-100">Customer Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const dataSource = ncReportsAPI.length > 0 ? ncReportsAPI : filteredNcReports;

                        const filteredData = ncReportsAPI.length > 0
                          ? ncReportsAPI.filter(e => {
                            const mb = filters.billNumber.toLowerCase();
                            const mu = filters.username.toLowerCase();

                            const orderNo = (
                              e.BillNo?.toString() ||
                              e.billNo?.toString() ||
                              e.OrderNo?.toString() ||
                              e.billNumber?.toString() ||
                              ''
                            ).toLowerCase();

                            const staffName = (
                              e.User ||
                              e.user ||
                              e.StaffName ||
                              e.username ||
                              ''
                            ).toLowerCase();

                            const billMatch = !mb || orderNo.includes(mb);
                            const userMatch = !mu || staffName.includes(mu);

                            return billMatch && userMatch;
                          })
                          : filteredNcReports;

                        if (filteredData.length === 0) {
                          return (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-gray-500">
                                {filters.fromDate && filters.toDate
                                  ? 'No NC (No Charge) records found for the selected date range'
                                  : 'Please select a date range to view NC report'}
                              </td>
                            </tr>
                          );
                        }

                        return filteredData.map((e, i) => {
                          // Parse date
                          let displayDate = '';
                          if (e.Date || e.date) {
                            const dateValue = e.Date || e.date;
                            try {
                              displayDate = new Date(dateValue).toLocaleDateString('en-GB');
                            } catch {
                              displayDate = dateValue;
                            }
                          }

                          // Get order number
                          const orderNo = e.BillNo || e.billNo || e.OrderNo || e.billNumber || '';

                          // Get table number
                          const tableNo = e.TableName || e.tableName || e.Table || e.tableNo || '';

                          // Get section name
                          const sectionName = e.SectionName || e.sectionName || e.Section || '';

                          // Get items
                          const items = e.Items || e.items || e.Item || e.item || '';

                          // Get amount
                          const amount = Number(e.Amount || e.amount || 0);

                          // Get user/staff name
                          const staffName = e.User || e.user || e.StaffName || e.username || '';

                          // Get customer name
                          const customerName = e.CustomerName || e.customerName || e.Customer || '';

                          return (
                            <tr
                              key={i}
                              className="border-b border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              <td className="py-1 px-3">{displayDate}</td>
                              <td className="py-1 px-3">{orderNo}</td>
                              <td className="py-1 px-3">{e.TransactionName || e.transactionName || ''}</td>
                              <td className="py-1 px-3">{tableNo}</td>
                              <td className="py-1 px-3">{sectionName}</td>
                              <td className="py-1 px-3">
                                {ncReportsAPI.length > 0 ? (
                                  <div>{items}</div>
                                ) : (
                                  Array.isArray(e.items) ? (
                                    e.items.map((it, j) => (
                                      <div key={j}>
                                        {it.name} × {it.quantity}
                                      </div>
                                    ))
                                  ) : (
                                    <div>{items}</div>
                                  )
                                )}
                              </td>
                              <td className="py-1 px-3 text-right font-semibold text-black">
                                {amount.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
                              </td>
                              <td className="py-1 px-3">{staffName}</td>
                              <td className="py-1 px-3">{customerName}</td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                    {(() => {
                      const dataSource = ncReportsAPI.length > 0 ? ncReportsAPI : filteredNcReports;
                      const filteredData = ncReportsAPI.length > 0
                        ? ncReportsAPI.filter(e => {
                          const mb = filters.billNumber.toLowerCase();
                          const mu = filters.username.toLowerCase();

                          const orderNo = (
                            e.BillNo?.toString() ||
                            e.billNo?.toString() ||
                            e.OrderNo?.toString() ||
                            e.billNumber?.toString() ||
                            ''
                          ).toLowerCase();

                          const staffName = (
                            e.User ||
                            e.user ||
                            e.StaffName ||
                            e.username ||
                            ''
                          ).toLowerCase();

                          const billMatch = !mb || orderNo.includes(mb);
                          const userMatch = !mu || staffName.includes(mu);

                          return billMatch && userMatch;
                        })
                        : filteredNcReports;

                      if (filteredData.length > 0) {
                        const totalAmount = filteredData.reduce((a, c) => {
                          const amount = Number(c.Amount || c.amount || 0);
                          return a + amount;
                        }, 0);

                        return (
                          <tfoot>
                            <tr className="font-semibold border-t border-gray-300 text-gray-800 bg-white">
                              <td colSpan={6} className="text-right py-2 px-3">
                                Total NC amount
                              </td>
                              <td className="py-2 px-3 text-right">
                                {totalAmount.toLocaleString('en-IN', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2
                                })}
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
                        <th className="py-2 px-3 bg-gray-100">Transaction</th>
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
                              <td colSpan={9} className="py-8 text-center text-gray-500">
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
                              {e.TransactionName || e.transactionName || ''}
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
                              <td colSpan={5} className="text-right py-2 px-3">
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
                <>
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
                            .filter(([id]) => !filters.section || String(id) === String(filters.section))
                            .map(([key, data]) => {
                              const section = data.name;
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
                    </table>
                  </div>

                  {summaryData && (
                    <div className="mt-8 border-t-2 border-gray-300 pt-0">
                      <table className="w-full text-sm border-collapse border-t border-gray-200">
                        <tbody>
                          <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-gray-700 font-medium">Total</td>
                            <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.GrossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-gray-700 font-medium">NoCash</td>
                            <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.NoCash).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-gray-700 font-medium">Discount</td>
                            <td className="py-2 px-4 text-right text-red-600 font-semibold">{Number(summaryData.Discount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-gray-700 font-medium">CGST</td>
                            <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.CGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="py-2 px-4 text-gray-700 font-medium">SGST</td>
                            <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.SGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          </tr>
                          <tr className="bg-gray-50 border-b border-gray-300">
                            <td className="py-3 px-4 text-gray-900 font-bold text-base">Grand Total</td>
                            <td className="py-3 px-4 text-right text-gray-900 font-black text-base">
                              {Number(summaryData.NetAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
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

          {/* CATEGORY SECTION REPORT - same table style as Section-wise / Sub-category */}
          {activeTab === 'categorySectionReport' && (
            <ReportWrapper
              title="Category Section Report"
              printRef={printRef}
              onPrint={handlePrint}
            >
              {loading ? (
                <div className="py-8 text-center text-gray-500">Loading...</div>
              ) : categorySectionReport == null ? (
                <div className="py-8 text-center text-gray-500">Select date range to load report.</div>
              ) : (() => {
                const raw = categorySectionReport?.data != null ? categorySectionReport.data : categorySectionReport;
                const rows = Array.isArray(raw) ? raw : [];
                if (rows.length === 0 || !rows[0].sections) {
                  return <div className="py-8 text-center text-gray-500">No data for the selected date range.</div>;
                }
                let grandTotal = 0;
                return (
                  <>
                    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100 border-t border-b border-gray-300 text-gray-800 font-semibold sticky top-0 z-10">
                            <th className="py-2 px-3 bg-gray-100">Category</th>
                            <th className="py-2 px-3 bg-gray-100">Section</th>
                            <th className="py-2 px-3 bg-gray-100 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, i) => {
                            const categoryName = row.categoryName ?? row.categoryId ?? '—';
                            const sections = Array.isArray(row.sections) ? row.sections : [];
                            const categoryTotal = typeof row.totalAmount === 'number' ? row.totalAmount : sections.reduce((s, sec) => s + (Number(sec.amount) || 0), 0);
                            grandTotal += categoryTotal;
                            return (
                              <React.Fragment key={i}>
                                {sections.length === 0 ? (
                                  <tr className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                                    <td className="py-1 px-3 font-medium text-gray-800">{categoryName}</td>
                                    <td className="py-1 px-3">—</td>
                                    <td className="py-1 px-3 text-right font-semibold text-gray-900">
                                      {Number(categoryTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                ) : (
                                  <>
                                    {sections.map((sec, j) => (
                                      <tr key={`${i}-${j}`} className="border-b border-gray-200 text-gray-700 hover:bg-gray-50">
                                        <td className="py-1 px-3 font-medium text-gray-800">{categoryName}</td>
                                        <td className="py-1 px-3">{sec.sectionName ?? sec.sectionId ?? '—'}</td>
                                        <td className="py-1 px-3 text-right font-semibold text-gray-900">
                                          {typeof sec.amount === 'number' ? Number(sec.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (sec.amount ?? '—')}
                                        </td>
                                      </tr>
                                    ))}
                                    <tr className="bg-gray-100 border-b-2 border-gray-300 font-semibold text-gray-800">
                                      <td className="py-2 px-3" colSpan={2}>Subtotal ({categoryName})</td>
                                      <td className="py-2 px-3 text-right">
                                        {Number(categoryTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                    </tr>
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="font-bold border-t-2 border-gray-400 text-gray-900 bg-gray-100">
                            <td className="py-2 px-3" colSpan={2}>Grand Total</td>
                            <td className="py-2 px-3 text-right">
                              {Number(grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {summaryData && (
                      <div className="mt-8 border-t-2 border-gray-300 pt-0">
                        <table className="w-full text-sm border-collapse border-t border-gray-200">
                          <tbody>
                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">Total</td>
                              <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.GrossAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">NoCash</td>
                              <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.NoCash).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">Discount</td>
                              <td className="py-2 px-4 text-right text-red-600 font-semibold">{Number(summaryData.Discount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">CGST</td>
                              <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.CGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="py-2 px-4 text-gray-700 font-medium">SGST</td>
                              <td className="py-2 px-4 text-right text-gray-900 font-semibold">{Number(summaryData.SGST).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-gray-50 border-b border-gray-300">
                              <td className="py-3 px-4 text-gray-900 font-bold text-base">Grand Total</td>
                              <td className="py-3 px-4 text-right text-gray-900 font-black text-base">
                                {Number(summaryData.NetAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                );
              })()}
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
      </main >
    </div >
  );
};

export default Reports;