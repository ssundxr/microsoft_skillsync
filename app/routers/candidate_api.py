from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..auth import require_candidate_api
from ..database import get_db
from ..models import Candidate, JobPost, JobApplication, AssessmentAttempt
from ..schemas import JobResponse, JobApplicationCreate, JobApplicationResponse, AssessmentAttemptResponse, AssessmentSubmit
from ..services.evaluator_service import EvaluatorService

router = APIRouter(prefix="/api/candidate", tags=["candidate_api"])

@router.get("/jobs", response_model=dict[str, list[JobResponse]])
def list_available_jobs(db: Session = Depends(get_db)):
    """List published jobs for candidates to apply directly."""
    # Assume status 'published' or any jobs not draft
    jobs = db.scalars(select(JobPost).where(JobPost.status != "draft").order_by(JobPost.created_at.desc())).all()
    return {"items": [JobResponse.model_validate(job) for job in jobs]}

@router.get("/applications", response_model=dict[str, list[JobApplicationResponse]])
def list_my_applications(candidate: Candidate = Depends(require_candidate_api), db: Session = Depends(get_db)):
    applications = db.scalars(select(JobApplication).where(JobApplication.candidate_id == candidate.id).order_by(JobApplication.created_at.desc())).all()
    # Need to load relationships if necessary, sqlalchemy will lazy load for the response model
    return {"items": [JobApplicationResponse.model_validate(app) for app in applications]}

@router.post("/applications", status_code=201, response_model=JobApplicationResponse)
def apply_for_job(body: JobApplicationCreate, candidate: Candidate = Depends(require_candidate_api), db: Session = Depends(get_db)):
    job = db.get(JobPost, body.job_post_id)
    if not job or job.status == "draft":
        raise HTTPException(status_code=404, detail="Job not found or not open.")
        
    existing = db.scalar(select(JobApplication).where(
        JobApplication.candidate_id == candidate.id,
        JobApplication.job_post_id == job.id
    ))
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied for this job.")
        
    app = JobApplication(
        candidate_id=candidate.id,
        job_post_id=job.id,
        status="applied"
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return JobApplicationResponse.model_validate(app)

@router.get("/assessments/{attempt_id}")
def get_assessment(attempt_id: int, candidate: Candidate = Depends(require_candidate_api), db: Session = Depends(get_db)):
    attempt = db.get(AssessmentAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Assessment not found.")
    
    application = attempt.application
    if application.candidate_id != candidate.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    if attempt.status == "evaluated" or attempt.status == "submitted":
         raise HTTPException(status_code=400, detail="Assessment already submitted.")
    
    job = application.job_post
    if not job.assessment_config or "generated_assessment" not in job.assessment_config:
         raise HTTPException(status_code=400, detail="Assessment data is missing.")
         
    # If pending, don't return the questions yet.
    if attempt.status == "pending":
        return {
            "job_title": job.job_details.get("job_title", ""),
            "assessment": None,
            "attempt": AssessmentAttemptResponse.model_validate(attempt)
        }
         
    assessment_data = job.assessment_config["generated_assessment"]
    return {
        "job_title": job.job_details.get("job_title", ""),
        "assessment": assessment_data,
        "attempt": AssessmentAttemptResponse.model_validate(attempt)
    }

from ..schemas import VerifyProctorCode

@router.post("/assessments/{attempt_id}/verify-code")
def verify_code(attempt_id: int, body: VerifyProctorCode, candidate: Candidate = Depends(require_candidate_api), db: Session = Depends(get_db)):
    attempt = db.get(AssessmentAttempt, attempt_id)
    if not attempt or attempt.application.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Assessment not found.")
        
    if attempt.proctor_code and attempt.proctor_code != body.code:
        raise HTTPException(status_code=400, detail="Invalid Proctor Code.")
        
    if attempt.status == "pending":
        attempt.status = "in_progress"
        db.commit()
        db.refresh(attempt)
        
    job = attempt.application.job_post
    assessment_data = job.assessment_config.get("generated_assessment", {})
    return {
        "job_title": job.job_details.get("job_title", ""),
        "assessment": assessment_data,
        "attempt": AssessmentAttemptResponse.model_validate(attempt)
    }

@router.post("/assessments/{attempt_id}/submit")
async def submit_assessment(attempt_id: int, body: AssessmentSubmit, candidate: Candidate = Depends(require_candidate_api), db: Session = Depends(get_db)):
    attempt = db.get(AssessmentAttempt, attempt_id)
    if not attempt or attempt.application.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Assessment not found.")
        
    if attempt.status in ["submitted", "evaluated"]:
        raise HTTPException(status_code=400, detail="Assessment already completed.")
        
    attempt.answers = body.answers
    attempt.warnings_count = body.warnings_count
    attempt.status = "submitted"
    attempt.completed_at = datetime.now(timezone.utc)
    attempt.application.status = "assessment_completed"
    
    db.commit()
    
    # Trigger Background or Sync Evaluation
    job = attempt.application.job_post
    assessment_data = job.assessment_config.get("generated_assessment", {})
    
    score_details = await EvaluatorService.evaluate(assessment_data, body.answers)
    
    # Save scores
    attempt.score_details = score_details
    attempt.status = "evaluated"
    db.commit()
    db.refresh(attempt)
    
    return {"message": "Assessment submitted and evaluated successfully.", "scores": score_details}


from fastapi import File, UploadFile
from ..services.storage import save_resume_upload

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    candidate: Candidate = Depends(require_candidate_api),
    db: Session = Depends(get_db),
):
    """
    Upload candidate resume to SharePoint CVs library and local storage.
    Updates candidate's resume_url in database.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded.")

    upload_result = await save_resume_upload(file, folder_path="CVs")

    candidate.resume_url = upload_result["resume_url"]
    db.commit()
    db.refresh(candidate)

    return {
        "message": "Resume uploaded successfully to SharePoint.",
        "candidate_id": candidate.id,
        "resume_url": candidate.resume_url,
        "sharepoint_id": upload_result.get("sharepoint_id"),
        "sharepoint_web_url": upload_result.get("sharepoint_web_url"),
    }
