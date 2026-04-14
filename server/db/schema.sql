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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(laborer_id, work_date)
);

-- =========================================
-- Quotation Comparison Tool
-- =========================================

CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT,
    email TEXT,
    gst_number TEXT,
    address TEXT,
    rating INTEGER DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    approved_vendor_id TEXT REFERENCES vendors(id),
    approval_notes TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES quotation_projects(id),
    vendor_id TEXT REFERENCES vendors(id),
    file_path TEXT,
    base_amount REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    net_amount REAL DEFAULT 0,
    gst_type TEXT DEFAULT 'exclusive',
    gst_percent REAL DEFAULT 18,
    gst_amount REAL DEFAULT 0,
    logistics_cost REAL DEFAULT 0,
    installation_cost REAL DEFAULT 0,
    other_charges REAL DEFAULT 0,
    total_landed_cost REAL DEFAULT 0,
    payment_terms TEXT,
    delivery_days INTEGER,
    warranty_months INTEGER,
    validity_days INTEGER DEFAULT 30,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quotation_items (
    id TEXT PRIMARY KEY,
    quotation_id TEXT REFERENCES quotations(id),
    item_description TEXT NOT NULL,
    specification TEXT,
    brand TEXT,
    hsn_code TEXT,
    quantity REAL DEFAULT 1,
    unit TEXT DEFAULT 'Nos',
    gross_rate REAL DEFAULT 0,
    discount_percent REAL DEFAULT 0,
    net_rate REAL DEFAULT 0,
    line_total REAL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
