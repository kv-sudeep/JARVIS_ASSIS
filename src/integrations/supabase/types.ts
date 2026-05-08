export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action_description: string
          actor: Database["public"]["Enums"]["actor_type"]
          affected_resource: string | null
          after_state: Json | null
          before_state: Json | null
          event_type: string
          ip_address: unknown
          log_id: string
          notes: string | null
          reversed: boolean
          reversed_at: string | null
          reversible: boolean
          session_id: string | null
          severity: Database["public"]["Enums"]["audit_severity"]
          timestamp: string
        }
        Insert: {
          action_description: string
          actor?: Database["public"]["Enums"]["actor_type"]
          affected_resource?: string | null
          after_state?: Json | null
          before_state?: Json | null
          event_type: string
          ip_address?: unknown
          log_id?: string
          notes?: string | null
          reversed?: boolean
          reversed_at?: string | null
          reversible?: boolean
          session_id?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          timestamp?: string
        }
        Update: {
          action_description?: string
          actor?: Database["public"]["Enums"]["actor_type"]
          affected_resource?: string | null
          after_state?: Json | null
          before_state?: Json | null
          event_type?: string
          ip_address?: unknown
          log_id?: string
          notes?: string | null
          reversed?: boolean
          reversed_at?: string | null
          reversible?: boolean
          session_id?: string | null
          severity?: Database["public"]["Enums"]["audit_severity"]
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      auth_attempts: {
        Row: {
          alert_sent: boolean
          attempt_id: string
          attempt_number_in_sequence: number
          attempt_type: Database["public"]["Enums"]["auth_method"]
          browser_agent: string | null
          confidence_score: number | null
          device_fingerprint: string | null
          failure_reason: string | null
          input_hash: string | null
          ip_address: unknown
          location_data: Json | null
          lockdown_triggered: boolean
          mac_address: string | null
          microphone_audio_url: string | null
          notes: string | null
          os_fingerprint: string | null
          result: Database["public"]["Enums"]["auth_result"]
          screen_recording_url: string | null
          screenshot_captured: boolean
          threat_level: Database["public"]["Enums"]["threat_level"] | null
          timestamp: string
          webcam_snapshot_url: string | null
        }
        Insert: {
          alert_sent?: boolean
          attempt_id?: string
          attempt_number_in_sequence?: number
          attempt_type: Database["public"]["Enums"]["auth_method"]
          browser_agent?: string | null
          confidence_score?: number | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          input_hash?: string | null
          ip_address?: unknown
          location_data?: Json | null
          lockdown_triggered?: boolean
          mac_address?: string | null
          microphone_audio_url?: string | null
          notes?: string | null
          os_fingerprint?: string | null
          result: Database["public"]["Enums"]["auth_result"]
          screen_recording_url?: string | null
          screenshot_captured?: boolean
          threat_level?: Database["public"]["Enums"]["threat_level"] | null
          timestamp?: string
          webcam_snapshot_url?: string | null
        }
        Update: {
          alert_sent?: boolean
          attempt_id?: string
          attempt_number_in_sequence?: number
          attempt_type?: Database["public"]["Enums"]["auth_method"]
          browser_agent?: string | null
          confidence_score?: number | null
          device_fingerprint?: string | null
          failure_reason?: string | null
          input_hash?: string | null
          ip_address?: unknown
          location_data?: Json | null
          lockdown_triggered?: boolean
          mac_address?: string | null
          microphone_audio_url?: string | null
          notes?: string | null
          os_fingerprint?: string | null
          result?: Database["public"]["Enums"]["auth_result"]
          screen_recording_url?: string | null
          screenshot_captured?: boolean
          threat_level?: Database["public"]["Enums"]["threat_level"] | null
          timestamp?: string
          webcam_snapshot_url?: string | null
        }
        Relationships: []
      }
      face_profiles: {
        Row: {
          access_level: string
          age_estimate: number | null
          allowed_days: Json | null
          allowed_hours_end: string | null
          allowed_hours_start: string | null
          confidence_threshold: number
          created_at: string
          encoding_hash: string | null
          expiry_date: string | null
          face_mask_tolerance: boolean
          glasses_tolerance: boolean
          is_active: boolean
          last_verified_at: string | null
          lighting_condition_baseline: string | null
          name: string
          notes: string | null
          owner_id: string | null
          person_type: string
          profile_id: string
          training_images_count: number
          updated_at: string
        }
        Insert: {
          access_level?: string
          age_estimate?: number | null
          allowed_days?: Json | null
          allowed_hours_end?: string | null
          allowed_hours_start?: string | null
          confidence_threshold?: number
          created_at?: string
          encoding_hash?: string | null
          expiry_date?: string | null
          face_mask_tolerance?: boolean
          glasses_tolerance?: boolean
          is_active?: boolean
          last_verified_at?: string | null
          lighting_condition_baseline?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          person_type?: string
          profile_id?: string
          training_images_count?: number
          updated_at?: string
        }
        Update: {
          access_level?: string
          age_estimate?: number | null
          allowed_days?: Json | null
          allowed_hours_end?: string | null
          allowed_hours_start?: string | null
          confidence_threshold?: number
          created_at?: string
          encoding_hash?: string | null
          expiry_date?: string | null
          face_mask_tolerance?: boolean
          glasses_tolerance?: boolean
          is_active?: boolean
          last_verified_at?: string | null
          lighting_condition_baseline?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          person_type?: string
          profile_id?: string
          training_images_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      hardware_fingerprints: {
        Row: {
          authorization_granted_at: string | null
          authorization_revoked_at: string | null
          bios_hash: string | null
          cpu_id_hash: string | null
          disk_serial_hash: string | null
          fingerprint_id: string
          first_seen_at: string
          gpu_id_hash: string | null
          hostname_hash: string | null
          is_authorized: boolean
          label: string | null
          last_seen_at: string
          mac_address_hash: string | null
          machine_hash: string
          motherboard_id_hash: string | null
          notes: string | null
          os_install_id_hash: string | null
          owner_approved: boolean
          ram_size: number | null
          times_seen_count: number
        }
        Insert: {
          authorization_granted_at?: string | null
          authorization_revoked_at?: string | null
          bios_hash?: string | null
          cpu_id_hash?: string | null
          disk_serial_hash?: string | null
          fingerprint_id?: string
          first_seen_at?: string
          gpu_id_hash?: string | null
          hostname_hash?: string | null
          is_authorized?: boolean
          label?: string | null
          last_seen_at?: string
          mac_address_hash?: string | null
          machine_hash: string
          motherboard_id_hash?: string | null
          notes?: string | null
          os_install_id_hash?: string | null
          owner_approved?: boolean
          ram_size?: number | null
          times_seen_count?: number
        }
        Update: {
          authorization_granted_at?: string | null
          authorization_revoked_at?: string | null
          bios_hash?: string | null
          cpu_id_hash?: string | null
          disk_serial_hash?: string | null
          fingerprint_id?: string
          first_seen_at?: string
          gpu_id_hash?: string | null
          hostname_hash?: string | null
          is_authorized?: boolean
          label?: string | null
          last_seen_at?: string
          mac_address_hash?: string | null
          machine_hash?: string
          motherboard_id_hash?: string | null
          notes?: string | null
          os_install_id_hash?: string | null
          owner_approved?: boolean
          ram_size?: number | null
          times_seen_count?: number
        }
        Relationships: []
      }
      intruder_events: {
        Row: {
          actions_taken: Json
          alert_sent_email: boolean
          alert_sent_sms: boolean
          alert_sent_whatsapp: boolean
          detected_at: string
          event_id: string
          face_match_score: number | null
          false_alarm: boolean
          ip_address: unknown
          location: Json | null
          mac_address: string | null
          microphone_audio_path: string | null
          notification_timestamps: Json
          owner_notes: string | null
          owner_reviewed: boolean
          pin_attempts: number
          resolved: boolean
          resolved_at: string | null
          screen_recording_path: string | null
          screen_snapshot_path: string | null
          threat_level: Database["public"]["Enums"]["threat_level"]
          trigger_type: string
          voice_match_score: number | null
          webcam_snapshot_path: string | null
        }
        Insert: {
          actions_taken?: Json
          alert_sent_email?: boolean
          alert_sent_sms?: boolean
          alert_sent_whatsapp?: boolean
          detected_at?: string
          event_id?: string
          face_match_score?: number | null
          false_alarm?: boolean
          ip_address?: unknown
          location?: Json | null
          mac_address?: string | null
          microphone_audio_path?: string | null
          notification_timestamps?: Json
          owner_notes?: string | null
          owner_reviewed?: boolean
          pin_attempts?: number
          resolved?: boolean
          resolved_at?: string | null
          screen_recording_path?: string | null
          screen_snapshot_path?: string | null
          threat_level?: Database["public"]["Enums"]["threat_level"]
          trigger_type: string
          voice_match_score?: number | null
          webcam_snapshot_path?: string | null
        }
        Update: {
          actions_taken?: Json
          alert_sent_email?: boolean
          alert_sent_sms?: boolean
          alert_sent_whatsapp?: boolean
          detected_at?: string
          event_id?: string
          face_match_score?: number | null
          false_alarm?: boolean
          ip_address?: unknown
          location?: Json | null
          mac_address?: string | null
          microphone_audio_path?: string | null
          notification_timestamps?: Json
          owner_notes?: string | null
          owner_reviewed?: boolean
          pin_attempts?: number
          resolved?: boolean
          resolved_at?: string | null
          screen_recording_path?: string | null
          screen_snapshot_path?: string | null
          threat_level?: Database["public"]["Enums"]["threat_level"]
          trigger_type?: string
          voice_match_score?: number | null
          webcam_snapshot_path?: string | null
        }
        Relationships: []
      }
      owners: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          backup_passphrase_hash: string | null
          biometric_enabled: boolean
          created_at: string
          email_hash: string | null
          emergency_contact_email: string | null
          emergency_contact_phone: string | null
          face_enabled: boolean
          face_model_version: number
          failed_attempt_count: number
          full_name: string
          hardware_fingerprint_hash: string | null
          hardware_lock_enabled: boolean
          last_login_at: string | null
          last_login_ip: unknown
          last_login_location: Json | null
          last_password_changed_at: string | null
          lockdown_triggered_count: number
          notification_preferences: Json
          owner_id: string
          phone_hash: string | null
          pin_enabled: boolean
          pin_hash: string | null
          pin_salt: string | null
          preferred_language: string
          security_level: number
          security_questions_hash: Json | null
          setup_complete: boolean
          timezone: string
          total_intruders_caught: number
          total_logins_count: number
          totp_secret_encrypted: string | null
          two_factor_enabled: boolean
          updated_at: string
          user_id: string | null
          voice_enabled: boolean
          voice_model_version: number
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          backup_passphrase_hash?: string | null
          biometric_enabled?: boolean
          created_at?: string
          email_hash?: string | null
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          face_enabled?: boolean
          face_model_version?: number
          failed_attempt_count?: number
          full_name: string
          hardware_fingerprint_hash?: string | null
          hardware_lock_enabled?: boolean
          last_login_at?: string | null
          last_login_ip?: unknown
          last_login_location?: Json | null
          last_password_changed_at?: string | null
          lockdown_triggered_count?: number
          notification_preferences?: Json
          owner_id?: string
          phone_hash?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          pin_salt?: string | null
          preferred_language?: string
          security_level?: number
          security_questions_hash?: Json | null
          setup_complete?: boolean
          timezone?: string
          total_intruders_caught?: number
          total_logins_count?: number
          totp_secret_encrypted?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string | null
          voice_enabled?: boolean
          voice_model_version?: number
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          backup_passphrase_hash?: string | null
          biometric_enabled?: boolean
          created_at?: string
          email_hash?: string | null
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          face_enabled?: boolean
          face_model_version?: number
          failed_attempt_count?: number
          full_name?: string
          hardware_fingerprint_hash?: string | null
          hardware_lock_enabled?: boolean
          last_login_at?: string | null
          last_login_ip?: unknown
          last_login_location?: Json | null
          last_password_changed_at?: string | null
          lockdown_triggered_count?: number
          notification_preferences?: Json
          owner_id?: string
          phone_hash?: string | null
          pin_enabled?: boolean
          pin_hash?: string | null
          pin_salt?: string | null
          preferred_language?: string
          security_level?: number
          security_questions_hash?: Json | null
          setup_complete?: boolean
          timezone?: string
          total_intruders_caught?: number
          total_logins_count?: number
          totp_secret_encrypted?: string | null
          two_factor_enabled?: boolean
          updated_at?: string
          user_id?: string | null
          voice_enabled?: boolean
          voice_model_version?: number
        }
        Relationships: []
      }
      security_analytics: {
        Row: {
          anomaly_flags: number
          avg_auth_confidence: number | null
          avg_session_duration_min: number | null
          blocked_attempts: number
          commands_run: number
          computed_at: string
          date: string
          failed_logins: number
          intruder_events: number
          new_devices_seen: number
          off_hours_logins: number
          peak_hour: number | null
          stat_id: string
          successful_logins: number
          threat_score_avg: number | null
          total_logins: number
          unique_devices_seen: number
          unique_ips_seen: number
          vpn_logins: number
        }
        Insert: {
          anomaly_flags?: number
          avg_auth_confidence?: number | null
          avg_session_duration_min?: number | null
          blocked_attempts?: number
          commands_run?: number
          computed_at?: string
          date: string
          failed_logins?: number
          intruder_events?: number
          new_devices_seen?: number
          off_hours_logins?: number
          peak_hour?: number | null
          stat_id?: string
          successful_logins?: number
          threat_score_avg?: number | null
          total_logins?: number
          unique_devices_seen?: number
          unique_ips_seen?: number
          vpn_logins?: number
        }
        Update: {
          anomaly_flags?: number
          avg_auth_confidence?: number | null
          avg_session_duration_min?: number | null
          blocked_attempts?: number
          commands_run?: number
          computed_at?: string
          date?: string
          failed_logins?: number
          intruder_events?: number
          new_devices_seen?: number
          off_hours_logins?: number
          peak_hour?: number | null
          stat_id?: string
          successful_logins?: number
          threat_score_avg?: number | null
          total_logins?: number
          unique_devices_seen?: number
          unique_ips_seen?: number
          vpn_logins?: number
        }
        Relationships: []
      }
      security_rules: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string
          description: string | null
          is_active: boolean
          last_triggered_at: string | null
          override_allowed: boolean
          owner_approved: boolean
          priority: number
          rule_id: string
          rule_name: string
          rule_type: string
          times_triggered_count: number
          updated_at: string
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string
          description?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          override_allowed?: boolean
          owner_approved?: boolean
          priority?: number
          rule_id?: string
          rule_name: string
          rule_type: string
          times_triggered_count?: number
          updated_at?: string
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string
          description?: string | null
          is_active?: boolean
          last_triggered_at?: string | null
          override_allowed?: boolean
          owner_approved?: boolean
          priority?: number
          rule_id?: string
          rule_name?: string
          rule_type?: string
          times_triggered_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          anomaly_score: number
          auth_score: number
          browser_fingerprint: string | null
          commands_executed_count: number
          device_name: string | null
          device_type: string | null
          expires_at: string
          files_accessed_count: number
          ip_address: unknown
          is_active: boolean
          issued_at: string
          jwt_token_hash: string | null
          location_city: string | null
          location_country: string | null
          location_lat: number | null
          location_lng: number | null
          login_method: Database["public"]["Enums"]["auth_method"]
          mac_address: string | null
          os_name: string | null
          os_version: string | null
          owner_id: string
          screen_resolution: string | null
          session_duration_seconds: number | null
          session_id: string
          suspicious_activity_flag: boolean
          terminated_at: string | null
          termination_reason: string | null
          timezone: string | null
          tor_detected: boolean
          vpn_detected: boolean
        }
        Insert: {
          anomaly_score?: number
          auth_score?: number
          browser_fingerprint?: string | null
          commands_executed_count?: number
          device_name?: string | null
          device_type?: string | null
          expires_at: string
          files_accessed_count?: number
          ip_address?: unknown
          is_active?: boolean
          issued_at?: string
          jwt_token_hash?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          login_method?: Database["public"]["Enums"]["auth_method"]
          mac_address?: string | null
          os_name?: string | null
          os_version?: string | null
          owner_id: string
          screen_resolution?: string | null
          session_duration_seconds?: number | null
          session_id?: string
          suspicious_activity_flag?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          timezone?: string | null
          tor_detected?: boolean
          vpn_detected?: boolean
        }
        Update: {
          anomaly_score?: number
          auth_score?: number
          browser_fingerprint?: string | null
          commands_executed_count?: number
          device_name?: string | null
          device_type?: string | null
          expires_at?: string
          files_accessed_count?: number
          ip_address?: unknown
          is_active?: boolean
          issued_at?: string
          jwt_token_hash?: string | null
          location_city?: string | null
          location_country?: string | null
          location_lat?: number | null
          location_lng?: number | null
          login_method?: Database["public"]["Enums"]["auth_method"]
          mac_address?: string | null
          os_name?: string | null
          os_version?: string | null
          owner_id?: string
          screen_resolution?: string | null
          session_duration_seconds?: number | null
          session_id?: string
          suspicious_activity_flag?: boolean
          terminated_at?: string | null
          termination_reason?: string | null
          timezone?: string | null
          tor_detected?: boolean
          vpn_detected?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sessions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          auto_login_enabled: boolean
          device_id: string
          fingerprint_hash: string
          first_authorized_at: string
          is_active: boolean
          label: string
          last_seen_at: string
          max_session_hours: number
          notes: string | null
          requires_face_always: boolean
          requires_pin_always: boolean
          revocation_reason: string | null
          revoked_at: string | null
          times_used: number
          trust_level: number
        }
        Insert: {
          auto_login_enabled?: boolean
          device_id?: string
          fingerprint_hash: string
          first_authorized_at?: string
          is_active?: boolean
          label: string
          last_seen_at?: string
          max_session_hours?: number
          notes?: string | null
          requires_face_always?: boolean
          requires_pin_always?: boolean
          revocation_reason?: string | null
          revoked_at?: string | null
          times_used?: number
          trust_level?: number
        }
        Update: {
          auto_login_enabled?: boolean
          device_id?: string
          fingerprint_hash?: string
          first_authorized_at?: string
          is_active?: boolean
          label?: string
          last_seen_at?: string
          max_session_hours?: number
          notes?: string | null
          requires_face_always?: boolean
          requires_pin_always?: boolean
          revocation_reason?: string | null
          revoked_at?: string | null
          times_used?: number
          trust_level?: number
        }
        Relationships: []
      }
      voice_profiles: {
        Row: {
          accent_profile: string | null
          backup_passphrase_hash: string | null
          confidence_threshold: number
          created_at: string
          false_negative_count: number
          false_positive_count: number
          language: string
          last_verified_at: string | null
          mfcc_feature_hash: string | null
          model_accuracy_score: number | null
          model_version: number
          noise_tolerance_level: number
          owner_id: string
          passphrase_hash: string | null
          pitch_baseline: number | null
          profile_id: string
          retrain_needed: boolean
          speech_rate_baseline: number | null
          training_samples_count: number
          updated_at: string
          verification_count: number
        }
        Insert: {
          accent_profile?: string | null
          backup_passphrase_hash?: string | null
          confidence_threshold?: number
          created_at?: string
          false_negative_count?: number
          false_positive_count?: number
          language?: string
          last_verified_at?: string | null
          mfcc_feature_hash?: string | null
          model_accuracy_score?: number | null
          model_version?: number
          noise_tolerance_level?: number
          owner_id: string
          passphrase_hash?: string | null
          pitch_baseline?: number | null
          profile_id?: string
          retrain_needed?: boolean
          speech_rate_baseline?: number | null
          training_samples_count?: number
          updated_at?: string
          verification_count?: number
        }
        Update: {
          accent_profile?: string | null
          backup_passphrase_hash?: string | null
          confidence_threshold?: number
          created_at?: string
          false_negative_count?: number
          false_positive_count?: number
          language?: string
          last_verified_at?: string | null
          mfcc_feature_hash?: string | null
          model_accuracy_score?: number | null
          model_version?: number
          noise_tolerance_level?: number
          owner_id?: string
          passphrase_hash?: string | null
          pitch_baseline?: number | null
          profile_id?: string
          retrain_needed?: boolean
          speech_rate_baseline?: number | null
          training_samples_count?: number
          updated_at?: string
          verification_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "voice_profiles_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["owner_id"]
          },
        ]
      }
      whitelisted_users: {
        Row: {
          access_count: number
          access_level: string
          allowed_hours: Json | null
          allowed_modules: Json
          created_at: string
          expiry_date: string | null
          face_profile_id: string | null
          is_active: boolean
          last_access_at: string | null
          name: string
          notes: string | null
          relationship: string | null
          revoked_at: string | null
          user_id: string
          voice_profile_id: string | null
        }
        Insert: {
          access_count?: number
          access_level?: string
          allowed_hours?: Json | null
          allowed_modules?: Json
          created_at?: string
          expiry_date?: string | null
          face_profile_id?: string | null
          is_active?: boolean
          last_access_at?: string | null
          name: string
          notes?: string | null
          relationship?: string | null
          revoked_at?: string | null
          user_id?: string
          voice_profile_id?: string | null
        }
        Update: {
          access_count?: number
          access_level?: string
          allowed_hours?: Json | null
          allowed_modules?: Json
          created_at?: string
          expiry_date?: string | null
          face_profile_id?: string | null
          is_active?: boolean
          last_access_at?: string | null
          name?: string
          notes?: string | null
          relationship?: string | null
          revoked_at?: string | null
          user_id?: string
          voice_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelisted_users_face_profile_id_fkey"
            columns: ["face_profile_id"]
            isOneToOne: false
            referencedRelation: "face_profiles"
            referencedColumns: ["profile_id"]
          },
          {
            foreignKeyName: "whitelisted_users_voice_profile_id_fkey"
            columns: ["voice_profile_id"]
            isOneToOne: false
            referencedRelation: "voice_profiles"
            referencedColumns: ["profile_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_owner: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended" | "lockdown"
      actor_type: "owner" | "jarvis" | "intruder" | "system"
      audit_severity: "info" | "warning" | "critical"
      auth_method:
        | "voice"
        | "face"
        | "pin"
        | "hardware"
        | "totp"
        | "email_otp"
        | "sms_otp"
        | "backup_passphrase"
        | "security_question"
        | "multi"
      auth_result: "success" | "fail" | "partial" | "blocked"
      threat_level: "1" | "2" | "3" | "4" | "5"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: ["active", "suspended", "lockdown"],
      actor_type: ["owner", "jarvis", "intruder", "system"],
      audit_severity: ["info", "warning", "critical"],
      auth_method: [
        "voice",
        "face",
        "pin",
        "hardware",
        "totp",
        "email_otp",
        "sms_otp",
        "backup_passphrase",
        "security_question",
        "multi",
      ],
      auth_result: ["success", "fail", "partial", "blocked"],
      threat_level: ["1", "2", "3", "4", "5"],
    },
  },
} as const
