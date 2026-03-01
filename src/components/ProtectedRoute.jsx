import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  
  // Only redirect if explicitly not logged in
  if (!isLoggedIn || isLoggedIn !== 'true') {
    console.log("ProtectedRoute: No valid login found, redirecting to login");
    return <Navigate to="/login" replace />;
  }
  
  // User is logged in, show the protected content
  return children;
};

export default ProtectedRoute;
