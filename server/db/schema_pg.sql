CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS laborers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contractor_id TEXT REFERENCES contractors(id),
    phone TEXT,
    role TEXT,
    daily_wage DOUBLE PRECISION NOT NULL,
    shift_type TEXT NOT NULL DEFAULT '8hr',
    photo_path TEXT,
    aadhaar_photo_path TEXT,
    aadhaar_last4 TEXT,
    emergency_contact TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id TEXT PRIMARY KEY,
    laborer_id TEXT REFERENCES laborers(id),
    embedding BYTEA,
    model TEXT DEFAULT 'ArcFace',
    created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    photo_path TEXT,
    session_type TEXT NOT NULL,
    work_date TEXT NOT NULL,
    captured_at TEXT DEFAULT (now()::text),
    confirmed BOOLEAN DEFAULT FALSE,
    created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    laborer_id TEXT REFERENCES laborers(id),
    work_date TEXT NOT NULL,
    check_in_session_id TEXT REFERENCES attendance_sessions(id),
    check_out_session_id TEXT REFERENCES attendance_sessions(id),
    check_in_time TEXT,
    check_out_time TEXT,
    hours_worked DOUBLE PRECISION,
    shift_hours DOUBLE PRECISION,
    overtime_hours DOUBLE PRECISION,
    status TEXT,
    confidence_in DOUBLE PRECISION,
    confidence_out DOUBLE PRECISION,
    manual_override BOOLEAN DEFAULT FALSE,
    edited INTEGER NOT NULL DEFAULT 0,
    edited_at TEXT,
    created_at TEXT DEFAULT (now()::text),
    UNIQUE(laborer_id, work_date)
);
