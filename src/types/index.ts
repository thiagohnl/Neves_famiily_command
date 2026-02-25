export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  photo_url?: string;
  points: number;
  is_parent: boolean;
  created_at?: string;
}

export interface Chore {
  id: string;
  name: string;
  assigned_to: string;
  assigned_member_name?: string;
  points: number;
  is_completed: boolean;
  recurring_days?: string[];
  emoji?: string;
  scheduled_time?: string;
  end_time?: string;
  created_at?: string;
  completed_at?: string;
  description?: string;
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  emoji: string;
  start_time?: string;
  end_time?: string;
  recurring_days?: string[];
  assigned_member_ids?: string[];
  color?: string;
}

export interface PlannedActivity {
    id: string;
    activity_id: string;
    date: string;
    member_id: string;
    activity: Activity;
}

export type ChorePoints = 5 | 10 | 20;

export interface AppSettings {
  id: string;
  title: string;
  theme: 'light' | 'dark' | 'kids';
  email_summaries: boolean;
  parent_pin?: string;
  created_at?: string;
  updated_at?: string;
}