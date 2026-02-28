import { Navigate, Route, Routes } from "react-router"
import JobPage from "./pages/JobPage"

function App() {

  return (
    <Routes>
      {/* Redirect the root path to /jobs */}
      <Route path="/" element={<Navigate to="/jobs" replace />} />
      <Route path="/jobs" element={<JobPage />} />
    </Routes>
  )
}

export default App
