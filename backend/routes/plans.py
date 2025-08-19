from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from models import (
    Plan, PlanMember, User, 
    PlanCreate, PlanResponse
)
from database import get_db
from auth import get_current_user
from services.idempotency import store_idempotent_response
import uuid

router = APIRouter()

@router.post("/", response_model=dict)
async def create_plan(
    request: Request,
    plan_data: PlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new plan with members"""
    
    # Create plan
    plan = Plan(
        id=str(uuid.uuid4()),
        name=plan_data.name,
        cap_per_head=plan_data.cap_per_head,
        window_start=plan_data.window_start,
        window_end=plan_data.window_end,
        merchant_whitelist=plan_data.merchant_whitelist,
        status="active",
        created_by=current_user.id
    )
    
    db.add(plan)
    db.flush()  # Get the ID without committing
    
    # Add plan members
    members = []
    for member_id in plan_data.member_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == member_id).first()
        if user:
            member = PlanMember(
                id=str(uuid.uuid4()),
                plan_id=plan.id,
                user_id=member_id,
                state="active"
            )
            db.add(member)
            members.append(member_id)
    
    # Add creator as member if not already included
    if current_user.id not in plan_data.member_ids:
        creator_member = PlanMember(
            id=str(uuid.uuid4()),
            plan_id=plan.id,
            user_id=current_user.id,
            state="active"
        )
        db.add(creator_member)
        members.append(current_user.id)
    
    db.commit()
    db.refresh(plan)
    
    response_data = {
        "plan": PlanResponse.from_orm(plan).dict(),
        "members": members
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get plan details"""
    
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Check if user has access (is creator or member)
    is_member = db.query(PlanMember).filter(
        PlanMember.plan_id == plan_id,
        PlanMember.user_id == current_user.id,
        PlanMember.state == "active"
    ).first()
    
    if not is_member and plan.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return PlanResponse.from_orm(plan)

@router.get("/", response_model=List[PlanResponse])
async def get_user_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all plans for current user"""
    
    # Get plans where user is creator or member
    member_plan_ids = db.query(PlanMember.plan_id).filter(
        PlanMember.user_id == current_user.id,
        PlanMember.state == "active"
    ).subquery()
    
    plans = db.query(Plan).filter(
        (Plan.created_by == current_user.id) |
        (Plan.id.in_(member_plan_ids))
    ).all()
    
    return [PlanResponse.from_orm(plan) for plan in plans]
