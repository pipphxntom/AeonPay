from sqlalchemy.orm import Session
from models import LedgerEntry
from decimal import Decimal
import uuid

def create_ledger_entries(
    db: Session,
    transaction_id: str,
    amount: Decimal,
    account_debit: str,
    account_credit: str
):
    """Create double-entry ledger entries for a transaction"""
    
    # Debit entry
    debit_entry = LedgerEntry(
        id=str(uuid.uuid4()),
        txn_id=transaction_id,
        account=account_debit,
        leg="debit",
        amount=amount
    )
    
    # Credit entry
    credit_entry = LedgerEntry(
        id=str(uuid.uuid4()),
        txn_id=transaction_id,
        account=account_credit,
        leg="credit",
        amount=amount
    )
    
    db.add(debit_entry)
    db.add(credit_entry)
    
    return debit_entry, credit_entry

def get_account_balance(db: Session, account: str) -> Decimal:
    """Calculate account balance from ledger entries"""
    
    from sqlalchemy import func
    
    # Sum all credits
    credits = db.query(func.sum(LedgerEntry.amount)).filter(
        LedgerEntry.account == account,
        LedgerEntry.leg == "credit"
    ).scalar() or Decimal('0')
    
    # Sum all debits
    debits = db.query(func.sum(LedgerEntry.amount)).filter(
        LedgerEntry.account == account,
        LedgerEntry.leg == "debit"
    ).scalar() or Decimal('0')
    
    # Balance = Credits - Debits (for asset accounts)
    # For liability accounts, it would be Debits - Credits
    return credits - debits

def verify_ledger_balance(db: Session) -> bool:
    """Verify that the ledger is balanced (total debits = total credits)"""
    
    from sqlalchemy import func
    
    total_debits = db.query(func.sum(LedgerEntry.amount)).filter(
        LedgerEntry.leg == "debit"
    ).scalar() or Decimal('0')
    
    total_credits = db.query(func.sum(LedgerEntry.amount)).filter(
        LedgerEntry.leg == "credit"
    ).scalar() or Decimal('0')
    
    return total_debits == total_credits

def get_transaction_ledger_entries(db: Session, transaction_id: str):
    """Get all ledger entries for a specific transaction"""
    
    return db.query(LedgerEntry).filter(
        LedgerEntry.txn_id == transaction_id
    ).all()
