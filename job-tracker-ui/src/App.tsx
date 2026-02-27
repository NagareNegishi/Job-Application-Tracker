import {
  useQuery
} from '@tanstack/react-query'
import { JobTable } from './components/jobTable'
import { getJobs } from './services/jobService'

function App() {
  // jobs list
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: getJobs })

  return (
    <div className="App">
      {/* <p className="text-2xl font-bold mb-4">Job Tracker</p> */}
      <JobTable jobs={jobs ?? []} />
    </div>
  )
}

export default App
