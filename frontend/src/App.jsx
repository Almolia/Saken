import './App.css'
import { ToastProvider } from './components/ToastProvider'
import { AppRoutes } from './router/AppRoutes'

function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  )
}

export default App