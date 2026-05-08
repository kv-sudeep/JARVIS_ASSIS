/**
 * JARVIS Module 1 — shared types
 */

export type SecurityLevel = 1 | 2 | 3 | 4 | 5;
export type AccountStatus = "active" | "suspended" | "lockdown";
export type ThreatLevel = 1 | 2 | 3 | 4 | 5;

export interface OwnerRecord {
  owner_id: string;
  user_id: string;
  full_name: string;
  created_at: string;
  last_login_at: string | null;
  total_logins_count: number;
  account_status: AccountStatus;
  security_level: number;
  two_factor_enabled: boolean;
  pin_enabled: boolean;
  hardware_lock_enabled: boolean;
  emergency_contact_email: string | null;
  emergency_contact_phone: string | null;
  failed_attempt_count: number;
  lockdown_triggered_count: number;
  total_intruders_caught: number;
  setup_complete: boolean;
  preferred_language: string;
  timezone: string;
}

export interface SessionRecord {
  session_id: string;
  owner_id: string;
  issued_at: string;
  expires_at: string;
  is_active: boolean;
  ip_address: string | null;
  os_name: string | null;
  device_type: string | null;
  location_city: string | null;
  location_country: string | null;
  login_method: string;
  auth_score: number;
  vpn_detected: boolean;
  tor_detected: boolean;
  anomaly_score: number;
}

export interface AuthAttempt {
  attempt_id: string;
  timestamp: string;
  attempt_type: string;
  result: "success" | "fail" | "partial" | "blocked";
  confidence_score: number | null;
  ip_address: string | null;
  failure_reason: string | null;
  threat_level: string | null;
  lockdown_triggered: boolean;
}

export interface IntruderEvent {
  event_id: string;
  detected_at: string;
  trigger_type: string;
  threat_level: string;
  ip_address: string | null;
  location: Record<string, unknown> | null;
  pin_attempts: number;
  alert_sent_email: boolean;
  alert_sent_whatsapp: boolean;
  alert_sent_sms: boolean;
  owner_reviewed: boolean;
  resolved: boolean;
  false_alarm: boolean;
}

export interface AuditLogEntry {
  log_id: string;
  timestamp: string;
  event_type: string;
  actor: "owner" | "jarvis" | "intruder" | "system";
  action_description: string;
  affected_resource: string | null;
  severity: "info" | "warning" | "critical";
}

export interface SecurityAnalytic {
  date: string;
  total_logins: number;
  successful_logins: number;
  failed_logins: number;
  intruder_events: number;
  unique_ips_seen: number;
  threat_score_avg: number | null;
}
