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
    <div className="h-screen bg-muted flex flex-col overflow-hidden">
      <NavBar />
      {/* View toggle */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-8 pb-4 flex justify-end">
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

      <div className={`${viewMode === 'kanban' ? 'max-w-7xl px-2' : 'max-w-5xl px-6'} mx-auto pb-1 flex-1 flex flex-col min-h-0`}>
        <div className={`bg-card rounded-lg shadow-sm ${viewMode === 'kanban' ? 'px-4 py-4' : 'px-6 pt-6 pb-0'} flex-1 flex flex-col min-h-0`}>
          {viewMode === 'table' ? <JobTable /> : <KanbanBoard />}
        </div>
      </div>
    </div>
  )
}

export default JobPage