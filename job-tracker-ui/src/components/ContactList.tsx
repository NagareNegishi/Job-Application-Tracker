import type { Contact } from "@/types/contact";
// import type { Job, JobPatchOperation } from "@/types/job"
// import { usePatchJob } from "@/hooks/jobQuery"
// import { useEffect, useState } from "react"


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


function handleDelete(contact: Contact) {
  // remove from array, PATCH
}

function handleEdit(contact: Contact) {
  // open edit form with that contact
}



export function ContactList({ contacts }: { contacts: Contact[] }) {





  if (contacts.length === 0) return <p className="text-sm text-muted-foreground">No contacts.</p>
  return (
    <div className="grid grid-cols-2 gap-3">
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