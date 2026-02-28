import type { Contact } from "@/types/contact";

export function ContactCard({ contact }: { contact: Contact }) {
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
  if (contacts.length === 0) return <p className="text-sm text-muted-foreground">No contacts.</p>
  return (
    <div className="grid grid-cols-2 gap-3">
      {contacts.map((c, i) => <ContactCard key={i} contact={c} />)}
    </div>
  )
}