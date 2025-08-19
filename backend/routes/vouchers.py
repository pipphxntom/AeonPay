from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from models import (
    Voucher, VoucherRedemption, Plan, User,
    VoucherCreate, VoucherResponse
)
from database import get_db
from auth import get_current_user
from services.idempotency import store_idempotent_response
from services.ledger import create_ledger_entries
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/mint", response_model=dict)
async def mint_vouchers(
    request: Request,
    voucher_data: VoucherCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mint vouchers for plan members"""
    
    # Verify plan exists and user has access
    plan = db.query(Plan).filter(Plan.id == voucher_data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    if plan.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only plan creator can mint vouchers")
    
    # Create vouchers for each member
    vouchers = []
    for member_id in voucher_data.member_user_ids:
        # Verify user exists
        user = db.query(User).filter(User.id == member_id).first()
        if not user:
            continue
            
        voucher = Voucher(
            id=str(uuid.uuid4()),
            plan_id=voucher_data.plan_id,
            member_user_id=member_id,
            amount=voucher_data.amount,
            merchant_list=voucher_data.merchant_list,
            expires_at=voucher_data.expires_at,
            state="active"
        )
        
        db.add(voucher)
        vouchers.append(voucher)
    
    db.commit()
    
    # Refresh to get created_at timestamps
    for voucher in vouchers:
        db.refresh(voucher)
    
    response_data = {
        "vouchers": [VoucherResponse.from_orm(v).dict() for v in vouchers]
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.post("/redeem", response_model=dict)
async def redeem_vouchers(
    request: Request,
    redemption_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Redeem vouchers atomically"""
    
    voucher_ids = redemption_data.get("voucher_ids", [])
    amounts = redemption_data.get("amounts", [])
    merchant_id = redemption_data.get("merchant_id")
    
    if len(voucher_ids) != len(amounts):
        raise HTTPException(status_code=400, detail="Voucher IDs and amounts must match")
    
    redeemed = []
    failed = []
    
    for i, voucher_id in enumerate(voucher_ids):
        try:
            voucher = db.query(Voucher).filter(
                Voucher.id == voucher_id,
                Voucher.state == "active"
            ).first()
            
            if not voucher:
                failed.append({"voucher_id": voucher_id, "reason": "Voucher not found or inactive"})
                continue
            
            if voucher.expires_at < datetime.utcnow():
                failed.append({"voucher_id": voucher_id, "reason": "Voucher expired"})
                continue
            
            amount_to_redeem = amounts[i]
            if amount_to_redeem > voucher.amount:
                failed.append({"voucher_id": voucher_id, "reason": "Insufficient voucher balance"})
                continue
            
            # Create redemption record
            redemption = VoucherRedemption(
                id=str(uuid.uuid4()),
                voucher_id=voucher_id,
                amount=amount_to_redeem,
                merchant_id=merchant_id
            )
            db.add(redemption)
            
            # Update voucher balance
            voucher.amount -= amount_to_redeem
            if voucher.amount <= 0:
                voucher.state = "redeemed"
            
            redeemed.append({
                "voucher_id": voucher_id,
                "amount": float(amount_to_redeem),
                "remaining": float(voucher.amount)
            })
            
        except Exception as e:
            failed.append({"voucher_id": voucher_id, "reason": str(e)})
    
    db.commit()
    
    response_data = {
        "result": {
            "redeemed": redeemed,
            "failed": failed,
            "total_redeemed": len(redeemed),
            "total_failed": len(failed)
        }
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.get("/plan/{plan_id}", response_model=List[VoucherResponse])
async def get_plan_vouchers(
    plan_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all vouchers for a plan"""
    
    # Verify user has access to plan
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    vouchers = db.query(Voucher).filter(Voucher.plan_id == plan_id).all()
    return [VoucherResponse.from_orm(v) for v in vouchers]
