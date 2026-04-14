# Labour Attendance System — Design Spec

## Context

Construction site supervisors need to track daily attendance of 50-200 laborers across multiple contractors. Currently done manually, which is error-prone and time-consuming. This system automates attendance by detecting faces in a daily group photo, matching them against enrolled laborers, and computing hours worked, half-days, and overtime.

## Tech Stack

- **Backend:** FastAPI (Python 3.11+)
- **Frontend:** React + Vite + shadcn/ui
- **Database:** SQLite (via aiosqlite)
- **Face Recognition:** DeepFace with RetinaFace detector + ArcFace embeddings
- **OCR:** EasyOCR (for Aadhaar card number extraction)
- **Brand Colors:** Primary `#876D27`, Secondary `#364F4F`, Background `#FFFCF8`, Text `#0D0D0D` (from onegroup.co.in)

## Architecture

```
labour-attendance/
├── server/
│   ├── main.py                # FastAPI entry, CORS, static serving
│   ├── config.py              # Settings, thresholds, paths
│   ├── db/
│   │   ├── init.py            # SQLite setup, get_db()
│   │   └── schema.sql         # All tables
│   ├── routes/
│   │   ├── contractors.py     # CRUD contractors
│   │   ├── laborers.py        # CRUD laborers + face enrollment + Aadhaar OCR
│   │   ├── attendance.py      # Group photo upload, face matching, confirm
│   │   └── reports.py         # Attendance history, export CSV
│   ├── services/
│   │   ├── face.py            # DeepFace wrapper: detect, embed, match
│   │   ├── ocr.py             # EasyOCR Aadhaar extraction
│   │   └── attendance.py      # Hours/overtime/status calculation
│   └── uploads/
│       ├── enrollments/       # Per-laborer face photos
│       ├── aadhaar/           # Aadhaar card images
│       └── group_photos/      # Daily attendance photos
├── client/
│   ├── src/
│   │   ├── App.jsx            # Router (4 routes)
│   │   ├── main.jsx           # Entry
│   │   ├── lib/utils.js       # shadcn utility
│   │   ├── components/ui/     # shadcn components
│   │   ├── pages/
│   │   │   ├── Attendance.jsx      # Upload photo + review matches + confirm
│   │   │   ├── AttendanceHistory.jsx # Date-grouped attendance table
│   │   │   ├── Laborers.jsx        # List + enroll laborers
│   │   │   └── Contractors.jsx     # List + add contractors
│   │   └── hooks/
│   │       └── useApi.js      # Fetch wrappers
│   └── index.html
├── requirements.txt
└── package.json
```

## Database Schema

### contractors
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| company | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| created_at | TIMESTAMP | |

### laborers
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| name | TEXT NOT NULL | |
| contractor_id | TEXT FK | References contractors(id) |
| phone | TEXT | |
| role | TEXT | mason, electrician, etc. |
| daily_wage | REAL NOT NULL | INR |
| shift_type | TEXT NOT NULL | '8hr' or '12hr' |
| photo_path | TEXT | Enrollment face photo |
| aadhaar_photo_path | TEXT | Uploaded Aadhaar card image |
| aadhaar_last4 | TEXT | Extracted via OCR, last 4 digits only |
| emergency_contact | TEXT | |
| status | TEXT DEFAULT 'active' | 'active' or 'inactive' |
| created_at | TIMESTAMP | |

### face_embeddings
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| laborer_id | TEXT FK | References laborers(id) |
| embedding | BLOB | 512D float vector, serialized as bytes |
| model | TEXT DEFAULT 'ArcFace' | |
| created_at | TIMESTAMP | |

### attendance_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| photo_path | TEXT | Path to uploaded group photo |
| session_type | TEXT | 'check_in' or 'check_out' |
| work_date | DATE | The working day |
| captured_at | TIMESTAMP | Exact time of upload |
| confirmed | BOOLEAN DEFAULT 0 | Supervisor confirmed |
| created_at | TIMESTAMP | |

### attendance
| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| laborer_id | TEXT FK | References laborers(id) |
| work_date | DATE NOT NULL | |
| check_in_session_id | TEXT FK | References attendance_sessions(id) |
| check_out_session_id | TEXT FK | References attendance_sessions(id) |
| check_in_time | TIMESTAMP | |
| check_out_time | TIMESTAMP | |
| hours_worked | REAL | Computed: checkout - checkin in hours |
| shift_hours | REAL | From laborer shift_type (8 or 12) |
| overtime_hours | REAL | Rounded up (10min+ remainder = +1hr) |
| status | TEXT | 'present', 'half_day', 'absent' |
| confidence_in | REAL | Face match distance at check-in |
| confidence_out | REAL | Face match distance at check-out |
| manual_override | BOOLEAN DEFAULT 0 | |
| created_at | TIMESTAMP | |

**Constraint:** `UNIQUE(laborer_id, work_date)` — one attendance record per laborer per day.

## Face Recognition Pipeline

### Enrollment
1. Supervisor uploads a clear face photo during laborer registration
2. `DeepFace.represent(photo, model_name="ArcFace", detector_backend="retinaface")` extracts 512D embedding
3. Embedding stored as BLOB in `face_embeddings` table
4. If detection fails (no face found), return error — supervisor re-uploads

