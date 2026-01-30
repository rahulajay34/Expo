/**
 * Database types generated for Supabase
 * These match the schema defined in supabase/migrations/
 */

// Import shared types to avoid duplication
import type { ContentMode } from './content';
export type { ContentMode };

export type UserRole = 'admin' | 'user';

export type GenerationStatus = 
  | 'queued' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'waiting_approval';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          credits?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      generations: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          subtopics: string;
          mode: ContentMode;
          status: GenerationStatus;
          current_step: number;
          transcript: string | null;
          final_content: string | null;
          assignment_data: Json | null;
          gap_analysis: Json | null;
          course_context: Json | null;
          error_message: string | null;
          estimated_cost: number;
          locked_by: string | null;
          // Production v2.0 enhancements
          progress_percent: number;
          progress_message: string;
          partial_content: string | null;
          current_agent: string | null;
          started_at: string | null;
          completed_at: string | null;
          resume_token: string | null;
          last_checkpoint_step: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          subtopics: string;
          mode: ContentMode;
          status?: GenerationStatus;
          current_step?: number;
          transcript?: string | null;
          final_content?: string | null;
          assignment_data?: Json | null;
          gap_analysis?: Json | null;
          course_context?: Json | null;
          error_message?: string | null;
          estimated_cost?: number;
          locked_by?: string | null;
          // Production v2.0 enhancements
          progress_percent?: number;
          progress_message?: string;
          partial_content?: string | null;
          current_agent?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          resume_token?: string | null;
          last_checkpoint_step?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          subtopics?: string;
          mode?: ContentMode;
          status?: GenerationStatus;
          current_step?: number;
          transcript?: string | null;
          final_content?: string | null;
          assignment_data?: Json | null;
          gap_analysis?: Json | null;
          course_context?: Json | null;
          error_message?: string | null;
          estimated_cost?: number;
          locked_by?: string | null;
          // Production v2.0 enhancements
          progress_percent?: number;
          progress_message?: string;
          partial_content?: string | null;
          current_agent?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          resume_token?: string | null;
          last_checkpoint_step?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      generation_logs: {
        Row: {
          id: string;
          generation_id: string;
          agent_name: string;
          message: string;
          log_type: 'info' | 'success' | 'warning' | 'error' | 'step';
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          agent_name: string;
          message: string;
          log_type?: 'info' | 'success' | 'warning' | 'error' | 'step';
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          generation_id?: string;
          agent_name?: string;
          message?: string;
          log_type?: 'info' | 'success' | 'warning' | 'error' | 'step';
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "generation_logs_generation_id_fkey";
            columns: ["generation_id"];
            referencedRelation: "generations";
            referencedColumns: ["id"];
          }
        ];
      };
      checkpoints: {
        Row: {
          id: string;
          generation_id: string;
          step_name: string;
          step_number: number;
          content_snapshot: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          step_name: string;
          step_number: number;
          content_snapshot: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          generation_id?: string;
          step_name?: string;
          step_number?: number;
          content_snapshot?: string;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "checkpoints_generation_id_fkey";
            columns: ["generation_id"];
            referencedRelation: "generations";
            referencedColumns: ["id"];
          }
        ];
      };
      // Production v2.0 new tables
      generation_metrics: {
        Row: {
          id: string;
          generation_id: string;
          stage_name: string;
          stage_weight: number;
          started_at: string;
          completed_at: string | null;
          duration_ms: number | null;
          token_count: number | null;
          cost_estimate: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          stage_name: string;
          stage_weight: number;
          started_at: string;
          completed_at?: string | null;
          duration_ms?: number | null;
          token_count?: number | null;
          cost_estimate?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          generation_id?: string;
          stage_name?: string;
          stage_weight?: number;
          started_at?: string;
          completed_at?: string | null;
          duration_ms?: number | null;
          token_count?: number | null;
          cost_estimate?: number | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "generation_metrics_generation_id_fkey";
            columns: ["generation_id"];
            referencedRelation: "generations";
            referencedColumns: ["id"];
          }
        ];
      };
      historical_timing: {
        Row: {
          id: string;
          stage_name: string;
          mode: ContentMode;
          avg_duration_ms: number;
          min_duration_ms: number | null;
          max_duration_ms: number | null;
          sample_count: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          stage_name: string;
          mode: ContentMode;
          avg_duration_ms: number;
          min_duration_ms?: number | null;
          max_duration_ms?: number | null;
          sample_count?: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          stage_name?: string;
          mode?: ContentMode;
          avg_duration_ms?: number;
          min_duration_ms?: number | null;
          max_duration_ms?: number | null;
          sample_count?: number;
          last_updated?: string;
        };
        Relationships: [];
      };
      feedback_scores: {
        Row: {
          id: string;
          generation_id: string;
          agent_name: string;
          iteration: number;
          overall_score: number;
          completeness_score: number | null;
          accuracy_score: number | null;
          pedagogy_score: number | null;
          formatting_score: number | null;
          feedback_text: string | null;
          suggestions: Json | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          generation_id: string;
          agent_name: string;
          iteration: number;
          overall_score: number;
          completeness_score?: number | null;
          accuracy_score?: number | null;
          pedagogy_score?: number | null;
          formatting_score?: number | null;
          feedback_text?: string | null;
          suggestions?: Json | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          generation_id?: string;
          agent_name?: string;
          iteration?: number;
          overall_score?: number;
          completeness_score?: number | null;
          accuracy_score?: number | null;
          pedagogy_score?: number | null;
          formatting_score?: number | null;
          feedback_text?: string | null;
          suggestions?: Json | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_scores_generation_id_fkey";
            columns: ["generation_id"];
            referencedRelation: "generations";
            referencedColumns: ["id"];
          }
        ];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          default_mode: ContentMode;
          auto_save: boolean;
          show_preview: boolean;
          email_notifications: boolean;
          theme: string;
          default_course_context: Json | null;
          custom_templates: Json | null;
          generation_settings: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          default_mode?: ContentMode;
          auto_save?: boolean;
          show_preview?: boolean;
          email_notifications?: boolean;
          theme?: string;
          default_course_context?: Json | null;
          custom_templates?: Json | null;
          generation_settings?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          default_mode?: ContentMode;
          auto_save?: boolean;
          show_preview?: boolean;
          email_notifications?: boolean;
          theme?: string;
          default_course_context?: Json | null;
          custom_templates?: Json | null;
          generation_settings?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      stage_weights: {
        Row: {
          id: string;
          stage_name: string;
          stage_order: number;
          weight_percent: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          stage_name: string;
          stage_order: number;
          weight_percent: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          stage_name?: string;
          stage_order?: number;
          weight_percent?: number;
          description?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      calculate_progress: {
        Args: {
          p_current_stage: string;
          p_sub_progress: number;
        };
        Returns: number;
      };
    };
    Enums: {
      user_role: UserRole;
      generation_status: GenerationStatus;
      content_mode: ContentMode;
      log_type: 'info' | 'success' | 'warning' | 'error' | 'step';
    };
  };
}

