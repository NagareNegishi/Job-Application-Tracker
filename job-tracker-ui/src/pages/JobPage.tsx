import NavBar from '@/components/NavBar'
import { JobTable } from '@/components/JobTable'
import { KanbanBoard } from '@/components/KanbanBoard'
import { IconToggle } from '@/components/IconToggle'
import { Menu, Columns3 } from 'lucide-react'
import { useState } from 'react'

type ViewMode = 'table' | 'kanban'

const VIEW_OPTIONS = [
  { value: 'table' as const,  icon: <Menu className="h-4 w-4" /> },
  { value: 'kanban' as const, icon: <Columns3 className="h-4 w-4" /> },
]

function JobPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  return (
    <div className="h-screen bg-muted flex flex-col overflow-hidden">
      <NavBar />
      <div className="max-w-5xl mx-auto w-full px-4 py-2 flex justify-end">
        <IconToggle options={VIEW_OPTIONS} value={viewMode} onChange={setViewMode} />
      </div>

      <div className={`${viewMode === 'kanban' ? 'max-w-7xl px-1 sm:px-2' : 'max-w-5xl px-2 sm:px-4'} mx-auto w-full pb-1 flex-1 flex flex-col min-h-0 min-w-0`}>
        <div className={`bg-card rounded-lg shadow-sm ${viewMode === 'kanban' ? 'px-2 sm:px-4 pt-4 pb-0' : 'px-2 sm:px-4 pt-3 pb-0'} flex-1 flex flex-col min-h-0 min-w-0`}>
          {viewMode === 'table' ? <JobTable /> : <KanbanBoard />}
        </div>
      </div>
    </div>
  )
}

export default JobPage