
-- ============================================================================
-- JARVIS MODULE 1 — Owner Authentication & Security Schema
-- ============================================================================

-- Enums
CREATE TYPE public.account_status AS ENUM ('active', 'suspended', 'lockdown');
CREATE TYPE public.threat_level AS ENUM ('1', '2', '3', '4', '5');
CREATE TYPE public.auth_result AS ENUM ('success', 'fail', 'partial', 'blocked');
CREATE TYPE public.auth_method AS ENUM ('voice', 'face', 'pin', 'hardware', 'totp', 'email_otp', 'sms_otp', 'backup_passphrase', 'security_question', 'multi');
CREATE TYPE public.audit_severity AS ENUM ('info', 'warning', 'critical');
CREATE TYPE public.actor_type AS ENUM ('owner', 'jarvis', 'intruder', 'system');

-- ============================================================================
-- TABLE 1: owners — single master identity row
-- ============================================================================
CREATE TABLE public.owners (
  owner_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email_hash TEXT,
  phone_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  last_login_location JSONB,
  total_logins_count INT NOT NULL DEFAULT 0,
  account_status public.account_status NOT NULL DEFAULT 'active',
  hardware_fingerprint_hash TEXT,
  voice_model_version INT NOT NULL DEFAULT 0,
  face_model_version INT NOT NULL DEFAULT 0,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  security_level SMALLINT NOT NULL DEFAULT 3 CHECK (security_level BETWEEN 1 AND 5),
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  biometric_enabled BOOLEAN NOT NULL DEFAULT false,
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  face_enabled BOOLEAN NOT NULL DEFAULT false,
  pin_enabled BOOLEAN NOT NULL DEFAULT true,
  hardware_lock_enabled BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,
  pin_salt TEXT,
  totp_secret_encrypted TEXT,
  emergency_contact_email TEXT,
  emergency_contact_phone TEXT,
  backup_passphrase_hash TEXT,
  security_questions_hash JSONB,
  last_password_changed_at TIMESTAMPTZ,
  failed_attempt_count INT NOT NULL DEFAULT 0,
  lockdown_triggered_count INT NOT NULL DEFAULT 0,
  total_intruders_caught INT NOT NULL DEFAULT 0,
  notification_preferences JSONB NOT NULL DEFAULT '{"email":true,"sms":true,"whatsapp":true,"push":true}'::jsonb,
  setup_complete BOOLEAN NOT NULL DEFAULT false
);

-- Single-owner constraint: only one row allowed
CREATE UNIQUE INDEX owners_singleton_idx ON public.owners ((true));