// Helper types for easier access
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Generation = Database['public']['Tables']['generations']['Row'];
export type GenerationInsert = Database['public']['Tables']['generations']['Insert'];
export type GenerationUpdate = Database['public']['Tables']['generations']['Update'];

export type GenerationLog = Database['public']['Tables']['generation_logs']['Row'];
export type GenerationLogInsert = Database['public']['Tables']['generation_logs']['Insert'];

export type Checkpoint = Database['public']['Tables']['checkpoints']['Row'];
export type CheckpointInsert = Database['public']['Tables']['checkpoints']['Insert'];

// Production v2.0 new types
export type GenerationMetric = Database['public']['Tables']['generation_metrics']['Row'];
export type GenerationMetricInsert = Database['public']['Tables']['generation_metrics']['Insert'];

export type HistoricalTimingData = Database['public']['Tables']['historical_timing']['Row'];
export type HistoricalTimingInsert = Database['public']['Tables']['historical_timing']['Insert'];

export type FeedbackScore = Database['public']['Tables']['feedback_scores']['Row'];
export type FeedbackScoreInsert = Database['public']['Tables']['feedback_scores']['Insert'];

export type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];
export type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert'];
export type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update'];

export type StageWeight = Database['public']['Tables']['stage_weights']['Row'];
export type StageWeightInsert = Database['public']['Tables']['stage_weights']['Insert'];

// Extended types with relations
export type GenerationWithLogs = Generation & {
  generation_logs: GenerationLog[];
};

export type GenerationWithProfile = Generation & {
  profiles: Pick<Profile, 'email' | 'role'>;
};

export type GenerationWithMetrics = Generation & {
  generation_metrics: GenerationMetric[];
  feedback_scores: FeedbackScore[];
};
