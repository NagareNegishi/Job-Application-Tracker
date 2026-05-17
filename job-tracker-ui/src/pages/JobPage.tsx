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
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
              Table View
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              onClick={() => setViewMode('kanban')}
            >
              <Kanban className="h-4 w-4" />
              Kanban View
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm p-6">
          {viewMode === 'table' ? <JobTable /> : <KanbanBoard />}
        </div>
      </div>
    </div>
  )
}

export default JobPage