### Group Photo Processing
1. Supervisor uploads group photo, selects "Check-in" or "Check-out"
2. **Image pre-processing:** Resize to max 2048px on longest side (preserves faces, reduces processing time for large photos)
3. `DeepFace.represent(group_photo, model_name="ArcFace", detector_backend="retinaface")` returns list of embeddings + bounding boxes
4. For each detected face:
   - Compute cosine distance against ALL enrolled embeddings
   - If min distance < 0.68 threshold → match found
   - If multiple enrollees match same face → pick lowest distance
   - If one enrollee matches multiple faces → flag for review
5. Return results: list of `{bounding_box, matched_laborer_id, confidence, cropped_face_thumbnail}` + list of unmatched faces
6. Supervisor reviews on screen, can override any match via dropdown, then clicks "Confirm"

### Check-in vs Check-out Logic

- **Check-in confirmation:** Creates a new `attendance` row with `check_in_time` and `check_in_session_id`. If a row already exists for that `(laborer_id, work_date)`, warn the supervisor and allow override (replaces existing check-in).
- **Check-out confirmation:** Looks up existing `attendance` row by `(laborer_id, work_date)`. If found, updates `check_out_time` and `check_out_session_id`, then computes `hours_worked`, `overtime_hours`, and `status`. If no check-in exists for that laborer on that date, warn the supervisor — they can still confirm (creates row with check-out only, status = `'present'` based on check-out time alone, but flagged for review).
- **Duplicate guard:** `UNIQUE(laborer_id, work_date)` constraint prevents double records. All updates are upserts.

### Attendance Calculation (on check-out confirmation)
```python
hours_worked = (check_out_time - check_in_time).total_seconds() / 3600
shift_hours = 8 if laborer.shift_type == '8hr' else 12

if hours_worked >= shift_hours:
    status = 'present'
    overtime_remainder = hours_worked - shift_hours
    overtime_hours = math.ceil(overtime_remainder) if overtime_remainder >= (10/60) else 0
elif hours_worked >= shift_hours / 2:
    status = 'half_day'
    overtime_hours = 0
else:
    status = 'half_day'  # still counts as half-day if they showed up
    overtime_hours = 0
```

Overtime rounding: any remainder of 10 minutes or more rounds up to the next full hour.

## Aadhaar OCR

1. Supervisor uploads Aadhaar card image during enrollment
2. EasyOCR extracts text from the image
3. Regex finds the 12-digit Aadhaar number pattern (`\d{4}\s?\d{4}\s?\d{4}`)
4. Only the last 4 digits are stored in the database for privacy
5. If OCR fails, supervisor can manually enter last 4 digits

## UI Design

### Principles
- Minimal, large touch targets (supervisors may use phones on-site)
- shadcn/ui components with OneGroup brand colors
- 4 pages only, simple sidebar navigation

### Page 1: Attendance (Home)
- Large "Upload Photo" button (center, prominent)
- Toggle: Check-in / Check-out
- Date picker (defaults to today)
- After upload: grid/list of detected faces with:
  - Cropped face thumbnail
  - Matched laborer name (editable dropdown)
  - Confidence indicator (green/yellow/red)
  - Checkbox (pre-checked for matches)
- "Confirm All" button at bottom
- Individual checkboxes for selective confirmation

### Page 2: Attendance History
- Date range filter + contractor filter
- Table grouped by date: laborer name, contractor, check-in, check-out, hours, status, overtime
- Export to CSV button

### Page 3: Laborers
- Table: name, contractor, role, wage, shift, status
- "Add Laborer" button → form with: name, role, contractor (dropdown), daily wage, shift type (8hr/12hr), phone, emergency contact, face photo upload, Aadhaar card upload
- Edit/deactivate existing laborers

### Page 4: Contractors
- Simple table: name, company, phone, email
- "Add Contractor" button → simple form

### Navigation
- Left sidebar with 4 icons: Attendance, History, Laborers, Contractors
- Collapsible on mobile

## API Endpoints

### Contractors

- `GET /api/contractors` — list all (includes laborer count per contractor)
- `POST /api/contractors` — create
- `PUT /api/contractors/:id` — update
- `DELETE /api/contractors/:id` — soft-delete only; blocked if contractor has active laborers

### Laborers
- `GET /api/laborers` — list all (filter by contractor_id, status)
- `POST /api/laborers` — create + enroll face + OCR Aadhaar
- `PUT /api/laborers/:id` — update
- `POST /api/laborers/:id/re-enroll` — re-upload face photo
- `PATCH /api/laborers/:id/status` — activate/deactivate

### Attendance
- `POST /api/attendance/upload` — upload group photo, returns detected faces + matches
- `POST /api/attendance/confirm` — confirm attendance session (saves records)
- `GET /api/attendance?date=YYYY-MM-DD` — get attendance for a date
- `GET /api/attendance/range?from=&to=&contractor_id=` — date range query

### Static Files

- `GET /uploads/enrollments/:filename` — serve enrollment face photos (for UI display during match review)
- `GET /uploads/group_photos/:filename` — serve group photos

### Reports

- `GET /api/reports/export?from=&to=&format=csv` — export attendance data

## Verification Plan

1. **Unit tests:** Test face embedding storage/retrieval, attendance calculation logic (present/half-day/overtime), OCR extraction
2. **Integration tests:** Upload a test group photo with known faces, verify matching accuracy
3. **Manual testing:**
   - Enroll 3-5 test faces
   - Upload a group photo containing those faces
   - Verify correct matches on the UI
   - Confirm and check database records
   - Upload check-out photo, verify hours/overtime calculation
4. **Edge cases:** No faces detected, single face in group, unknown face, same person matched twice
