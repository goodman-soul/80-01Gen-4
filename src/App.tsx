import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import AppHeader from '@/components/AppHeader'
import Home from '@/pages/Home'
import LoginPage from '@/pages/LoginPage'
import ClientConfirm from '@/pages/ClientConfirm'

const Rental = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">租赁公司面板</h1>
      <p className="text-brand-gray">Rental Company Dashboard - Coming Soon</p>
    </div>
  </div>
)

const RentalSync = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">数据同步表单</h1>
      <p className="text-brand-gray">Data Sync Form - Coming Soon</p>
    </div>
  </div>
)

const Dispatch = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">调度中心</h1>
      <p className="text-brand-gray">Dispatch Center - Coming Soon</p>
    </div>
  </div>
)

const Tech = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">技师工作台</h1>
      <p className="text-brand-gray">Technician Workbench - Coming Soon</p>
    </div>
  </div>
)

const TechWorkOrder = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">工单填写</h1>
      <p className="text-brand-gray">Work Order Form - Coming Soon</p>
    </div>
  </div>
)

const TechOffline = () => (
  <div className="p-6">
    <div className="industrial-card p-6">
      <h1 className="font-display text-2xl text-white mb-2">离线同步中心</h1>
      <p className="text-brand-gray">Offline Sync Center - Coming Soon</p>
    </div>
  </div>
)

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
          <Route path="/rental" element={<Rental />} />
          <Route path="/rental/sync" element={<RentalSync />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/tech" element={<Tech />} />
          <Route path="/tech/workorder/:id" element={<TechWorkOrder />} />
          <Route path="/tech/offline" element={<TechOffline />} />
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
