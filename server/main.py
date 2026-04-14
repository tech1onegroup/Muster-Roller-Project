from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from server.config import UPLOAD_DIR, BASE_DIR
from server.db.init import init_db, close_db
from server.routes import contractors, laborers, attendance, reports

dist_dir = BASE_DIR / "client" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()


app = FastAPI(title="Labour Attendance System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(contractors.router, prefix="/api/contractors", tags=["contractors"])
app.include_router(laborers.router, prefix="/api/laborers", tags=["laborers"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

# Static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Serve built frontend with SPA fallback
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

    @app.get("/{path:path}")
    async def spa_fallback(request: Request, path: str):
        file = dist_dir / path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(dist_dir / "index.html")
