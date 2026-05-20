import NavBar from "@/components/NavBar"
import { useAdminUsers, useUpdateAiAccess } from "@/hooks/adminQuery"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"

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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>AI Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map(user => (
              <TableRow key={user.id}>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.isAdmin ? "Admin" : "User"}</TableCell>
                <TableCell>
                  {/* Admins always hold AiUser — disable toggle; only non-admins can be toggled */}
                  <Checkbox
                    checked={user.isAiUser}
                    disabled={user.isAdmin}
                    onCheckedChange={(checked) =>
                      updateAiAccess({ userId: user.id, enabled: !!checked })
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>
    </div>
  )
}
