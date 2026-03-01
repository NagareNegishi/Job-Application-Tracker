import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePatchJob } from "@/hooks/jobQuery";
import type { Contact } from "@/types/contact";
import type { JobPatchOperation } from "@/types/job";
import { useEffect, useState } from "react";


/**
 * ContactCardProps defines the props for the ContactCard component
 */
interface ContactCardProps {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
}

/**
 * ContactCard component displays individual contact information.
 * Edit and delete actions are provided by ContactList
 */
export function ContactCard({ contact, onEdit, onDelete }: ContactCardProps) {
  return (
    <div className="border rounded-lg p-3 space-y-1">
      <p className="font-medium">{contact.name}</p>
      {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
      {contact.email && <p className="text-sm">{contact.email}</p>}
      {contact.phone && <p className="text-sm">{contact.phone}</p>}
      {contact.notes && <p className="text-sm text-muted-foreground">{contact.notes}</p>}
    </div>
  )
}


interface ContactListProps {
  contacts: Contact[]
  jobId: number
}



export function ContactList({ contacts, jobId }: ContactListProps) {

  const [open, setOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | undefined>(undefined)
  const { mutate: patchJob, isPending } = usePatchJob()
  // Handlers for add, open dialog with empty form
  function handleAdd() {
    setSelectedContact(undefined)
    setOpen(true)
  }

  // Handlers for edit, open dialog with selected contact data
  function handleEdit(contact: Contact) {
    setSelectedContact(contact)
    setOpen(true)
  }

  // Called by dialog on save
  function handleEditSubmit(updated: Contact) {
    const index = contacts.indexOf(selectedContact!)
    const operations: JobPatchOperation[] = [
      { op: "replace", path: `/contacts/${index}`, value: updated }
    ]

    patchJob(
      { id: jobId, operations },
      { onSuccess: () => setOpen(false) }
    )
  }

  // Called by dialog on save
  function handleAddSubmit(contact: Contact) {
    const operations: JobPatchOperation[] = [
      { op: "add", path: "/contacts/-", value: contact }
    ]

    patchJob(
      { id: jobId, operations },
      { onSuccess: () => setOpen(false) }
    )
  }


  // Handlers for delete
  function handleDelete(contact: Contact) {
    const index = contacts.indexOf(contact)
    const operations: JobPatchOperation[] = [
      { op: "remove", path: `/contacts/${index}` }
    ]

    patchJob(
      { id: jobId, operations },
    )
  }



  return (
    <div className="space-y-3">

      {/* Dialog for adding/editing contacts */ }
      <ContactDialog
        open={open}
        onOpenChange={setOpen}
        contact={selectedContact}
        onSubmit={selectedContact ? handleEditSubmit : handleAddSubmit}
      />

      {/* Header with Add button */ }
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Contacts</span>
        <Button size="sm" onClick={handleAdd}>Add Contact</Button>
      </div>

      { contacts.length === 0
        ? <p className="text-sm text-muted-foreground">No contacts.</p>
        : <div className="grid grid-cols-2 gap-3">
          {/* List of contacts */}
          {contacts.map((c, i) =>
            <ContactCard
              key={i}
              contact={c}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      }
    </div>
  )
}




// FormState represents the internal state of the contact editing form.
interface ContactFormState {
  name: string
  email: string
  role: string
  phone: string
  notes: string
}

// Converts a Contact object to the ContactFormState shape
function toContactFormState(contact: Contact): ContactFormState {
  return {
    name: contact.name,
    email: contact.email ?? "",
    role: contact.role ?? "",
    phone: contact.phone ?? "",
    notes: contact.notes ?? "",
  }
}






interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact  // undefined = add mode, defined = edit mode
  onSubmit: (contact: Contact) => void
}



export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSubmit }: ContactDialogProps) {
  
  const emptyContact: ContactFormState = { name: "", email: "", role: "", phone: "", notes: "" }
  const [form, setForm] = useState<ContactFormState>(emptyContact)

  // Reset form when dialog opens with fresh contact data
  useEffect(() => {
    if (open) setForm(contact ? toContactFormState(contact) : emptyContact)
  }, [contact, open])


  // Helper function to update form state for a specific field
  function setField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Handle form submission for both add and edit
  function handleSubmit() {
    onSubmit({
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone,
      notes: form.notes,
    })
    onOpenChange(false)
  }

  
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >

      <DialogContent className="sm:max-w-sm">
        {/* Header for add vs edit mode */}
        <DialogHeader>
          <DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          <DialogDescription>
            {contact ? "Update contact details." : "Add a new contact to this job."}
          </DialogDescription>
        </DialogHeader>

          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            value={form.name}
            onChange={e => setField("name", e.target.value)}
          />

          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            value={form.email}
            onChange={e => setField("email", e.target.value)}
          />

          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            name="role"
            value={form.role}
            onChange={e => setField("role", e.target.value)}
          />

          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={e => setField("phone", e.target.value)}
          />

          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            name="notes"
            value={form.notes}
            onChange={e => setField("notes", e.target.value)}
          />

        <DialogFooter>
          
          {/* Cancel just closes the dialog without saving */ }
          <DialogClose asChild>
            <Button
              variant="outline"
            >
              Cancel
            </Button>
          </DialogClose>
          
          {/* Save triggers form submission */ }
          <Button
            type="submit"
            onClick={handleSubmit}
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  )
}

