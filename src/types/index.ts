export interface FamilyMember {
  id: string;
  name: string;
  avatar: string;
  photo_url?: string;
  points: number;
  is_parent: boolean;
  gender?: string | null;
  birth_date?: string | null;
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

export type Language = 'en' | 'pt' | 'nl';

export interface SinterklaasDates {
  intocht?: string;        // YYYY-MM-DD, national arrival
  intocht_local?: string;  // YYYY-MM-DD, arrival in our town
  pakjesavond?: string;    // YYYY-MM-DD
  shoe_nights?: string[];  // YYYY-MM-DD[]
  journaal_start?: string; // YYYY-MM-DD, first Sinterklaasjournaal
}

export interface SeasonDates {
  sinterklaas?: SinterklaasDates;
}

export interface AppSettings {
  id: string;
  title: string;
  theme: 'light' | 'dark' | 'kids';
  email_summaries: boolean;
  /** Board tab layout; anything but 'timeline' renders the home layout. */
  board_layout?: 'timeline' | 'home';
  /** Language of season strings only; the rest of the app stays English. */
  language?: Language;
  /** Manual season override ('sinterklaas', 'christmas', 'none'); null means auto by date. */
  active_season?: string | null;
  season_dates?: SeasonDates;
  parent_pin?: string;
  created_at?: string;
  updated_at?: string;
}