-- ============================================================================
-- TABLE 2: sessions
-- ============================================================================
CREATE TABLE public.sessions (
  session_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(owner_id) ON DELETE CASCADE,
  jwt_token_hash TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  terminated_at TIMESTAMPTZ,
  termination_reason TEXT,
  ip_address INET,
  mac_address TEXT,
  browser_fingerprint TEXT,
  os_name TEXT,
  os_version TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  login_method public.auth_method NOT NULL DEFAULT 'pin',
  auth_score SMALLINT NOT NULL DEFAULT 0 CHECK (auth_score BETWEEN 0 AND 100),
  device_name TEXT,
  device_type TEXT,
  location_city TEXT,
  location_country TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  vpn_detected BOOLEAN NOT NULL DEFAULT false,
  tor_detected BOOLEAN NOT NULL DEFAULT false,
  session_duration_seconds INT,
  commands_executed_count INT NOT NULL DEFAULT 0,
  files_accessed_count INT NOT NULL DEFAULT 0,
  suspicious_activity_flag BOOLEAN NOT NULL DEFAULT false,
  anomaly_score SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX sessions_owner_active_idx ON public.sessions(owner_id, is_active);
CREATE INDEX sessions_issued_idx ON public.sessions(issued_at DESC);

-- ============================================================================
-- TABLE 3: auth_attempts — append-only forensic log
-- ============================================================================
CREATE TABLE public.auth_attempts (
  attempt_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempt_type public.auth_method NOT NULL,
  result public.auth_result NOT NULL,
  confidence_score SMALLINT,
  ip_address INET,
  mac_address TEXT,
  failure_reason TEXT,
  input_hash TEXT,
  os_fingerprint TEXT,
  browser_agent TEXT,
  location_data JSONB,
  device_fingerprint TEXT,
  attempt_number_in_sequence INT NOT NULL DEFAULT 1,
  lockdown_triggered BOOLEAN NOT NULL DEFAULT false,
  alert_sent BOOLEAN NOT NULL DEFAULT false,
  screenshot_captured BOOLEAN NOT NULL DEFAULT false,
  webcam_snapshot_url TEXT,
  microphone_audio_url TEXT,
  screen_recording_url TEXT,
  threat_level public.threat_level,
  notes TEXT
);
CREATE INDEX auth_attempts_timestamp_idx ON public.auth_attempts(timestamp DESC);
CREATE INDEX auth_attempts_result_idx ON public.auth_attempts(result, timestamp DESC);

-- ============================================================================
-- TABLE 4: hardware_fingerprints
-- ============================================================================
CREATE TABLE public.hardware_fingerprints (
  fingerprint_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_hash TEXT NOT NULL UNIQUE,
  cpu_id_hash TEXT,
  motherboard_id_hash TEXT,
  bios_hash TEXT,
  mac_address_hash TEXT,
  disk_serial_hash TEXT,
  gpu_id_hash TEXT,
  ram_size BIGINT,
  os_install_id_hash TEXT,
  hostname_hash TEXT,
  is_authorized BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorization_granted_at TIMESTAMPTZ,
  authorization_revoked_at TIMESTAMPTZ,
  times_seen_count INT NOT NULL DEFAULT 1,
  owner_approved BOOLEAN NOT NULL DEFAULT false,
  label TEXT,
  notes TEXT
);

-- ============================================================================
-- TABLE 5: voice_profiles
-- ============================================================================
CREATE TABLE public.voice_profiles (
  profile_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES public.owners(owner_id) ON DELETE CASCADE,
  model_version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  training_samples_count INT NOT NULL DEFAULT 0,
  mfcc_feature_hash TEXT,
  pitch_baseline DOUBLE PRECISION,
  speech_rate_baseline DOUBLE PRECISION,
  accent_profile TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  noise_tolerance_level SMALLINT NOT NULL DEFAULT 3,
  confidence_threshold SMALLINT NOT NULL DEFAULT 75,
  last_verified_at TIMESTAMPTZ,
  verification_count INT NOT NULL DEFAULT 0,
  false_positive_count INT NOT NULL DEFAULT 0,
  false_negative_count INT NOT NULL DEFAULT 0,
  model_accuracy_score DOUBLE PRECISION,
  retrain_needed BOOLEAN NOT NULL DEFAULT false,
  passphrase_hash TEXT,
  backup_passphrase_hash TEXT
);

-- ============================================================================
-- TABLE 6: face_profiles
-- ============================================================================
CREATE TABLE public.face_profiles (
  profile_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.owners(owner_id) ON DELETE CASCADE,
  person_type TEXT NOT NULL DEFAULT 'owner' CHECK (person_type IN ('owner','guest','blocked')),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  encoding_hash TEXT,
  training_images_count INT NOT NULL DEFAULT 0,
  confidence_threshold SMALLINT NOT NULL DEFAULT 70,
  last_verified_at TIMESTAMPTZ,
  access_level TEXT NOT NULL DEFAULT 'full' CHECK (access_level IN ('full','limited','readonly')),
  allowed_hours_start TIME,
  allowed_hours_end TIME,
  allowed_days JSONB,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  face_mask_tolerance BOOLEAN NOT NULL DEFAULT false,
  glasses_tolerance BOOLEAN NOT NULL DEFAULT true,
  lighting_condition_baseline TEXT,
  age_estimate INT,
  notes TEXT
);

-- ============================================================================
-- TABLE 7: intruder_events
-- ============================================================================
CREATE TABLE public.intruder_events (
  event_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trigger_type TEXT NOT NULL,
  threat_level public.threat_level NOT NULL DEFAULT '3',
  ip_address INET,
  mac_address TEXT,
  location JSONB,
  webcam_snapshot_path TEXT,
  screen_snapshot_path TEXT,
  microphone_audio_path TEXT,
  screen_recording_path TEXT,
  face_match_score DOUBLE PRECISION,
  voice_match_score DOUBLE PRECISION,
  pin_attempts INT NOT NULL DEFAULT 0,
  actions_taken JSONB NOT NULL DEFAULT '[]'::jsonb,
  alert_sent_email BOOLEAN NOT NULL DEFAULT false,
  alert_sent_whatsapp BOOLEAN NOT NULL DEFAULT false,
  alert_sent_sms BOOLEAN NOT NULL DEFAULT false,
  notification_timestamps JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_reviewed BOOLEAN NOT NULL DEFAULT false,
  owner_notes TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  false_alarm BOOLEAN NOT NULL DEFAULT false
);
CREATE INDEX intruder_events_detected_idx ON public.intruder_events(detected_at DESC);

-- ============================================================================
-- TABLE 8: security_rules
-- ============================================================================
CREATE TABLE public.security_rules (
  rule_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('time_based','location_based','behavior_based','network_based','device_based')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority SMALLINT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  times_triggered_count INT NOT NULL DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  override_allowed BOOLEAN NOT NULL DEFAULT true,
  owner_approved BOOLEAN NOT NULL DEFAULT true,
  description TEXT
);

-- ============================================================================
-- TABLE 9: audit_log — IMMUTABLE append-only
-- ============================================================================
CREATE TABLE public.audit_log (
  log_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  actor public.actor_type NOT NULL DEFAULT 'jarvis',
  session_id UUID REFERENCES public.sessions(session_id) ON DELETE SET NULL,
  ip_address INET,
  action_description TEXT NOT NULL,
  affected_resource TEXT,
  before_state JSONB,
  after_state JSONB,
  severity public.audit_severity NOT NULL DEFAULT 'info',
  reversible BOOLEAN NOT NULL DEFAULT false,
  reversed BOOLEAN NOT NULL DEFAULT false,
  reversed_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX audit_log_timestamp_idx ON public.audit_log(timestamp DESC);
CREATE INDEX audit_log_event_type_idx ON public.audit_log(event_type, timestamp DESC);

-- Trigger: prevent any update or delete on audit_log
CREATE OR REPLACE FUNCTION public.audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only. Cannot % rows.', TG_OP;
END;
$$;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_immutable();

-- Trigger: prevent updates/deletes on auth_attempts
CREATE OR REPLACE FUNCTION public.auth_attempts_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'auth_attempts is append-only. Cannot % rows.', TG_OP;
END;
$$;
CREATE TRIGGER auth_attempts_no_update BEFORE UPDATE ON public.auth_attempts
  FOR EACH ROW EXECUTE FUNCTION public.auth_attempts_immutable();
CREATE TRIGGER auth_attempts_no_delete BEFORE DELETE ON public.auth_attempts
  FOR EACH ROW EXECUTE FUNCTION public.auth_attempts_immutable();

-- Trigger: prevent deletes on intruder_events (updates allowed for resolved/notes)
CREATE OR REPLACE FUNCTION public.intruder_events_no_delete_fn()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'intruder_events cannot be deleted. Mark as false_alarm or resolved instead.';
END;
$$;
CREATE TRIGGER intruder_events_no_delete BEFORE DELETE ON public.intruder_events
  FOR EACH ROW EXECUTE FUNCTION public.intruder_events_no_delete_fn();

-- Trigger: enforce single owner row
CREATE OR REPLACE FUNCTION public.enforce_single_owner()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.owners) >= 1 AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Only one owner row is allowed. JARVIS is single-owner.';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER owners_singleton BEFORE INSERT ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_owner();

-- ============================================================================
-- TABLE 10: trusted_devices
-- ============================================================================
CREATE TABLE public.trusted_devices (
  device_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  fingerprint_hash TEXT NOT NULL UNIQUE,
  first_authorized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  times_used INT NOT NULL DEFAULT 0,
  trust_level SMALLINT NOT NULL DEFAULT 3 CHECK (trust_level BETWEEN 1 AND 5),
  requires_pin_always BOOLEAN NOT NULL DEFAULT true,
  requires_face_always BOOLEAN NOT NULL DEFAULT false,
  auto_login_enabled BOOLEAN NOT NULL DEFAULT false,
  max_session_hours INT NOT NULL DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  notes TEXT
);

-- ============================================================================
-- TABLE 11: whitelisted_users
-- ============================================================================
CREATE TABLE public.whitelisted_users (
  user_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  relationship TEXT,
  face_profile_id UUID REFERENCES public.face_profiles(profile_id) ON DELETE SET NULL,
  voice_profile_id UUID REFERENCES public.voice_profiles(profile_id) ON DELETE SET NULL,
  access_level TEXT NOT NULL DEFAULT 'readonly' CHECK (access_level IN ('readonly','limited','standard')),
  allowed_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_hours JSONB,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_access_at TIMESTAMPTZ,
  access_count INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  revoked_at TIMESTAMPTZ,
  notes TEXT
);

-- ============================================================================
-- TABLE 12: security_analytics
-- ============================================================================
CREATE TABLE public.security_analytics (
  stat_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_logins INT NOT NULL DEFAULT 0,
  successful_logins INT NOT NULL DEFAULT 0,
  failed_logins INT NOT NULL DEFAULT 0,
  intruder_events INT NOT NULL DEFAULT 0,
  unique_ips_seen INT NOT NULL DEFAULT 0,
  unique_devices_seen INT NOT NULL DEFAULT 0,
  avg_auth_confidence DOUBLE PRECISION,
  avg_session_duration_min DOUBLE PRECISION,
  commands_run INT NOT NULL DEFAULT 0,
  peak_hour SMALLINT,
  off_hours_logins INT NOT NULL DEFAULT 0,
  vpn_logins INT NOT NULL DEFAULT 0,
  anomaly_flags INT NOT NULL DEFAULT 0,
  threat_score_avg DOUBLE PRECISION,
  new_devices_seen INT NOT NULL DEFAULT 0,
  blocked_attempts INT NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- updated_at triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER owners_updated BEFORE UPDATE ON public.owners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER voice_profiles_updated BEFORE UPDATE ON public.voice_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER face_profiles_updated BEFORE UPDATE ON public.face_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER security_rules_updated BEFORE UPDATE ON public.security_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- Helper: is_owner() — security definer function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.owners
    WHERE user_id = _user_id
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hardware_fingerprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intruder_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whitelisted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_analytics ENABLE ROW LEVEL SECURITY;

-- owners: only the owner row's user_id can see/update it; INSERT allowed for the bootstrap auth user
CREATE POLICY "Owner can read self" ON public.owners FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owner can update self" ON public.owners FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Authenticated can insert first owner" ON public.owners FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.owners));

-- All other tables: only owner can read; writes only via service role (Python backend) or owner
CREATE POLICY "Owner reads sessions" ON public.sessions FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Owner inserts sessions" ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "Owner updates sessions" ON public.sessions FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()));

CREATE POLICY "Owner reads auth_attempts" ON public.auth_attempts FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Anyone inserts auth_attempts" ON public.auth_attempts FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Owner reads fingerprints" ON public.hardware_fingerprints FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Owner manages fingerprints" ON public.hardware_fingerprints FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner manages voice_profiles" ON public.voice_profiles FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner manages face_profiles" ON public.face_profiles FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner reads intruder_events" ON public.intruder_events FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Owner updates intruder_events" ON public.intruder_events FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Anyone inserts intruder_events" ON public.intruder_events FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Owner manages security_rules" ON public.security_rules FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner reads audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
CREATE POLICY "Anyone inserts audit_log" ON public.audit_log FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Owner manages trusted_devices" ON public.trusted_devices FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner manages whitelisted_users" ON public.whitelisted_users FOR ALL TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "Owner reads security_analytics" ON public.security_analytics FOR SELECT TO authenticated
  USING (public.is_owner(auth.uid()));
