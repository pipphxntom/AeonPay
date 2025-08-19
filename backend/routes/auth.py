from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from models import User, LoginRequest, LoginResponse, UserCreate, UserResponse
from database import get_db
from auth import create_access_token
from services.idempotency import store_idempotent_response
import uuid

router = APIRouter()

@router.post("/mock_login", response_model=LoginResponse)
async def mock_login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """Mock login with phone number - creates user if doesn't exist"""
    
    # Find or create user
    user = db.query(User).filter(User.phone == login_data.phone).first()
    
    if not user:
        # Create new user
        user_data = UserCreate(
            phone=login_data.phone,
            name=f"User {login_data.phone[-4:]}",
            email=f"user{login_data.phone[-4:]}@example.com"
        )
        
        user = User(
            id=str(uuid.uuid4()),
            phone=user_data.phone,
            name=user_data.name,
            email=user_data.email,
            avatar=user_data.avatar
        )
        
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Create access token
    token = create_access_token(data={"user_id": user.id})
    
    response_data = LoginResponse(
        token=token,
        user=UserResponse.from_orm(user)
    )
    
    # Store idempotent response if key provided
    if hasattr(request.state, 'idempotency_key'):
        store_idempotent_response(request.state.idempotency_key, response_data.dict())
    
    return response_data

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse.from_orm(current_user)
