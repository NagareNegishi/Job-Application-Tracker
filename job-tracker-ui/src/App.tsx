import { Navigate, Route, Routes } from "react-router"
import JobDetailPage from "./pages/JobDetailPage"
import JobPage from "./pages/JobPage"

function App() {

  return (
    <Routes>
      {/* Redirect the root path to /jobs */}
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/jobs" element={<JobPage />} />
      <Route path="/jobs/:id" element={<JobDetailPage />} />
    </Routes>
  )
}

export default App
