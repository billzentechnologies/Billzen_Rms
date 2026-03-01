import axios from "axios"; // Test comment

// Default values (fallback if config.json fails to load)
// let API_BASE = "http://DESKTOP-RBAK6HS/RestaurentAPI/api";
// Default values (fallback if config.json fails to load)
// let API_BASE = "http://localhost/RestaurentAPI/api";

// let API_BASE = "http://devbillzen-001-site7.atempurl.com/api";
// let API_BASE = "http://devbillzen-001-site29.ktempurl.com/api";

let API_BASE = "http://localhost:44306/api";


let SUBSCRIBER_ID = "1";
let ADMIN_PAGE_URL = "http://localhost:40/login";
let KOT_REDIRECT_URL = "/tables";
let configLoaded = false;

// Load configuration from config.json at runtime
export const loadConfig = async () => {
  if (configLoaded) return;

  // 1. Try to load from external config (for Electron builds)
  // In Electron's renderer process with nodeIntegration: true
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    try {
      const fs = window.require('fs');
      const path = window.require('path');
      const resourcesPath = window.process.resourcesPath;
      const externalConfigPath = path.join(resourcesPath, 'config.json');

      if (fs.existsSync(externalConfigPath)) {
        const data = fs.readFileSync(externalConfigPath, 'utf8');
        const config = JSON.parse(data);

        if (config.API_BASE_URL) API_BASE = config.API_BASE_URL;
        if (config.SUBSCRIBER_ID) SUBSCRIBER_ID = config.SUBSCRIBER_ID.toString();
        if (config.ADMIN_PAGE_URL) ADMIN_PAGE_URL = config.ADMIN_PAGE_URL;
        if (config.KOT_REDIRECT_URL) KOT_REDIRECT_URL = config.KOT_REDIRECT_URL;

        configLoaded = true;
        console.log("✅ Config loaded from EXTERNAL file:", externalConfigPath);
        return;
      }
    } catch (err) {
      console.log("ℹ️ External config not found or not in Electron, falling back to fetch...");
    }
  }

  // 2. Fallback for Dev mode / Browser
  try {
    const response = await fetch("./config.json?t=" + Date.now());
    const config = await response.json();

    if (config.API_BASE_URL) API_BASE = config.API_BASE_URL;
    if (config.SUBSCRIBER_ID) SUBSCRIBER_ID = config.SUBSCRIBER_ID.toString();
    if (config.ADMIN_PAGE_URL) ADMIN_PAGE_URL = config.ADMIN_PAGE_URL;
    if (config.KOT_REDIRECT_URL) KOT_REDIRECT_URL = config.KOT_REDIRECT_URL;

    configLoaded = true;
    console.log("✅ Config loaded from relative path");
  } catch (error) {
    console.error("❌ Failed to load config.json, using defaults:", error);
  }
};

// Get current subscriber ID (exported for use in other files if needed)
export const getSubscriberId = () => SUBSCRIBER_ID;
export const getApiBase = () => API_BASE;
export const getAdminPageUrl = () => ADMIN_PAGE_URL;
export const getKotRedirectUrl = () => KOT_REDIRECT_URL;

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

// Update axios baseURL dynamically after config loads
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = API_BASE; // Use current API_BASE value
    console.log(`➡️ API Request: ${config.method?.toUpperCase()} ${config.url}`, config.data);
    return config;
  },
  (error) => {
    console.error("❌ Request Error:", error);
    return Promise.reject(error);
  }
);

// Debug response logs
apiClient.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error("❌ Response Error:", error.response || error.message);
    return Promise.reject(error);
  }
);

