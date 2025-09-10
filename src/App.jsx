import { Navigate, useLocation } from 'react-router-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Header from './components/Header';
import Login from './pages/Login';
import UserRegistrationForm from './pages/UserRegistrationForm';
import Dashboard from './components/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import { DriverDashBoard } from './components/DriverDashBoard';
import CheckLists from './components/CheckLists';
import InspectionsList from './components/InspectionsList';
import InspectionDetail from './components/InspectionDetail';
import Vehicles from './components/Vehicles';
import VehicleDetail from './components/VehicleDetail';
import VehicleEdit from './components/VehicleEdit';
import UserDetail from './components/UserDetail';
import UserList from './components/UserList';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb'; // import UK locale for dayjs
import { ToastContainer } from 'react-toastify';

import NotificationsPage from './components/Notifications';
import InspectionEdit from './components/InspectionEdit';
import Trailers from './components/Trailers';
import TrailerDetail from './components/TrailerDetail';


function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();


  const hideHeaderPaths = ['/login', '/register'];
  const shouldHideHeader = hideHeaderPaths.includes(location.pathname);

  return (
    <>
      {!shouldHideHeader && <Header />}

      <Routes>
        <Route
          path="/"
          element={
            loading ? (
              <p>Loading...</p>
            ) : user ? (
              user.role === 'driver' ? (
                <Navigate to="/driver-dashboard" />
              ) : (
                <Navigate to="/dashboard/inspections" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        <Route path="/login" element={<Login />} />
       
        {/* Admin dashboard routes */}
<Route
  path="/dashboard/*"
  element={
    <PrivateRoute>
      <Dashboard />
    </PrivateRoute>
  }
>
  <Route index element={<Navigate to="inspections" replace />} />
  <Route path="inspections" element={<InspectionsList />} />
  <Route path="inspections/:id" element={<InspectionDetail />} />
  <Route path="checklists" element={<CheckLists />} />
  <Route path="inspections/:id/edit" element={<InspectionEdit />} />

  
  
  {/* Vehicles routes */}
  <Route path="vehicles" element={<Vehicles />} />
  <Route path="vehicles/:id" element={<VehicleDetail />} />
  <Route path="vehicles/:id/edit" element={<VehicleEdit />} />

  {/* user rootes  */}
  <Route path='users' element={<UserList />} />
  <Route path='users/:id' element={<UserDetail />} />
  <Route path='notifications' element={<NotificationsPage />} />
{/* Trailers routes */}
  <Route path='trailers' element={<Trailers />} />
  <Route path='trailers/:id' element={<TrailerDetail />} />

</Route>




        {/* Driver routes */}
        <Route
          path="/driver-dashboard"
          element={
            <PrivateRoute>
              <DriverDashBoard />
            </PrivateRoute>
          }
        />
        <Route
          path="/driver-dashboard/:id"
          element={
            <PrivateRoute>
              <InspectionDetail />
            </PrivateRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  dayjs.locale('en-gb');
  return (
     <LocalizationProvider dateAdapter={AdapterDayjs} >
    <Router>
            <ToastContainer position="top-right" autoClose={3000} />
      <AppContent />
    </Router>
    </LocalizationProvider>
  );
}

export default App;
