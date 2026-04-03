// ─── Users / Auth ─────────────────────────────────────────────────────────────

export interface CoachProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
}

// ─── Athletes ─────────────────────────────────────────────────────────────────

export interface Athlete {
  id: string;
  coach_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AthleteProfile {
  id: string;
  athlete_id: string;
  dob: string | null;
  weight_kg: number | null;
  timezone: string | null;
  goals: string | null;
  notes: string | null;
  sports: string[];
  updated_at: string;
}

export interface Race {
  id: string;
  athlete_id: string;
  name: string;
  event_date: string;
  distance: string | null;
  location: string | null;
  priority: 'A' | 'B' | 'C';
  created_at: string;
}

export interface AthleteWithProfile extends Athlete {
  profile: AthleteProfile | null;
  next_race: Race | null;
  compliance_7d: number;
  active_flags: number;
}

export interface UpdateAthleteProfile {
  dob?: string | null;
  weight_kg?: number | null;
  timezone?: string | null;
  goals?: string | null;
  notes?: string | null;
  sports?: string[];
}

// ─── Training Plans ────────────────────────────────────────────────────────────

export interface TrainingPlan {
  id: string;
  athlete_id: string;
  coach_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTrainingPlan {
  athlete_id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export type SessionType = 'swim' | 'bike' | 'run' | 'strength' | 'rest' | 'other';
export type SessionStatus = 'scheduled' | 'completed' | 'missed' | 'skipped';

export interface Session {
  id: string;
  plan_id: string;
  athlete_id: string;
  coach_id: string;
  date: string;
  type: SessionType;
  title: string;
  description: string | null;
  duration_min: number | null;
  tss: number | null;
  status: SessionStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface WorkoutBlock {
  id: string;
  session_id: string;
  position: number;
  type: 'warmup' | 'interval' | 'steady' | 'cooldown' | 'rest' | 'note';
  description: string;
  duration_min: number | null;
  distance_m: number | null;
  intensity: string | null;
  reps: number | null;
  created_at: string;
}

export interface SessionWithBlocks extends Session {
  blocks: WorkoutBlock[];
}

export interface CreateSession {
  plan_id: string;
  athlete_id: string;
  date: string;
  type: SessionType;
  title: string;
  description?: string | null;
  duration_min?: number | null;
  tss?: number | null;
  status?: SessionStatus;
  position?: number;
}

// ─── Workout Logs ──────────────────────────────────────────────────────────────

export interface WorkoutLog {
  id: string;
  athlete_id: string;
  session_id: string | null;
  date: string;
  type: SessionType;
  session_name: string | null;
  duration_min: number | null;
  distance_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  avg_power: number | null;
  normalized_power: number | null;
  tss: number | null;
  rpe: number | null;
  status: SessionStatus;
  notes: string | null;
  strava_activity_id: string | null;
  source: 'manual' | 'strava' | 'garmin';
  created_at: string;
}

// ─── Compliance ────────────────────────────────────────────────────────────────

export interface ComplianceWeek {
  week_start: string;
  label: string;
  scheduled: number;
  completed: number;
  pct: number;
}

export interface ComplianceData {
  athlete_id: string;
  last_7d_pct: number;
  last_30d_pct: number;
  all_time_pct: number;
  weeks: ComplianceWeek[];
}

// ─── Insights / Flags ─────────────────────────────────────────────────────────

export type InsightSeverity = 'info' | 'warning' | 'critical';
export type InsightType = 'compliance' | 'missed_sessions' | 'fatigue' | 'weight_trend' | 'overtraining' | 'race_approaching';

export interface Insight {
  id: string;
  athlete_id: string;
  coach_id: string;
  type: InsightType;
  severity: InsightSeverity;
  message: string;
  coach_note: string | null;
  dismissed: boolean;
  created_at: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface CreateMessage {
  recipient_id: string;
  body: string;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface StravaIntegration {
  id: string;
  athlete_id: string;
  strava_athlete_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  strava: {
    connected: boolean;
    athlete_name: string | null;
    last_sync: string | null;
  };
}

// ─── Today ────────────────────────────────────────────────────────────────────

export interface TodayAthlete {
  athlete: AthleteWithProfile;
  todays_session: Session | null;
  recent_log: WorkoutLog | null;
}

export interface TodayResponse {
  date: string;
  athletes: TodayAthlete[];
  open_flags: number;
  unread_messages: number;
}

// ─── Workout Templates ────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  coach_id: string;
  name: string;
  description: string | null;
  type: SessionType;
  duration_min: number | null;
  tss: number | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateBlock {
  id: string;
  template_id: string;
  position: number;
  type: 'warmup' | 'interval' | 'steady' | 'cooldown' | 'rest' | 'note';
  description: string;
  duration_min: number | null;
  distance_m: number | null;
  intensity: string | null;
  reps: number | null;
  created_at: string;
}

export interface WorkoutTemplateWithBlocks extends WorkoutTemplate {
  blocks: TemplateBlock[];
}

export interface CreateWorkoutTemplate {
  name: string;
  description?: string | null;
  type: SessionType;
  duration_min?: number | null;
  tss?: number | null;
  is_shared?: boolean;
  blocks: Omit<TemplateBlock, 'id' | 'template_id' | 'position' | 'created_at'>[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