// ✅ UPDATED: Login API using dynamic SUBSCRIBER_ID
export const loginUser = async (credentials) => {
  try {
    const response = await apiClient.post("/login/Validate", {
      login_id: credentials.username,
      password: credentials.password,
      device_id: credentials.device_id, // Added device_id
      subscriber_id: parseInt(SUBSCRIBER_ID) // Uses runtime value
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
};

// Update subscription key
export const updateSubscriptionKey = async (payload) => {
  try {
    const response = await apiClient.post("/login/UpdateSubscriptionKey", {
      subscriber_id: payload.subscriber_id,
      subscription_key: payload.subscription_key
    });
    return response.data;
  } catch (error) {
    console.error("Error updating subscription key:", error);
    throw error.response ? error.response.data : error;
  }
};

// Get all subcategories
export const getSubCategories = async () => {
  try {
    const response = await apiClient.get("/SubCatagory");
    return response.data;
  } catch (error) {
    console.error("Error fetching subcategories:", error);
    throw error.response ? error.response.data : error;
  }
};

// Get all items
export const getItems = async () => {
  try {
    const response = await apiClient.get("/Item");
    return response.data;
  } catch (error) {
    console.error("Error fetching items:", error);
    throw error.response ? error.response.data : error;
  }
};

// Get item variants
export const getItemVariants = async (itemId) => {
  try {
    const response = await apiClient.get(`/GetItemVariants?itemId=${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching item variants:", error);
    throw error.response ? error.response.data : error;
  }
};

// Get all tables with sections
export const getTables = async () => {
  try {
    const response = await apiClient.get("/GetSectionTables");
    return response.data;
  } catch (error) {
    console.error("Error fetching tables:", error);
    throw error.response ? error.response.data : error;
  }
};



// ✅ NEW: Get Occupied Tables
export const getOccupiedTables = async () => {
  try {
    const response = await apiClient.get("/tables/occupied");
    console.log("✅ Occupied Tables Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching occupied tables:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Get Merge List (all tables for merge selection)
export const getMergeList = async () => {
  try {
    const response = await apiClient.get("/tables/merge-list");
    console.log("✅ Merge List Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching merge list:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Merge Tables
export const mergeTables = async (payload) => {
  try {
    const response = await apiClient.post("/tables/merge", payload);
    console.log("✅ Merge Tables Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error merging tables:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ Split Table API
export const splitTable = async (tableId, payload) => {
  try {
    const response = await apiClient.post(`/tables/${tableId}/split`, payload);
    console.log("✅ Split Table Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error splitting table:", error);
    throw error.response ? error.response.data : error;
  }
};


// ✅ Bill Split API
export const splitBill = async (payload) => {
  try {
    const response = await apiClient.post("/billing/split-bill", payload);
    console.log("✅ Bill Split Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error splitting bill:", error);
    throw error.response ? error.response.data : error;
  }
};
// ✅ NEW: Add Chair to Table
export const addChairToTable = async (tableId) => {
  try {
    const response = await apiClient.post(`/tables/${tableId}/add-chair`);
    console.log("✅ Add Chair Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error adding chair:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Get Table Children
export const getTableChildren = async (tableId) => {
  try {
    const response = await apiClient.get(`/tables/${tableId}/children`);
    console.log("✅ Get Table Children Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching table children:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Get Table Sessions
export const getTableSessions = async (tableId) => {
  try {
    const response = await apiClient.get(`/tables/${tableId}/sessions`);
    console.log("✅ Get Table Sessions Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching table sessions:", error);
    throw error.response ? error.response.data : error;
  }
};











export const getTransactionTypes = async () => {
  const response = await apiClient.get("/Transaction?transactionId=0");
  return response.data;
};

// SAVE ORDER API (KOT)
export const saveOrder = async (orderPayload) => {
  try {
    const response = await apiClient.post("/SaveOrder", orderPayload);
    return response.data;
  } catch (error) {
    console.error("Error saving order:", error);
    throw error.response ? error.response.data : error;
  }
};




// SAVE BILL API
export const saveBill = async (billPayload) => {
  try {
    const response = await apiClient.post("/sales/savebill", billPayload);
    return response.data;
  } catch (error) {
    console.error("Error saving bill:", error);
    throw error.response ? error.response.data : error;
  }
};









// Get takeaway hold orders
export const getTakeawayOrders = async () => {
  try {
    const response = await apiClient.get("/order/takeaway");
    console.log("✅ Takeaway Orders Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching takeaway orders:", error);
    throw error.response ? error.response.data : error;
  }
};

// Get home delivery hold orders
export const getHomeDeliveryOrders = async () => {
  try {
    const response = await apiClient.get("/order/homedelivery");
    console.log("✅ Home Delivery Orders Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching home delivery orders:", error);
    throw error.response ? error.response.data : error;
  }
};

// Save Item Void API
export const saveItemVoid = async (voidPayload) => {
  try {
    const response = await apiClient.post("/order/saveItemVoid", voidPayload);
    console.log("✅ Item Void Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error saving item void:", error);
    throw error.response ? error.response.data : error;
  }
};

// Mark Item Complimentary API
export const markComplimentary = async (complimentaryPayload) => {
  try {
    const response = await apiClient.post("/order/markComplimentary", complimentaryPayload);
    console.log("✅ Mark Complimentary Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error marking item as complimentary:", error);
    throw error.response ? error.response.data : error;
  }
};




// // Check Print API function
// export const printCheck = async (payload) => {
//   try {
//     const response = await apiClient.post("/CheckPrint", payload);
//     return response.data;
//   } catch (error) {
//     console.error("Error printing check:", error);
//     throw error.response ? error.response.data : error;
//   }
// };




export const printCheck = async (payload) => {
  try {
    const response = await apiClient.post("/checkprint/fromweb", payload);
    console.log("✅ Check Print Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error printing check:", error);
    throw error.response ? error.response.data : error;
  }
};
// Get order details by orderId
export const getOrderDetails = async (orderId) => {
  try {
    const response = await apiClient.get(`/GetOrderDetails?orderId=${orderId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getBillWiseReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.post("/BillWiseReport", {
      FromDate: fromDate,
      ToDate: toDate
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching bill wise report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getPaymentWiseReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.post("/PaymentWiseReport", {
      FromDate: fromDate,
      ToDate: toDate
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching payment wise report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getSalesByItem = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get(
      `/SalesByItem?fromDate=${fromDate}&toDate=${toDate}`
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching SalesByItem report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getSalesByCategorySubCategory = async (
  fromDate,
  toDate,
  categoryId,
  subcategory_id
) => {
  try {
    const response = await apiClient.get('/SalesByCategorySubCategory', {
      params: { fromDate, toDate, categoryId, subcategory_id },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching SalesByCategorySubCategory:', error);
    throw (error.response && error.response.data) || error;
  }
};

export const getTransactionReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/transactionreport", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching transaction report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getVoidReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/voidreport", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching void report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getCancelReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/ordercancel", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching cancel report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getSubCategoryReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/categorysales/flat", {
      params: {
        fromDate,
        toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching sub-category report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getDiscountReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/discountreport", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching discount report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getSectionWiseReport = async (fromDate, toDate, sectionId = null, categoryId = null) => {
  try {
    const payload = {
      FromDate: fromDate,
      ToDate: toDate
    };

    if (sectionId) {
      payload.SectionId = sectionId;
    }

    if (categoryId) {
      payload.CategoryId = categoryId;
    }

    const response = await apiClient.post("/reports/section-wise", payload);
    return response.data;
  } catch (error) {
    console.error("Error fetching section-wise report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getDiscounts = async () => {
  try {
    const response = await apiClient.get("/Discount?discountId=0");
    return response.data;
  } catch (error) {
    console.error("Error fetching discounts:", error);
    throw error.response ? error.response.data : error;
  }
};

export const cancelOrder = async (orderId, staffId, reason) => {
  try {
    const response = await apiClient.put(
      `/sales/updatestatus/ordercancel?orderId=${orderId}&staffId=${staffId}&reason=${encodeURIComponent(reason)}`
    );
    return response.data;
  } catch (error) {
    console.error("Error cancelling order:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getVariants = async () => {
  try {
    const response = await apiClient.get("/GetVariants");
    return response.data;
  } catch (error) {
    console.error("Error fetching variants:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getTaxes = async () => {
  try {
    const response = await apiClient.get("/Tax?taxId=0");
    return response.data;
  } catch (error) {
    console.error("Error fetching taxes:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getSections = async () => {
  try {
    const response = await apiClient.get("/Section?sectionId=0");
    return response.data;
  } catch (error) {
    console.error("Error fetching sections:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getCategories = async () => {
  try {
    const response = await apiClient.get("/Category?categoryId=0");
    return response.data;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getUnits = async () => {
  try {
    const response = await apiClient.get("/Unit?unitId=0");
    return response.data;
  } catch (error) {
    console.error("Error fetching units:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getItemById = async (itemId) => {
  try {
    const response = await apiClient.get(`/Item?itemId=${itemId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching item by ID:", error);
    throw error.response ? error.response.data : error;
  }
};

export const updateItem = async (payload) => {
  try {
    const response = await apiClient.put("/Item", payload);
    return response.data;
  } catch (error) {
    console.error("Error updating item:", error);
    throw error.response ? error.response.data : error;
  }
};

export const addItem = async (payload) => {
  try {
    const response = await apiClient.post("/Item", payload);
    return response.data;
  } catch (error) {
    console.error("Error adding item:", error);
    throw error.response ? error.response.data : error;
  }
};




export const getNCReport = async (fromDate, toDate) => {
  try {
    // API expects dd-MM-yyyy format
    const response = await apiClient.get("/reports/ncreport", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching NC report:", error);
    throw error.response ? error.response.data : error;
  }
};






// FINAL CORRECTED VERSION - Replace getSalesHistory in your api.js

// Based on the C# API signature that expects DateTime parameters,
// we need to send the date in a format the C# API can parse

export const getSalesHistory = async (startDate, endDate, outletId = 1) => {
  try {
    // C# DateTime.Parse expects MM-DD-YYYY or YYYY-MM-DD format, NOT DD-MM-YYYY
    // Convert DD-MM-YYYY to YYYY-MM-DD for C# parsing
    const convertToAPIFormat = (ddmmyyyy) => {
      const [day, month, year] = ddmmyyyy.split('-');
      return `${year}-${month}-${day}`; // Returns YYYY-MM-DD
    };

    const formattedStartDate = convertToAPIFormat(startDate);
    const formattedEndDate = convertToAPIFormat(endDate);

    const response = await apiClient.get("/sales/history", {
      params: {
        startDate: formattedStartDate,  // YYYY-MM-DD
        endDate: formattedEndDate,      // YYYY-MM-DD
        outletId: outletId
      }
    });

    console.log("✅ Sales History Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching sales history:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Get Bill Details by ID
export const getBillDetails = async (billId) => {
  try {
    const response = await apiClient.get(`/sales/bill-details/${billId}`);
    console.log("✅ Bill Details Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error fetching bill details:", error);
    throw error.response ? error.response.data : error;
  }
};



// ✅ ADD THIS TO YOUR apicall.jsx FILE

// Print Bill API
export const printBill = async (billId) => {
  try {
    const response = await apiClient.post(`/sales/printbill/${billId}`);
    console.log("✅ Print Bill Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error printing bill:", error);
    throw error.response ? error.response.data : error;
  }
};



// ✅ NEW: Get Sales Date Info (Day Closing)
export const getSalesDate = async () => {
  try {
    const response = await apiClient.get("/dayclosing/salesdate");
    console.log("✅ Sales Date Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching sales date:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Close Day API
export const closeDayAPI = async () => {
  try {
    const response = await apiClient.post("/dayclosing/close");
    console.log("✅ Day Close Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error closing day:", error);
    throw error.response ? error.response.data : error;
  }
};


// ✅ Get POS User Permissions (using apiClient & dynamic API_BASE)
export const getUserPermissions = async (userId) => {
  try {
    const response = await apiClient.get("/POSUserPermissions", {
      params: {
        user_id: userId
      }
    });

    console.log("✅ User Permissions Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching user permissions:", error);
    throw error.response ? error.response.data : error;
  }
};


// ✅ Verify Supervisor Password
export const verifySupervisorPassword = async (password, permissionName) => {
  try {
    // API URL: http://devbillzen-001-site7.atempurl.com/api/PermissionCheck?password=999&permissionName=admin%20page
    const response = await apiClient.get('/PermissionCheck', {
      params: {
        password: password,
        permissionName: permissionName
      }
    });
    console.log("✅ Permission Check Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error verifying supervisor password:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getRunningOrders = async () => {
  try {
    const response = await apiClient.get("/order/running-orders");
    console.log("✅ Running Orders Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching running orders:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getOrderKOTs = async (orderId) => {
  try {
    const response = await apiClient.get(`/order/${orderId}/kots`);
    console.log(`✅ KOTs for Order ${orderId} Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching KOTs for order ${orderId}:`, error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Day Report Print API
export const printReportConfig = async (fromDate, toDate) => {
  try {
    // API URL: http://localhost:44306/api/reportprintconfig/print
    const response = await apiClient.post("/reportprintconfig/print", {
      fromDate: fromDate,
      toDate: toDate
    });
    console.log("✅ Report Print Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error printing report:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Report Preview API
export const getReportPreview = async (fromDate, toDate) => {
  try {
    const response = await apiClient.post("/reportprintconfig/preview", {
      fromDate: fromDate,
      toDate: toDate
    }, {
      responseType: 'blob'
    });
    console.log("✅ Report Preview Response (Blob):", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching report preview:", error);
    throw error.response ? error.response.data : error;
  }
};

// Assuming reprint endpoint exists at /order/reprint-kot
export const reprintKOT = async (payload) => {
  try {
    const response = await apiClient.post("/order/reprint-kot", payload);
    console.log("✅ Reprint KOT Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error reprinting KOT:", error);
    throw error.response ? error.response.data : error;
  }
};

// Category Section Report (dates in dd-MM-yyyy)
export const getCategorySectionReport = async (fromDate, toDate) => {
  try {
    const toDDMMYYYY = (ymd) => {
      if (!ymd) return '';
      const [y, m, d] = String(ymd).split('-');
      return d && m && y ? `${d}-${m}-${y}` : ymd;
    };
    const from = toDDMMYYYY(fromDate);
    const to = toDDMMYYYY(toDate);
    const response = await apiClient.get("/reports/categorysectionreport", {
      params: { fromDate: from, toDate: to },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching category section report:", error);
    throw error.response ? error.response.data : error;
  }
};

// Sales summary / consolidation report
export const getSalesSummary = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/salesummary", {
      params: { fromDate, toDate },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching sales summary:", error);
    throw error.response ? error.response.data : error;
  }
};

// ✅ NEW: Complimentary Report API
export const getComplimentaryReport = async (fromDate, toDate) => {
  try {
    const response = await apiClient.get("/reports/complimentary", {
      params: {
        fromDate: fromDate,
        toDate: toDate
      }
    });
    console.log("✅ Complimentary Report API Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching complimentary report:", error);
    throw error.response ? error.response.data : error;
  }
};

export const getCompany = async () => {
  try {
    const response = await apiClient.get("/Company?companyid=0");
    return response.data;
  } catch (error) {
    console.error("❌ Error fetching company info:", error);
    throw error.response ? error.response.data : error;
  }
};

export default apiClient;