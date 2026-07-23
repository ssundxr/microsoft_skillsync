from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..auth import require_admin_api
from ..database import get_db
from ..models import AdminUser, JobPost
from ..schemas import AssessmentConfigUpdate, JobCreate, JobResponse, MediaAsset, Photos
from ..services.job_service import JobService
from ..services.payload_builder import build_assessment_payload
from ..services.reference_data import DEFAULT_ASSESSMENT_CONFIG, REFERENCE_DATA
from ..services.storage import save_upload

router = APIRouter(prefix="/api", tags=["api"])


@router.get("/reference-data")
def get_reference_data(_: AdminUser = Depends(require_admin_api)):
    return {"reference_data": REFERENCE_DATA, "defaults": DEFAULT_ASSESSMENT_CONFIG}


@router.get("/jobs", response_model=dict[str, list[JobResponse]])
def list_jobs(db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    jobs = JobService.list_jobs(db)
    return {"items": [JobResponse.model_validate(job) for job in jobs]}


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: str = Form(...),
    company_logo: UploadFile | None = File(default=None),
    job_photos: list[UploadFile] | None = File(default=None),
    db: Session = Depends(get_db),
    admin: AdminUser = Depends(require_admin_api),
):
    try:
        data_dict = json.loads(payload)
        job_data = JobCreate.model_validate(data_dict)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid payload: {exc}") from exc

    logo_dict = save_upload(company_logo)
    logo_asset = MediaAsset(**logo_dict) if logo_dict else None
    gallery_assets = []
    for file in (job_photos or []):
        if file and file.filename:
            asset_dict = save_upload(file)
            if asset_dict:
                gallery_assets.append(MediaAsset(**asset_dict))

    photos = Photos(company_logo=logo_asset, job_gallery=gallery_assets)
    job = JobService.create_job(db, admin, job_data, photos)

    return {
        "message": "Job created successfully.",
        "job": JobResponse.model_validate(job),
        "assessment_payload": build_assessment_payload(job),
    }


@router.get("/jobs/{job_id}", response_model=dict[str, JobResponse])
def get_job(job_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    job = JobService.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return {"job": JobResponse.model_validate(job)}


@router.put("/jobs/{job_id}/assessment")
def update_assessment(
    job_id: int,
    config: AssessmentConfigUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_api),
):
    """Save assessment configuration for a job."""
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    if config.recruiter_instructions is not None:
        job.recruiter_instructions = config.recruiter_instructions
    config_data = config.model_dump(mode="json", exclude={"recruiter_instructions"}, exclude_unset=True)
    current = dict(job.assessment_config or {})
    current.update(config_data)
    job.assessment_config = current
    db.commit()
    db.refresh(job)
    return {"message": "Assessment config saved.", "job": JobResponse.model_validate(job)}

from pydantic import BaseModel
class JobStatusUpdate(BaseModel):
    status: str

@router.put("/jobs/{job_id}/status")
def update_job_status(
    job_id: int,
    payload: JobStatusUpdate,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_api),
):
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    job.status = payload.status
    db.commit()
    db.refresh(job)
    return {"message": f"Job status updated to {payload.status}.", "job": JobResponse.model_validate(job)}


@router.post("/jobs/{job_id}/generate-assessment")
async def generate_assessment_endpoint(
    job_id: int,
    db: Session = Depends(get_db),
    _: AdminUser = Depends(require_admin_api),
):
    """Generate assessment questions using Gemini AI."""
    job = db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    try:
        from ..services.gemini_service import generate_assessment
        result = await generate_assessment(job, job.assessment_config or {})
        current = dict(job.assessment_config or {})
        current["generated_assessment"] = result.get("generated_assessment")
        current["generated_model"] = result.get("model")
        current["generated_at"] = datetime.now(timezone.utc).isoformat()
        job.assessment_config = current
        db.commit()
        db.refresh(job)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini generation failed: {str(e)}")


@router.get("/jobs/{job_id}/assessment-payload")
def get_job_payload(job_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    job = JobService.get_job(db, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    return build_assessment_payload(job)


@router.get("/jobs/{job_id}/applications")
def get_job_applications(job_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    from sqlalchemy.orm import joinedload
    from ..models import JobApplication
    stmt = select(JobApplication).options(joinedload(JobApplication.candidate)).where(JobApplication.job_post_id == job_id).order_by(JobApplication.created_at.desc())
    applications = db.scalars(stmt).all()
    from ..schemas import JobApplicationResponse
    return {"items": [JobApplicationResponse.model_validate(app) for app in applications]}


@router.get("/applications/{app_id}")
def get_application(app_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    from sqlalchemy.orm import joinedload
    from ..models import JobApplication
    stmt = select(JobApplication).options(joinedload(JobApplication.candidate)).where(JobApplication.id == app_id)
    app = db.scalar(stmt)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    from ..schemas import JobApplicationResponse
    return {"application": JobApplicationResponse.model_validate(app)}

@router.post("/applications/{app_id}/send-assessment")
def send_assessment(app_id: int, db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    from ..models import JobApplication, AssessmentAttempt
    import random
    import string
    
    app = db.get(JobApplication, app_id)
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    if app.status != "applied":
        raise HTTPException(status_code=400, detail="Assessment can only be sent for 'applied' status.")
        
    proctor_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    attempt = AssessmentAttempt(application_id=app.id, status="pending", proctor_code=proctor_code)
    db.add(attempt)
    
    app.status = "assessment_sent"
    db.commit()
    
    from ..services.notification_service import NotificationService
    job_title = app.job_post.job_details.get("job_title", "SkillSync Assessment")
    NotificationService.send_proctor_code(app.candidate.email, app.candidate.display_name, job_title, proctor_code)
    
    return {"message": "Assessment sent successfully to candidate.", "attempt_id": attempt.id}

@router.get("/recent-proctor-codes")
def get_recent_proctor_codes(db: Session = Depends(get_db), _: AdminUser = Depends(require_admin_api)):
    from ..models import AssessmentAttempt, JobApplication, Candidate, JobPost
    from sqlalchemy.orm import joinedload
    
    stmt = (
        select(AssessmentAttempt)
        .options(
            joinedload(AssessmentAttempt.application)
            .joinedload(JobApplication.candidate),
            joinedload(AssessmentAttempt.application)
            .joinedload(JobApplication.job_post)
        )
        .where(AssessmentAttempt.proctor_code != None)
        .order_by(AssessmentAttempt.created_at.desc())
        .limit(20)
    )
    attempts = db.scalars(stmt).all()
    
    results = []
    for att in attempts:
        results.append({
            "id": att.id,
            "code": att.proctor_code,
            "created_at": att.created_at.isoformat(),
            "status": att.status,
            "candidate_name": att.application.candidate.display_name,
            "candidate_email": att.application.candidate.email,
            "job_title": att.application.job_post.job_details.get("job_title", "Unknown Job")
        })
    
    return {"items": results}


@router.get("/admin/powerbi-token")
async def get_powerbi_token(_: AdminUser = Depends(require_admin_api)):
    """
    Securely returns PowerBI embed token, embed URL, and report ID to authenticated admins.
    Secrets, credentials, and tenant/workspace IDs are NEVER exposed to the frontend.
    """
    from ..services.powerbi_service import get_powerbi_embed_token
    return await get_powerbi_embed_token()

