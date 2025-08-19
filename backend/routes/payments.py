from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from models import (
    Transaction, Plan, Merchant, User,
    PaymentIntentCreate, PaymentConfirm, TransactionResponse
)
from database import get_db
from auth import get_current_user
from services.idempotency import store_idempotent_response
from services.ledger import create_ledger_entries
import uuid
import time
import random

router = APIRouter()

@router.post("/intent", response_model=dict)
async def create_payment_intent(
    request: Request,
    intent_data: PaymentIntentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create payment intent"""
    
    # Verify plan and merchant exist
    plan = db.query(Plan).filter(Plan.id == intent_data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    merchant = db.query(Merchant).filter(Merchant.id == intent_data.merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    # Generate unique intent ID
    intent_id = f"intent_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Create transaction record
    transaction = Transaction(
        id=str(uuid.uuid4()),
        intent_id=intent_id,
        plan_id=intent_data.plan_id,
        merchant_id=intent_data.merchant_id,
        amount=intent_data.amount,
        mode=intent_data.mode,
        status="pending"
    )
    
    db.add(transaction)
    db.commit()
    db.refresh(transaction)
    
    # Check for guardrail (simple threshold for demo)
    # In production, this would check against actual plan balances/caps
    guardrail_required = float(intent_data.amount) > 250.0
    
    response_data = {
        "intent_id": intent_id,
        "transaction": TransactionResponse.from_orm(transaction).dict(),
        "guardrail_required": guardrail_required
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.post("/confirm", response_model=dict)
async def confirm_payment(
    request: Request,
    confirm_data: PaymentConfirm,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Confirm payment and update transaction"""
    
    # Find transaction by intent ID
    transaction = db.query(Transaction).filter(
        Transaction.intent_id == confirm_data.intent_id,
        Transaction.status == "pending"
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found or already processed")
    
    # Update transaction
    transaction.status = confirm_data.status
    transaction.rrn_stub = confirm_data.rrn_stub
    
    # Create ledger entries for successful transactions
    if confirm_data.status == "completed":
        create_ledger_entries(
            db=db,
            transaction_id=transaction.id,
            amount=transaction.amount,
            account_debit=f"plan_{transaction.plan_id}",
            account_credit=f"merchant_{transaction.merchant_id}"
        )
    
    db.commit()
    db.refresh(transaction)
    
    response_data = {
        "transaction_id": transaction.id,
        "status": transaction.status,
        "rrn_stub": transaction.rrn_stub
    }
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data)
    
    return response_data

@router.get("/transactions", response_model=list)
async def get_user_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's transaction history"""
    
    # Get transactions from plans where user is creator or member
    from models import PlanMember
    
    member_plan_ids = db.query(PlanMember.plan_id).filter(
        PlanMember.user_id == current_user.id,
        PlanMember.state == "active"
    ).subquery()
    
    transactions = db.query(Transaction).filter(
        Transaction.plan_id.in_(member_plan_ids)
    ).order_by(Transaction.created_at.desc()).limit(50).all()
    
    return [TransactionResponse.from_orm(t).dict() for t in transactions]
