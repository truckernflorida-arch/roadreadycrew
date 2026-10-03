-- D1 schema for Road Ready Crew form submissions
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form TEXT NOT NULL,            -- driver | carrier | referral
  created_at TEXT NOT NULL,      -- ISO timestamp (UTC)
  ip TEXT,
  user_agent TEXT,
  consent_text TEXT,             -- exact TCPA consent wording shown, if checked
  data TEXT NOT NULL             -- full JSON of the form
);
CREATE INDEX IF NOT EXISTS idx_submissions_form_time ON submissions (form, created_at);
