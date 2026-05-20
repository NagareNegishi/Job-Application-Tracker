import NavBar from "@/components/NavBar"
import { useAdminUsers, useUpdateAiAccess } from "@/hooks/adminQuery"

export default function AdminPage() {
  const { data: users, isLoading, isError } = useAdminUsers()
  const { mutate: updateAiAccess } = useUpdateAiAccess()

  if (isLoading) return <div className="min-h-screen bg-muted" />
  if (isError) return <div className="min-h-screen bg-muted flex items-center justify-center text-muted-foreground">Failed to load users.</div>

  return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold mb-6">User Management</h1>
        {/* table goes here */}
      </main>
    </div>
  )
}
