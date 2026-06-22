export interface Workout {
  name: string;
  description: string;
  duration: number | string;
  creator: string;
  date: string;
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
}

export type SortField = 'name' | 'description' | 'duration' | 'creator' | 'date';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}
