import type { Contact } from "@/types/contact";
// import type { Job, JobPatchOperation } from "@/types/job"
// import { usePatchJob } from "@/hooks/jobQuery"
// import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";


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