import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, Settings, Grid3x3, Menu, Calendar } from 'lucide-react';
import logo from '../assets/Billzen main1.png';

const Header = ({
  createNewOrder,
  handleCallSupport,
  handleSettings,
  salesDate
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const displayDate = salesDate || localStorage.getItem('salesDateFormatted');


  const handleTables = () => navigate('/tables');

  const handleLogoClick = () => {
    if (location.pathname === '/tables') {
      navigate('/billing', { replace: true, state: null });
    } else if (location.pathname === '/billing') {
      navigate('/tables', { replace: true });
    } else {
      navigate(-1);
    }
  };

  const callSupport = () => {
    const whatsappUrl = 'https://wa.me/919686067462';
    window.open(whatsappUrl, '_blank');
  };

  const openSettings = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (handleSettings) handleSettings();
  };

  const isTablesPage = location.pathname === '/tables';

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="flex items-center px-4 py-2">

        {/* LEFT SECTION */}
        <div className="flex items-center space-x-4 flex-1">
          <img
            src={logo}
            alt="Billzen Logo"
            style={{ height: '50px', cursor: 'pointer' }}
            onClick={handleLogoClick}
          />

          {createNewOrder && (
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
              onClick={createNewOrder}
            >
              New Order
            </button>
          )}

          {!isTablesPage && (
            <button
              className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 flex items-center space-x-1"
              onClick={handleTables}
            >
              <Grid3x3 className="w-4 h-4" />
              <span>Tables</span>
            </button>
          )}
        </div>

        {/* CENTER SECTION - SALE DATE & SYSTEM NAME */}
        <div className="flex-1 flex flex-col items-center">
          {displayDate && (
            <div className="flex items-center space-x-2 text-gray-700">
              <span className="font-semibold text-base">
                Sale Date: {displayDate}
              </span>
            </div>
          )}
        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center justify-end space-x-6 text-sm flex-1">
          <div
            className="flex items-center space-x-1 cursor-pointer hover:text-green-600"
            onClick={callSupport}
            title="Chat on WhatsApp"
          >
            <Phone className="w-4 h-4" />
            <span>Contact for Support</span>
            <span className="font-semibold">9686067462</span>
          </div>

          <button
            type="button"
            className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center hover:bg-gray-300 cursor-pointer"
            onClick={openSettings}
            title="Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;