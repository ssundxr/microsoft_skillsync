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
