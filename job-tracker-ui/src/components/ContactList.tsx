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
import { Mail, Pencil, Phone, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";


/**
 * ContactCardProps defines the props for the ContactCard component
 */
interface ContactCardProps {
  contact: Contact
  onEdit: (contact: Contact) => void
  onDelete: (contact: Contact) => void
  isPending: boolean
}

/**
 * ContactCard component displays individual contact information.
 * Edit and delete actions are provided by ContactList
 */
export function ContactCard({ contact, onEdit, onDelete, isPending }: ContactCardProps) {
  return (
    <div className="border rounded-lg p-3 space-y-1 w-full">
      {/* Top row: name + actions */}
      <div className="flex items-center justify-between">
        <p className="font-medium">{contact.name}</p>
        <div className="flex gap-1">
          {/* Edit action */ }
          <Button variant="ghost" size="icon"
            onClick={() => onEdit(contact)}
            disabled={isPending}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Delete action */}
          <Button variant="ghost" size="icon"
            onClick={() => onDelete(contact)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Optional fields */}
      {contact.role && <p className="text-sm text-muted-foreground">{contact.role}</p>}
      {contact.email && (
        <div className="flex items-center gap-1.5 text-sm">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{contact.email}</span>
        </div>
      )}
      {contact.phone && (
        <div className="flex items-center gap-1.5 text-sm">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{contact.phone}</span>
        </div>
      )}
      {contact.notes && <p className="text-sm text-muted-foreground">{contact.notes}</p>}
    </div>
  )
}


/**
 * ContactListProps defines the props for the ContactList component
 */
interface ContactListProps {
  contacts: Contact[]
  jobId: number
}


/**
 * ContactList component displays a list of contacts for a job
 */
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
        isPending={isPending}
      />

      {/* Header with Add button */ }
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Contacts</span>
        <Button size="sm" onClick={handleAdd}>Add Contact</Button>
      </div>

      { contacts.length === 0
        ? <p className="text-sm text-muted-foreground">No contacts.</p>
        // TODO: flex-col? or grid-cols-2
        : <div className="grid grid-cols-4 gap-3">
          {/* List of contacts */}
          {contacts.map((c, i) =>
            <ContactCard
              key={i}
              contact={c}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isPending={isPending}
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

// ContactFormErrors represents validation errors for the contact form fields.
interface ContactFormErrors {
  name?: string
  email?: string
  phone?: string
}

// ContactDialogProps defines the props for the ContactDialog component
interface ContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact  // undefined = add mode, defined = edit mode
  onSubmit: (contact: Contact) => void
  isPending: boolean
}


/**
 * ContactDialog component provides a form for adding/editing a contact.
 */
export function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSubmit,
  isPending
}: ContactDialogProps) {
  
  const emptyContact: ContactFormState = { name: "", email: "", role: "", phone: "", notes: "" }
  const [form, setForm] = useState<ContactFormState>(emptyContact)
  const [errors, setErrors] = useState<ContactFormErrors>({})

  // Reset form when dialog opens with fresh contact data
  useEffect(() => {
    if (open) {
      setForm(contact ? toContactFormState(contact) : emptyContact)
      setErrors({})
    }
  }, [contact, open])

  // Helper function to update form state for a specific field
  function setField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Handle form submission for both add and edit
  function handleSubmit() {
    if (!validate()) return
    onSubmit({
      name: form.name,
      email: form.email || undefined,
      role: form.role || undefined,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
    })
    onOpenChange(false)
  }

  // Simple validation logic for required fields and basic formats
  function validate(): boolean {
    const newErrors: ContactFormErrors = {}
    if (!form.name.trim()) newErrors.name = "Name is required"
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      newErrors.email = "Invalid email address"
    if (form.phone && !/^\+?[\d\s\-().]{7,}$/.test(form.phone))
      newErrors.phone = "Invalid phone number"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}

          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            name="role"
            value={form.role}
            onChange={e => setField("role", e.target.value)}
          />

          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            value={form.email}
            onChange={e => setField("email", e.target.value)}
          />
          { errors.email && <p className="text-sm text-destructive">{errors.email}</p> }

          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={form.phone}
            onChange={e => setField("phone", e.target.value)}
          />
          {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}

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
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}