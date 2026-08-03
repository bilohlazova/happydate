export interface EventSummary {
  id: string;
  title: string;
  date: Date;
  category?: string;
  notes?: string;
}

export interface EnsureBirthdayOccurrenceInput {
  personId: string;
  personName: string;
  occurrenceDate: string;
}
