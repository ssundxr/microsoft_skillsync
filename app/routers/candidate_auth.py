from __future__ import annotations

import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..auth import hash_password, authenticate_candidate, create_candidate_access_token
from ..config import settings
from ..database import get_db
from ..models import Candidate
from ..schemas import CandidateLogin, CandidateRegister, TokenResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/candidate/auth", tags=["candidate_auth"])

# Temporary OTP Store (In-Memory for demonstration purposes, as requested)
OTPS = {}

class OtpRequest(BaseModel):
    email: str
    phone: str | None = None

class OtpVerify(BaseModel):
    email: str
    otp: str
    password: str = "" # Used to register
    display_name: str = "" # Used to register

@router.post("/request-otp")
def request_otp(body: OtpRequest):
    otp = str(random.randint(100000, 999999))
    OTPS[body.email] = otp
    
    from ..services.notification_service import NotificationService
    NotificationService.send_otp(body.email, body.phone, otp)
    
    return {"message": "OTP has been sent to your email and phone."}

@router.post("/register")
def register_candidate(body: CandidateRegister, db: Session = Depends(get_db)):
    existing = db.scalar(select(Candidate).where(Candidate.email == body.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    candidate = Candidate(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    
    token = create_candidate_access_token(candidate.id, settings.secret_key)
    return TokenResponse(
        access_token=token,
        user={"id": candidate.id, "email": candidate.email, "display_name": candidate.display_name, "role": "candidate"}
    )

@router.post("/login", response_model=TokenResponse)
def login_candidate(body: CandidateLogin, db: Session = Depends(get_db)):
    candidate = authenticate_candidate(db, body.email, body.password)
    if not candidate:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
        
    token = create_candidate_access_token(candidate.id, settings.secret_key)
    return TokenResponse(
        access_token=token,
        user={"id": candidate.id, "email": candidate.email, "display_name": candidate.display_name, "role": "candidate"}
    )

class GoogleAuthRequest(BaseModel):
    token: str

@router.post("/google", response_model=TokenResponse)
def google_auth(body: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests
        
        # Verify the token
        client_id = settings.google_client_id
        if not client_id:
            raise HTTPException(status_code=500, detail="Google Client ID not configured.")
            
        idinfo = id_token.verify_oauth2_token(body.token, requests.Request(), client_id)
        email = idinfo.get('email')
        name = idinfo.get('name', 'Google User')
        
        if not email:
            raise ValueError("Email not provided by Google.")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")
        
    candidate = db.scalar(select(Candidate).where(Candidate.email == email))
    
    if not candidate:
        # Create new candidate
        candidate = Candidate(
            email=email,
            password_hash=hash_password(str(random.random())), # random unused password
            display_name=name
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
    access_token = create_candidate_access_token(candidate.id, settings.secret_key)
    return TokenResponse(
        access_token=access_token,
        user={"id": candidate.id, "email": candidate.email, "display_name": candidate.display_name, "role": "candidate"}
    )
