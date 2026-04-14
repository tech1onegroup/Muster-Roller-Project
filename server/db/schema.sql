CREATE TABLE IF NOT EXISTS contractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS laborers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contractor_id TEXT REFERENCES contractors(id),
    phone TEXT,
    role TEXT,
    daily_wage REAL NOT NULL,
    shift_type TEXT NOT NULL DEFAULT '8hr',
    photo_path TEXT,
    aadhaar_photo_path TEXT,
    aadhaar_last4 TEXT,
    emergency_contact TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS face_embeddings (
    id TEXT PRIMARY KEY,
    laborer_id TEXT REFERENCES laborers(id),
    embedding BLOB,
    model TEXT DEFAULT 'ArcFace',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    photo_path TEXT,
    session_type TEXT NOT NULL,
    work_date DATE NOT NULL,
    captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id TEXT PRIMARY KEY,
    laborer_id TEXT REFERENCES laborers(id),
    work_date DATE NOT NULL,
    check_in_session_id TEXT REFERENCES attendance_sessions(id),
    check_out_session_id TEXT REFERENCES attendance_sessions(id),
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    hours_worked REAL,
    shift_hours REAL,
    overtime_hours REAL,
    status TEXT,
    confidence_in REAL,
    confidence_out REAL,
    manual_override BOOLEAN DEFAULT 0,
    edited INTEGER NOT NULL DEFAULT 0,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(laborer_id, work_date)
);
