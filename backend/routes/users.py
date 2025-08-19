from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from models import User, Plan, PlanResponse, UserResponse
from database import get_db
from auth import get_current_user

router = APIRouter()

@router.get("/profile", response_model=UserResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return UserResponse.from_orm(current_user)

@router.get("/plans", response_model=List[PlanResponse])
async def get_user_plans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all plans for current user (creator or member)"""
    
    from models import PlanMember
    
    # Get plans where user is creator or member
    member_plan_ids = db.query(PlanMember.plan_id).filter(
        PlanMember.user_id == current_user.id,
        PlanMember.state == "active"
    ).subquery()
    
    plans = db.query(Plan).filter(
        (Plan.created_by == current_user.id) |
        (Plan.id.in_(member_plan_ids))
    ).order_by(Plan.created_at.desc()).all()
    
    return [PlanResponse.from_orm(plan) for plan in plans]

@router.get("/stats", response_model=dict)
async def get_user_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user statistics"""
    
    from models import PlanMember, Transaction
    from sqlalchemy import func
    
    # Count active plans
    member_plan_ids = db.query(PlanMember.plan_id).filter(
        PlanMember.user_id == current_user.id,
        PlanMember.state == "active"
    ).subquery()
    
    active_plans_count = db.query(Plan).filter(
        ((Plan.created_by == current_user.id) |
         (Plan.id.in_(member_plan_ids))) &
        (Plan.status == "active")
    ).count()
    
    # Calculate total savings (mock calculation)
    total_transactions = db.query(func.sum(Transaction.amount)).filter(
        Transaction.plan_id.in_(member_plan_ids),
        Transaction.status == "completed"
    ).scalar() or 0
    
    # Mock savings calculation (assume 15% savings on group purchases)
    estimated_savings = float(total_transactions) * 0.15
    
    return {
        "active_plans": active_plans_count,
        "total_savings": round(estimated_savings, 2),
        "total_transactions": float(total_transactions),
        "member_since": current_user.created_at.isoformat()
    }
