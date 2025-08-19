from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from models import Merchant, MerchantResponse
from database import get_db

router = APIRouter()

@router.get("/", response_model=List[MerchantResponse])
async def get_merchants(
    campus_id: Optional[str] = Query(None, description="Filter by campus ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """Get merchants with optional filtering"""
    
    query = db.query(Merchant)
    
    if campus_id:
        query = query.filter(Merchant.campus_id == campus_id)
    
    if category:
        query = query.filter(Merchant.category == category)
    
    merchants = query.all()
    return [MerchantResponse.from_orm(m) for m in merchants]

@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: str,
    db: Session = Depends(get_db)
):
    """Get merchant by ID"""
    
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(status_code=404, detail="Merchant not found")
    
    return MerchantResponse.from_orm(merchant)

@router.get("/categories/list", response_model=List[str])
async def get_merchant_categories(db: Session = Depends(get_db)):
    """Get all unique merchant categories"""
    
    categories = db.query(Merchant.category).distinct().all()
    return [category[0] for category in categories]
