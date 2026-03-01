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
import { useState } from "react";


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



  if (contacts.length === 0) return <p className="text-sm text-muted-foreground">No contacts.</p>
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Label with button to add contact */}
      <Label className="col-span-2 flex items-center justify-between">
        Contacts
        <Button
          size="sm"
          onClick={handleAdd}
        >
          Add Contact
        </Button>

        {/* temp dialog here as visible */}
        <ContactDialog
          open={true}
          onOpenChange={setOpen}
          onSubmit={(contact) => {}}
        />
        


      </Label>

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
  )
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
  onSubmit
  }: ContactDialogProps) {
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
            <Input id="name" name="name" defaultValue="Contact Name" />

            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" defaultValue="@email.com" />

            <Label htmlFor="role">Role</Label>
            <Input id="role" name="role" defaultValue="Recruiter" />

            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue="123-456-7890" />

            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" name="notes" defaultValue="Met at career fair." />

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

