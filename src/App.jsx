import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ShippingPlans from './pages/ShippingPlans';
import EditPlan from './pages/EditPlan';
import ClusterSettings from './pages/ClusterSettings';
import ShippingPointSettings from './pages/ShippingPointSettings';
import AccountSettings from './pages/AccountSettings';
import Login from './pages/Login';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/shipping-plans" replace />} />
            <Route path="shipping-plans" element={<ShippingPlans />} />
            <Route path="shipping-plans/:id/edit" element={<EditPlan />} />
            <Route path="cluster-settings" element={<ClusterSettings />} />
            <Route path="shipping-point-settings" element={<ShippingPointSettings />} />
            <Route path="account-settings" element={<AccountSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;