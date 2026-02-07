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
  | 'drafting'
  | 'critiquing'
  | 'refining'
  | 'formatting'
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
          spent_credits: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: UserRole;
          credits?: number;
          spent_credits?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: UserRole;
          credits?: number;
          spent_credits?: number;
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
          instructor_quality: Json | null;
          course_context: Json | null;
          error_message: string | null;
          estimated_cost: number;
          cost_details: Json | null;
          locked_by: string | null;
          meta_analysis_completed: boolean;
          meta_analysis_timestamp: string | null;
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
          instructor_quality?: Json | null;
          course_context?: Json | null;
          error_message?: string | null;
          estimated_cost?: number;
          cost_details?: Json | null;
          locked_by?: string | null;
          meta_analysis_completed?: boolean;
          meta_analysis_timestamp?: string | null;
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
          instructor_quality?: Json | null;
          course_context?: Json | null;
          error_message?: string | null;
          estimated_cost?: number;
          cost_details?: Json | null;
          locked_by?: string | null;
          meta_analysis_completed?: boolean;
          meta_analysis_timestamp?: string | null;
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
    };
    Views: {};
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
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

// Extended types with relations
export type GenerationWithLogs = Generation & {
  generation_logs: GenerationLog[];
};

export type GenerationWithProfile = Generation & {
  profiles: Pick<Profile, 'email' | 'role'>;
};
