import { JobTable } from './components/jobTable'
// import {
//   useQuery,
//   useMutation,
//   useQueryClient,
//   QueryClient,
//   QueryClientProvider,
// } from '@tanstack/react-query'
// import { getJobs } from './services/jobService'

function App() {
  

  return (
    <div className="App">
      <JobTable jobs={[]} />
    </div>
  )
}

export default App
