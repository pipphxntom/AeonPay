from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from models import (
    Mandate, MandateExecution, Plan, User,
    MandateCreate, MandateResponse
)
from database import get_db
from auth import get_current_user
from services.idempotency import store_idempotent_response
import uuid

router = APIRouter()

@router.post("/create", response_model=dict)
async def create_mandates(
    request: Request,
    mandate_data: MandateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create mandates for plan members (dev-mock)"""
    
    # Verify plan exists and user has access
    plan = db.query(Plan).filter(Plan.id == mandate_data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only plan creator can create mandates")
    
    # Create mandates for each member
    mandates = []
    for member_id in mandate_data.member_user_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == member_id).first()
        if not user:
            continue
            
        mandate = Mandate(
            id=str(uuid.uuid4()),
            plan_id=mandate_data.plan_id,
            member_user_id=member_id,
            cap_amount=mandate_data.cap_amount,
            valid_from=mandate_data.valid_from,
            valid_to=mandate_data.valid_to,
            state="active"
        )
        
        db.add(mandate)
        mandates.append(mandate)
    
    db.commit()
    
    # Refresh to get created_at timestamps
    for mandate in mandates:
        db.refresh(mandate)
    
    response_data = {
        "mandates": [MandateResponse.from_orm(m).dict() for m in mandates]
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.post("/execute", response_model=dict)
async def execute_mandate(
    request: Request,
    execution_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute mandate debit (dev-mock)"""
    
    mandate_id = execution_data.get("mandate_id")
    amount = execution_data.get("amount")
    
    if not mandate_id or not amount:
        raise HTTPException(status_code=400, detail="Mandate ID and amount required")
    
    # Find mandate
    mandate = db.query(Mandate).filter(
        Mandate.id == mandate_id,
        Mandate.state == "active"
    ).first()
    
    if not mandate:
        raise HTTPException(status_code=404, detail="Mandate not found or inactive")
    
    # Check if amount exceeds cap
    if amount > mandate.cap_amount:
        raise HTTPException(status_code=400, detail="Amount exceeds mandate cap")
    
    # Dev-mock: randomly succeed or fail for demonstration
    import random
    success = random.choice([True, True, True, False])  # 75% success rate
    
    # Create execution record
    execution = MandateExecution(
        id=str(uuid.uuid4()),
        mandate_id=mandate_id,
        amount=amount,
        merchant_id=execution_data.get("merchant_id"),
        status="success" if success else "failed"
    )
    db.add(execution)
    
    # Update mandate if successful
    if success:
        mandate.cap_amount -= amount
        if mandate.cap_amount <= 0:
            mandate.state = "expired"
    
    db.commit()
    
    response_data = {
        "result": {
            "mandate_id": mandate_id,
            "amount": float(amount),
            "status": execution.status,
            "remaining_cap": float(mandate.cap_amount),
            "execution_id": execution.id
        }
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.get("/plan/{plan_id}", response_model=List[MandateResponse])
async def get_plan_mandates(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all mandates for a plan"""
    
    # Verify user has access to plan
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    mandates = db.query(Mandate).filter(Mandate.plan_id == plan_id).all()
    return [MandateResponse.from_orm(m) for m in mandates]
