# Muster Roller Project — Labour Attendance

Face-recognition-based labour attendance system. FastAPI backend + Vite/JS frontend.

## Stack
- **Backend:** FastAPI, Uvicorn, SQLite (aiosqlite), ONNX Runtime, OpenCV, EasyOCR
- **Frontend:** Vite (see [client/](client/))

## Setup

### 1. Backend
```bash
pip install -r requirements.txt
```

### 2. Model files (required — not in repo due to size)
Place these files in [models/](models/):
- `w600k_r50.onnx` — face recognition (ArcFace R50)
- `yunet_2023mar.onnx` — face detection (YuNet)

### 3. Frontend
```bash
cd client
npm install
npm run build   # or `npm run dev` for development
```

### 4. Run the server
```bash
python run.py
```
Server starts on `http://0.0.0.0:8000`.

## Project layout
- [server/](server/) — FastAPI app, routes, services, DB
- [client/](client/) — Vite frontend
- [models/](models/) — ONNX model weights (gitignored)
- [data/](data/) — SQLite DB (gitignored, created at runtime)
- [docs/](docs/) — documentation
