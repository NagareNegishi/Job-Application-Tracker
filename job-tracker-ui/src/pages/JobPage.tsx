import NavBar from '@/components/NavBar'
import { JobTable } from '@/components/JobTable'
import { KanbanBoard } from '@/components/KanbanBoard'
import { Button } from '@/components/ui/button'
import { Kanban, LayoutList } from 'lucide-react'
import { useState } from 'react'

type ViewMode = 'table' | 'kanban'

function JobPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-card rounded-lg shadow-sm p-6">
          <JobTable />
        </div>
      </div>
    </div>
  )
}

export default JobPage