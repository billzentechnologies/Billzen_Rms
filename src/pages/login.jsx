import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, updateSubscriptionKey } from "../services/apicall";
import { getUserPermissions } from "../services/apicall";
import { storePermissions } from '../components/permissions';
import { getDeviceInfo, saveLogToFile } from "../utils/deviceInfo";
import logo from "../assets/Billzen main1.png";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [subscriptionKey, setSubscriptionKey] = useState("");
  const [keyError, setKeyError] = useState("");
  const [isActivatingKey, setIsActivatingKey] = useState(false);
  const [keySuccess, setKeySuccess] = useState("");
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [expiryWarningData, setExpiryWarningData] = useState(null);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username or email is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchUserPermissions = async (userId) => {
    try {
      console.log('🔐 Fetching permissions for user:', userId);
      const permissions = await getUserPermissions(userId);
      console.log('📥 Permissions received:', permissions);

      // Store permissions in localStorage
      storePermissions(permissions);

      return true;
    } catch (error) {
      console.error('❌ Failed to fetch permissions:', error);
      // Continue even if permissions fail - they'll have no permissions
      storePermissions([]);
      return false;
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const deviceInfo = getDeviceInfo();
      console.log("Device Info:", deviceInfo);

      const data = await loginUser({
        username: formData.username,
        password: formData.password,
        device_id: deviceInfo.deviceId
          // device_id: '52FBA27D-2E71-4C42-A04D-8FDF3BE24108' // Sending device id
      });

      console.log("API Response:", data);

      if (data.status === true) {
        // Store all user data including username
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("userId", data.id);
        localStorage.setItem("subscriberId", data.subscriber_id);
        localStorage.setItem("restaurantName", data.restaurant_name || "");
        localStorage.setItem("deviceId", deviceInfo.deviceId);
        localStorage.setItem("systemName", deviceInfo.systemName);

        // Record login history in localStorage
        const loginHistory = JSON.parse(localStorage.getItem("loginHistory") || "[]");
        loginHistory.unshift({
          userName: data.user_name || formData.username,
          loginTime: new Date().toISOString(),
          deviceId: deviceInfo.deviceId,
          systemName: deviceInfo.systemName,
          status: "Success"
        });
        localStorage.setItem("loginHistory", JSON.stringify(loginHistory.slice(0, 100)));

        // 💾 Save SUCCESS to physical file
        saveLogToFile({
          userName: data.user_name || formData.username,
          deviceId: deviceInfo.deviceId,
          systemName: deviceInfo.systemName,
          status: "SUCCESS"
        });

        // Store username/login name
        localStorage.setItem("userName", data.user_name || data.username || data.login_id || formData.username);
        localStorage.setItem("loginTime", new Date().toISOString());

        console.log("Login successful - Username:", data.user_name || formData.username);

        // 🔐 Fetch and store user permissions
        await fetchUserPermissions(data.id);

        // Check if there's an expiry warning
        if (data.expiry_warning || data.has_expiry_warning) {
          setExpiryWarningData({
            warning: data.expiry_warning,
            daysUntilExpiry: data.days_until_expiry,
            message: data.message
          });
          setShowExpiryWarning(true);
        } else {
          // No warning, navigate directly
          navigate("/billing", { replace: true });
        }
      } else {
        // 💾 Save FAILURE (like Device ID mismatch) to physical file
        saveLogToFile({
          userName: formData.username,
          deviceId: deviceInfo.deviceId,
          systemName: deviceInfo.systemName,
          status: "FAILED",
          message: data.message || "Invalid credentials"
        });

        setErrors({
          username: data.message || "Invalid credentials",
          password: " ",
        });
      }
    } catch (error) {
      console.error("Login error:", error);

      // 💾 Save CRITICAL ERROR to physical file
      const deviceInfo = getDeviceInfo();
      saveLogToFile({
        userName: formData.username,
        deviceId: deviceInfo.deviceId,
        systemName: deviceInfo.systemName,
        status: "ERROR",
        message: error?.message || "Internal system error"
      });

      setErrors({
        username: error?.message || "Login failed. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateKey = async () => {
    if (!subscriptionKey.trim()) {
      setKeyError("Please enter a subscription key");
      return;
    }

    setIsActivatingKey(true);
    setKeyError("");
    setKeySuccess("");

    try {
      const response = await updateSubscriptionKey({
        subscriber_id: 1,
        subscription_key: subscriptionKey.trim()
      });

      console.log("Key activation response:", response);

      if (response.status === true || response.success) {
        setKeySuccess("Subscription key activated successfully!");
        setTimeout(() => {
          setShowKeyModal(false);
          setSubscriptionKey("");
          setKeySuccess("");
        }, 2000);
      } else {
        setKeyError(response.message || "Failed to activate key");
      }
    } catch (error) {
      console.error("Key activation error:", error);
      setKeyError(error?.message || "Failed to activate subscription key");
    } finally {
      setIsActivatingKey(false);
    }
  };

  const handleKeyModalClose = () => {
    setShowKeyModal(false);
    setSubscriptionKey("");
    setKeyError("");
    setKeySuccess("");
  };

  const handleExpiryWarningClose = () => {
    setShowExpiryWarning(false);
    navigate("/billing", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        {/* Logo Section */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-4">
            <img
              src={logo}
              alt="Billzen Logo"
              className="h-50 w-auto"
            />
          </div>

        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 border">
          <form onSubmit={handleSignIn}>
            <div className="mb-4">
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                User Id
              </label>
              <input
                name="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange}
                autoComplete="username"
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${errors.username
                  ? "border-red-500 focus:ring-red-300"
                  : "border-gray-300 focus:ring-blue-300"
                  }`}
                placeholder="Enter User Id"
              />
              {errors.username && (
                <div className="text-sm text-red-600 mt-1">
                  {errors.username}
                </div>
              )}
            </div>

            <div className="mb-5">
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-gray-700"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete="current-password"
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 pr-10 ${errors.password
                    ? "border-red-500 focus:ring-red-300"
                    : "border-gray-300 focus:ring-blue-300"
                    }`}
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a9.97 9.97 0 00-2.071 3.414m1.485-1.414L9.464 8.464m4.185 4.185L8.535 12.65M12 9a3.001 3.001 0 00-2.83 2.001" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <div className="text-sm text-red-600 mt-1">
                  {errors.password}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 px-4 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition duration-200 ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                "Log In "
              )}
            </button>
          </form>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              className="w-full py-2 px-4 text-sm font-medium text-blue-600 bg-white border border-blue-600 hover:bg-blue-50 rounded-md transition duration-200"
            >
              Activate Key
            </button>
          </div>
        </div>
      </div>

      {/* Key Activation Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Activate Subscription Key</h2>
              <button
                onClick={handleKeyModalClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="subscriptionKey" className="block text-sm font-medium text-gray-700 mb-2">
                Subscription Key
              </label>
              <input
                type="text"
                id="subscriptionKey"
                value={subscriptionKey}
                onChange={(e) => {
                  setSubscriptionKey(e.target.value);
                  setKeyError("");
                  setKeySuccess("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your subscription key"
              />
              {keyError && (
                <div className="text-sm text-red-600 mt-2">
                  {keyError}
                </div>
              )}
              {keySuccess && (
                <div className="text-sm text-green-600 mt-2">
                  {keySuccess}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleKeyModalClose}
                className="flex-1 py-2 px-4 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateKey}
                disabled={isActivatingKey}
                className={`flex-1 py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200 ${isActivatingKey ? "opacity-50 cursor-not-allowed" : ""
                  }`}
              >
                {isActivatingKey ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Activating...
                  </div>
                ) : (
                  "Activate"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Warning Modal */}
      {showExpiryWarning && expiryWarningData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 text-center">Subscription Warning</h2>
            </div>

            <div className="mb-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <p className="text-sm text-yellow-800 text-center font-medium">
                  {expiryWarningData.warning}
                </p>
              </div>

              {expiryWarningData.daysUntilExpiry !== undefined && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Days remaining: <span className="font-semibold text-red-600">{expiryWarningData.daysUntilExpiry}</span>
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleExpiryWarningClose}
              className="w-full py-2 px-4 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;