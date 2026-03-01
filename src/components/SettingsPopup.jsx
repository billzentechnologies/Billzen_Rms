import React from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPopup = ({ showSettings, setShowSettings }) => {
  const navigate = useNavigate();

  if (!showSettings) return null;

  return (
    <div className="fixed top-16 right-4 bg-white border rounded-lg shadow-lg p-4 w-64 z-50">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Settings</h3>
        <button onClick={() => setShowSettings(false)}>
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-2 text-sm">
        <button
          className="w-full text-left p-2 hover:bg-gray-100 rounded"
          // onClick={() => window.location.href = 'http://devbillzen-001-site8.atempurl.com/login'}
                              onClick={() => window.location.href = 'http://localhost:3001/dashboard'}

        >
          Admin page
        </button>
        <button
          className="w-full text-left p-2 hover:bg-gray-100 rounded"
          onClick={() => navigate('/reports')}
        >
          Reports
        </button>
      </div>
    </div>
  );
};

export default SettingsPopup;
