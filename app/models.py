from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    jobs: Mapped[list["JobPost"]] = relationship(back_populates="creator")


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(120))
    profile_details: Mapped[dict] = mapped_column(JSON, default=dict)
    resume_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    applications: Mapped[list["JobApplication"]] = relationship(back_populates="candidate")


class JobPost(Base):
    __tablename__ = "job_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    assessment_number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    creator_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id"))

    employer_details: Mapped[dict] = mapped_column(JSON, default=dict)
    job_details: Mapped[dict] = mapped_column(JSON, default=dict)
    salary_details: Mapped[dict] = mapped_column(JSON, default=dict)
    candidate_profile: Mapped[dict] = mapped_column(JSON, default=dict)
    experience_requirement: Mapped[dict] = mapped_column(JSON, default=dict)
    education_requirements: Mapped[list] = mapped_column(JSON, default=list)
    skills_requirement: Mapped[dict] = mapped_column(JSON, default=dict)
    custom_questions: Mapped[list] = mapped_column(JSON, default=list)
    recruiter_instructions: Mapped[str] = mapped_column(Text, default="")
    application_mode: Mapped[str] = mapped_column(String(120), default="")
    photos: Mapped[dict] = mapped_column(JSON, default=dict)
    assessment_config: Mapped[dict] = mapped_column(JSON, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    creator: Mapped[AdminUser] = relationship(back_populates="jobs")
    applications: Mapped[list["JobApplication"]] = relationship(back_populates="job_post")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"))
    job_post_id: Mapped[int] = mapped_column(ForeignKey("job_posts.id"))
    status: Mapped[str] = mapped_column(String(30), default="applied")  # applied, assessment_sent, assessment_completed, rejected, accepted
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    candidate: Mapped[Candidate] = relationship(back_populates="applications")
    job_post: Mapped[JobPost] = relationship(back_populates="applications")
    assessment_attempt: Mapped["AssessmentAttempt"] = relationship(back_populates="application", uselist=False)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("job_applications.id"))
    
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    warnings_count: Mapped[int] = mapped_column(Integer, default=0)
    score_details: Mapped[dict] = mapped_column(JSON, default=dict)
    proctor_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    
    status: Mapped[str] = mapped_column(String(30), default="pending")  # pending, in_progress, submitted, evaluated
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    application: Mapped[JobApplication] = relationship(back_populates="assessment_attempt")
