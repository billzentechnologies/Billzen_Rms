import React, { useState, useEffect, useRef } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';
import { verifySupervisorPassword } from '../services/apicall';

const SupervisorPasswordModal = ({
    isOpen,
    onClose,
    onSuccess,
    permissionName
}) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                setIsVisible(true);
                if (inputRef.current) inputRef.current.focus();
            }, 10);
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            setPassword('');
            setError('');
            document.body.style.overflow = 'unset';
        }
        return () => document.body.style.overflow = 'unset';
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password.trim()) {
            setError('Password is required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call API to verify password
            // Note: API returns true/false or object depending on implementation
            // Adjust handling based on actual API response structure
            const result = await verifySupervisorPassword(password, permissionName);

            console.log('Password verification result:', result);

            // Check if result is truthy or has success property
            // Assuming API returns true/false directly or { success: true }
            // The user prompt said: "api/PermissionCheck?password=999&permissionName=admin%20page"

            const isAuthenticated = result === true ||
                result?.result === true ||
                result?.success === true ||
                result?.status === true ||
                result === "Access Granted";

            if (isAuthenticated) {
                onSuccess();
                onClose();
            } else {
                setError('Invalid supervisor password');
            }
        } catch (err) {
            console.error('Password verification error:', err);
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[70] flex items-center justify-center p-4 transition-all duration-300 ${isVisible ? 'bg-black bg-opacity-60 backdrop-blur-sm' : 'bg-black bg-opacity-0'
                }`}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`bg-white rounded-xl shadow-2xl w-full max-w-[320px] transform transition-all duration-300 ${isVisible ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
                    }`}
            >
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-blue-50 rounded-full">
                            <Lock className="w-6 h-6 text-blue-600" />
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        Supervisor Approval
                    </h2>

                    <p className="text-sm text-gray-500 mb-6">
                        Permission required for <span className="font-semibold text-gray-700">{permissionName}</span>. Please enter supervisor password.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            <div>
                                <input
                                    ref={inputRef}
                                    type="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (error) setError('');
                                    }}
                                    placeholder="Enter Password"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg animate-shake">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-blue-200 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Authorize Access'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SupervisorPasswordModal;
