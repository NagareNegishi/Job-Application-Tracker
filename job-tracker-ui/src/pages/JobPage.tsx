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
        {/* View toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex gap-1 bg-card rounded-md p-1 shadow-sm">
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('kanban')}
              aria-label="Kanban view"
            >
              <Kanban className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6">
          <JobTable />
        </div>
      </div>
    </div>
  )
}

export default JobPage