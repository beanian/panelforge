export interface JournalEntry {
  id: string;
  title: string;
  body: string;
  panelSectionId: string | null;
  componentInstanceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryWithRelations extends JournalEntry {
  panelSection: { id: string; name: string } | null;
  componentInstance: { id: string; name: string } | null;
}
