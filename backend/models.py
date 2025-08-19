from sqlalchemy import Column, String, Decimal, DateTime, Text, Boolean, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, validator
from decimal import Decimal as PyDecimal

Base = declarative_base()

# SQLAlchemy Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    phone = Column(String(15), unique=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    created_plans = relationship("Plan", back_populates="creator")
    plan_memberships = relationship("PlanMember", back_populates="user")
    vouchers = relationship("Voucher", back_populates="member")
    mandates = relationship("Mandate", back_populates="member")

class Campus(Base):
    __tablename__ = "campuses"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=False)
    
    # Relationships
    merchants = relationship("Merchant", back_populates="campus")

class Merchant(Base):
    __tablename__ = "merchants"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    campus_id = Column(String, ForeignKey("campuses.id"))
    icon = Column(String, nullable=True)
    location = Column(String, nullable=True)
    
    # Relationships
    campus = relationship("Campus", back_populates="merchants")
    transactions = relationship("Transaction", back_populates="merchant")

class Plan(Base):
    __tablename__ = "plans"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    cap_per_head = Column(Decimal(10, 2), nullable=False)
    window_start = Column(DateTime, nullable=False)
    window_end = Column(DateTime, nullable=False)
    merchant_whitelist = Column(JSON, default=list)
    status = Column(String, default="active")  # active, completed, cancelled
    created_by = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    creator = relationship("User", back_populates="created_plans")
    members = relationship("PlanMember", back_populates="plan")
    vouchers = relationship("Voucher", back_populates="plan")
    mandates = relationship("Mandate", back_populates="plan")
    transactions = relationship("Transaction", back_populates="plan")

class PlanMember(Base):
    __tablename__ = "plan_members"
    
    id = Column(String, primary_key=True)
    plan_id = Column(String, ForeignKey("plans.id"))
    user_id = Column(String, ForeignKey("users.id"))
    state = Column(String, default="active")  # active, left, removed
    joined_at = Column(DateTime, default=func.now())
    
    # Relationships
    plan = relationship("Plan", back_populates="members")
    user = relationship("User", back_populates="plan_memberships")

class Voucher(Base):
    __tablename__ = "vouchers"
    
    id = Column(String, primary_key=True)
    plan_id = Column(String, ForeignKey("plans.id"))
    member_user_id = Column(String, ForeignKey("users.id"))
    amount = Column(Decimal(10, 2), nullable=False)
    merchant_list = Column(JSON, default=list)
    expires_at = Column(DateTime, nullable=False)
    state = Column(String, default="active")  # active, redeemed, expired
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    plan = relationship("Plan", back_populates="vouchers")
    member = relationship("User", back_populates="vouchers")
    redemptions = relationship("VoucherRedemption", back_populates="voucher")

class Mandate(Base):
    __tablename__ = "mandates"
    
    id = Column(String, primary_key=True)
    plan_id = Column(String, ForeignKey("plans.id"))
    member_user_id = Column(String, ForeignKey("users.id"))
    cap_amount = Column(Decimal(10, 2), nullable=False)
    valid_from = Column(DateTime, nullable=False)
    valid_to = Column(DateTime, nullable=False)
    state = Column(String, default="active")  # active, expired, cancelled
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    plan = relationship("Plan", back_populates="mandates")
    member = relationship("User", back_populates="mandates")
    executions = relationship("MandateExecution", back_populates="mandate")

class VoucherRedemption(Base):
    __tablename__ = "voucher_redemptions"
    
    id = Column(String, primary_key=True)
    voucher_id = Column(String, ForeignKey("vouchers.id"))
    amount = Column(Decimal(10, 2), nullable=False)
    merchant_id = Column(String, ForeignKey("merchants.id"))
    transaction_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    voucher = relationship("Voucher", back_populates="redemptions")

class MandateExecution(Base):
    __tablename__ = "mandate_executions"
    
    id = Column(String, primary_key=True)
    mandate_id = Column(String, ForeignKey("mandates.id"))
    amount = Column(Decimal(10, 2), nullable=False)
    merchant_id = Column(String, ForeignKey("merchants.id"))
    transaction_id = Column(String, nullable=True)
    status = Column(String, nullable=False)  # success, failed
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    mandate = relationship("Mandate", back_populates="executions")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(String, primary_key=True)
    intent_id = Column(String, unique=True, nullable=False)
    plan_id = Column(String, ForeignKey("plans.id"))
    merchant_id = Column(String, ForeignKey("merchants.id"))
    amount = Column(Decimal(10, 2), nullable=False)
    mode = Column(String, nullable=False)  # vouchers, mandates, split_later
    status = Column(String, default="pending")  # pending, completed, failed
    rrn_stub = Column(String, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    plan = relationship("Plan", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")
    ledger_entries = relationship("LedgerEntry", back_populates="transaction")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    
    id = Column(String, primary_key=True)
    txn_id = Column(String, ForeignKey("transactions.id"))
    account = Column(String, nullable=False)
    leg = Column(String, nullable=False)  # debit, credit
    amount = Column(Decimal(10, 2), nullable=False)
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="ledger_entries")

class IdempotentRequest(Base):
    __tablename__ = "idempotent_requests"
    
    id = Column(String, primary_key=True)
    idempotency_key = Column(String, unique=True, nullable=False)
    response_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())

# Pydantic Models for API
class UserBase(BaseModel):
    phone: str
    name: str
    email: Optional[str] = None
    avatar: Optional[str] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PlanBase(BaseModel):
    name: str
    cap_per_head: PyDecimal
    window_start: datetime
    window_end: datetime
    merchant_whitelist: List[str] = []
    
class PlanCreate(PlanBase):
    member_ids: List[str] = []

class PlanResponse(PlanBase):
    id: str
    status: str
    created_by: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class VoucherBase(BaseModel):
    plan_id: str
    member_user_ids: List[str]
    amount: PyDecimal
    merchant_list: List[str] = []
    expires_at: datetime

class VoucherCreate(VoucherBase):
    pass

class VoucherResponse(BaseModel):
    id: str
    plan_id: str
    member_user_id: str
    amount: PyDecimal
    merchant_list: List[str]
    expires_at: datetime
    state: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class MandateBase(BaseModel):
    plan_id: str
    member_user_ids: List[str]
    cap_amount: PyDecimal
    valid_from: datetime
    valid_to: datetime

class MandateCreate(MandateBase):
    pass

class MandateResponse(BaseModel):
    id: str
    plan_id: str
    member_user_id: str
    cap_amount: PyDecimal
    valid_from: datetime
    valid_to: datetime
    state: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class PaymentIntentCreate(BaseModel):
    amount: PyDecimal
    merchant_id: str
    plan_id: str
    mode: str  # vouchers, mandates, split_later

class PaymentConfirm(BaseModel):
    intent_id: str
    status: str
    rrn_stub: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    intent_id: str
    plan_id: str
    merchant_id: str
    amount: PyDecimal
    mode: str
    status: str
    rrn_stub: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True

class MerchantResponse(BaseModel):
    id: str
    name: str
    category: str
    campus_id: Optional[str]
    icon: Optional[str]
    location: Optional[str]
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    phone: str

class LoginResponse(BaseModel):
    token: str
    user: UserResponse
