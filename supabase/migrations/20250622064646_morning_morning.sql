/*
  # Calendar Integration Setup

  1. New Tables
    - `google_calendar_tokens` - Stores Google OAuth tokens for calendar access
    - `calendar_events` - Stores calendar events synced from Google Calendar
    - `event_attendees` - Stores attendees for calendar events

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_event_id text,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  descripcion text,
  fecha_inicio timestamptz NOT NULL,
  fecha_fin timestamptz NOT NULL,
  ubicacion text,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  caso_id uuid REFERENCES casos(id) ON DELETE SET NULL,
  is_synced_with_google boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_attendees table
CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  nombre text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Create policies for google_calendar_tokens
CREATE POLICY "Users can read own calendar tokens"
  ON google_calendar_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar tokens"
  ON google_calendar_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar tokens"
  ON google_calendar_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar tokens"
  ON google_calendar_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for calendar_events
CREATE POLICY "Users can read own calendar events"
  ON calendar_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own calendar events"
  ON calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own calendar events"
  ON calendar_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own calendar events"
  ON calendar_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create policies for event_attendees
CREATE POLICY "Users can read attendees of own events"
  ON event_attendees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attendees to own events"
  ON event_attendees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attendees of own events"
  ON event_attendees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attendees of own events"
  ON event_attendees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events 
      WHERE calendar_events.id = event_attendees.event_id 
      AND calendar_events.user_id = auth.uid()
    )
  );

-- Create triggers for updated_at
CREATE TRIGGER google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_fecha_inicio ON calendar_events(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_calendar_events_google_id ON calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);