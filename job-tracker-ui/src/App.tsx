import { Route, Routes } from "react-router"
import JobPage from "./pages/JobPage"

function App() {

  return (
    <Routes>
      {/* change to /jobs */}
      <Route path="/" element={<JobPage />} />
    </Routes>
  )
}

export default App
