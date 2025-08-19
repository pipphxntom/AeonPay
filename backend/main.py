from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import uvicorn
import os

from database import create_tables, get_db
from routes import auth, plans, vouchers, mandates, payments, merchants, users
from services.idempotency import IdempotencyService
from seed_data import seed_database

# Global idempotency service
idempotency_service = IdempotencyService()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_tables()
    seed_database()
    yield
    # Shutdown - cleanup if needed

app = FastAPI(
    title="AeonPay API",
    description="Smart group payments API with vouchers, mandates, and guardrails",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Idempotency middleware
@app.middleware("http")
async def idempotency_middleware(request: Request, call_next):
    idempotency_key = request.headers.get("idempotency-key")
    
    if idempotency_key and request.method in ["POST", "PUT", "PATCH"]:
        existing_response = idempotency_service.get_response(idempotency_key)
        if existing_response:
            return existing_response
            
        # Store the idempotency key in request state
        request.state.idempotency_key = idempotency_key
    
    response = await call_next(request)
    return response

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(plans.router, prefix="/api/plans", tags=["Plans"])
app.include_router(vouchers.router, prefix="/api/vouchers", tags=["Vouchers"])
app.include_router(mandates.router, prefix="/api/mandates", tags=["Mandates"])
app.include_router(payments.router, prefix="/api/payments", tags=["Payments"])
app.include_router(merchants.router, prefix="/api/merchants", tags=["Merchants"])
app.include_router(users.router, prefix="/api/me", tags=["User"])

@app.get("/")
async def root():
    return {
        "message": "AeonPay API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "aeonpay-api"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("ENV") == "development" else False
    )
