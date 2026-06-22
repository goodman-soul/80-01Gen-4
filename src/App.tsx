import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import AppHeader from '@/components/AppHeader'
import Home from '@/pages/Home'
import LoginPage from '@/pages/LoginPage'
import RentalDashboard from '@/pages/RentalDashboard'
import RentalSyncForm from '@/pages/RentalSyncForm'
import DispatchCenter from '@/pages/DispatchCenter'
import TechHome from '@/pages/TechHome'
import TechWorkOrder from '@/pages/TechWorkOrder'
import TechOfflineSync from '@/pages/TechOfflineSync'
import ClientConfirm from '@/pages/ClientConfirm'

const ToastContainer = () => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite" />
)

const Layout = () => {
  const location = useLocation()
  const path = location.pathname
  const hideHeader = path.startsWith('/tech') || path.startsWith('/client')

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader hideHeader={hideHeader} />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/rental" element={<RentalDashboard />} />
          <Route path="/rental/sync" element={<RentalSyncForm />} />
          <Route path="/dispatch" element={<DispatchCenter />} />
          <Route path="/tech" element={<TechHome />} />
          <Route path="/tech/workorder/:id" element={<TechWorkOrder />} />
          <Route path="/tech/offline" element={<TechOfflineSync />} />
          <Route path="/client/confirm/:id" element={<ClientConfirm />} />
        </Routes>
      </main>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <Router>
      <Layout />
    </Router>
  )
}
