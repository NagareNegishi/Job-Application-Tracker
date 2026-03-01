import type { Contact } from "@/types/contact";
// import type { Job, JobPatchOperation } from "@/types/job"
// import { usePatchJob } from "@/hooks/jobQuery"
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






export function ContactList({ contacts }: { contacts: Contact[] }) {

  const [open, setOpen] = useState(false)

  function handleAdd() {
    // open empty form
  }

  function handleDelete(contact: Contact) {
    // remove from array, PATCH
  }

  function handleEdit(contact: Contact) {
    // open edit form with that contact
  }

  return (
    <div className="space-y-3">

      {/* Dialog for adding/editing contacts */ }
      <ContactDialog
        open={true}
        onOpenChange={setOpen}
        onSubmit={(contact) => {}}
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
  
  const [form, setForm] = useState<ContactFormState>(
    contact ? toContactFormState(contact) : {
      name: "",
      email: "",
      role: "",
      phone: "",
      notes: "",
    }
  )

  // Reset form when dialog opens with fresh contact data
  useEffect(() => {
    if (open) setForm(contact ? toContactFormState(contact) : {
      name: "",
      email: "",
      role: "",
      phone: "",
      notes: "",
    })
  }, [contact, open])


  // Helper function to update form state for a specific field
  function setField<K extends keyof ContactFormState>(key: K, value: ContactFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
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
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit">Save changes</Button>
        </DialogFooter>
      </DialogContent>

    </Dialog>
  )
}

