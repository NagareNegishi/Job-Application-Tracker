export interface Contact {
    name: string;
    email?: string;
    role?: string;
    phone?: string;
    notes?: string;
}

export interface Correspondence {
    date: string; // ISO date string
    note: string;
}
