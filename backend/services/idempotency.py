from typing import Optional, Dict, Any
from models import IdempotentRequest
from database import get_db_session
import uuid
import json
from fastapi import Response
from fastapi.responses import JSONResponse

class IdempotencyService:
    """Service to handle idempotent requests"""
    
    def __init__(self):
        pass
    
    def get_response(self, idempotency_key: str) -> Optional[Response]:
        """Get stored response for idempotency key"""
        db = get_db_session()
        try:
            request = db.query(IdempotentRequest).filter(
                IdempotentRequest.idempotency_key == idempotency_key
            ).first()
            
            if request and request.response_data:
                return JSONResponse(content=request.response_data)
            return None
        finally:
            db.close()
    
    def store_response(self, idempotency_key: str, response_data: Dict[str, Any]):
        """Store response for idempotency key"""
        db = get_db_session()
        try:
            # Check if already exists
            existing = db.query(IdempotentRequest).filter(
                IdempotentRequest.idempotency_key == idempotency_key
            ).first()
            
            if not existing:
                request = IdempotentRequest(
                    id=str(uuid.uuid4()),
                    idempotency_key=idempotency_key,
                    response_data=response_data
                )
                db.add(request)
                db.commit()
        finally:
            db.close()

# Global service instance
idempotency_service = IdempotencyService()

def store_idempotent_response(idempotency_key: str, response_data: Dict[str, Any]):
    """Helper function to store idempotent response"""
    idempotency_service.store_response(idempotency_key, response_data)

def get_idempotent_response(idempotency_key: str) -> Optional[Response]:
    """Helper function to get idempotent response"""
    return idempotency_service.get_response(idempotency_key)
