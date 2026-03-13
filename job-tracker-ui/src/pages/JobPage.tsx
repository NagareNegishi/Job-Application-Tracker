import { JobTable } from '@/components/JobTable'

function JobPage() {

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <p className="text-2xl font-bold mb-4">Job Tracker</p>
          <JobTable />
        </div>
      </div>
    </div>
  )
}

export default JobPage