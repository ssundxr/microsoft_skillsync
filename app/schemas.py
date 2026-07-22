from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict[str, Any]


class EmployerDetails(BaseModel):
    type_of_company: str | None = None
    company_name: str | None = None
    publish_this_job: bool = False
    expiry_date: date | None = None


class JobDetails(BaseModel):
    job_title: str
    job_type: str | None = None
    job_location_type: str | None = None
    industry: str | None = None
    sub_industry: str | None = None
    functional_area: str | None = None
    designation: str | None = None
    roles_and_responsibilities: str | None = None
    desired_candidate_profile: str | None = None
    keywords: list[str] = Field(default_factory=list)
    number_of_vacancies: int = 1
    country: str | None = None
    state: str | None = None
    city: str | None = None


class SalaryDetails(BaseModel):
    currency: str | None = None
    minimum_salary: float | None = None
    maximum_salary: float | None = None
    hide_salary_from_job_seekers: bool = False
    other_benefits: str | None = None


class AgeRange(BaseModel):
    min: int | None = None
    max: int | None = None


class CandidateProfile(BaseModel):
    gender: str | None = None
    age_range: AgeRange = Field(default_factory=AgeRange)
    nationality: str | None = None
    preferred_countries: list[str] = Field(default_factory=list)
    preferred_states: list[str] = Field(default_factory=list)
    preferred_cities: list[str] = Field(default_factory=list)
    languages_known: list[str] = Field(default_factory=list)
    driving_license: str | None = None
    availability: str | None = None
    visa_status: str | None = None


class ExperienceRange(BaseModel):
    min: float | None = None
    max: float | None = None


class ExperienceRequirement(BaseModel):
    industry: str | None = None
    sub_industry: str | None = None
    work_experience_years: ExperienceRange = Field(default_factory=ExperienceRange)
    gcc_experience_years: ExperienceRange = Field(default_factory=ExperienceRange)


class EducationRequirement(BaseModel):
    qualifications: list[str] = Field(default_factory=list)
    mandatory: bool = False
    course: str | None = None
    specialization: str | None = None


class SkillsRequirement(BaseModel):
    functional_skills: list[str] = Field(default_factory=list)
    professional_skills: list[str] = Field(default_factory=list)
    it_skills: list[str] = Field(default_factory=list)


class QuestionPlanItem(BaseModel):
    key: str
    label: str
    count: int
    minutes_per_question: float
    weight: float


class AssessmentConfig(BaseModel):
    assessment_name: str | None = None
    screening_fields: list[str] = Field(default_factory=list)
    knowledge_sources: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    difficulty: str | None = None
    competencies: list[str] = Field(default_factory=list)
    delivery_rules: list[str] = Field(default_factory=list)
    question_plan: list[QuestionPlanItem] = Field(default_factory=list)
    generated_assessment: dict[str, Any] | None = None
    generated_model: str | None = None
    generated_at: datetime | None = None


class AssessmentConfigUpdate(BaseModel):
    assessment_name: str | None = None
    screening_fields: list[str] = Field(default_factory=list)
    knowledge_sources: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    difficulty: str | None = None
    competencies: list[str] = Field(default_factory=list)
    delivery_rules: list[str] = Field(default_factory=list)
    question_plan: list[QuestionPlanItem] = Field(default_factory=list)
    recruiter_instructions: str | None = None
    generated_assessment: dict[str, Any] | None = None
    generated_model: str | None = None
    generated_at: datetime | None = None


class JobCreate(BaseModel):
    status: str = "draft"
    employer_details: EmployerDetails
    job_details: JobDetails
    salary_details: SalaryDetails
    candidate_profile: CandidateProfile
    experience_requirement: ExperienceRequirement
    education_requirements: list[EducationRequirement] = Field(default_factory=list)
    skills_requirement: SkillsRequirement
    custom_questions: list[str] = Field(default_factory=list)
    recruiter_instructions: str | None = ""
    application_mode: str | None = ""
    assessment_config: AssessmentConfig = Field(default_factory=AssessmentConfig)


class MediaAsset(BaseModel):
    original_name: str
    stored_name: str
    content_type: str
    url: str


class Photos(BaseModel):
    company_logo: MediaAsset | None = None
    job_gallery: list[MediaAsset] = Field(default_factory=list)


class JobResponse(BaseModel):
    id: int
    job_number: str
    assessment_number: str
    status: str
    employer_details: EmployerDetails
    job_details: JobDetails
    salary_details: SalaryDetails
    candidate_profile: CandidateProfile
    experience_requirement: ExperienceRequirement
    education_requirements: list[EducationRequirement]
    skills_requirement: SkillsRequirement
    custom_questions: list[str]
    recruiter_instructions: str
    application_mode: str
    photos: Photos
    assessment_config: AssessmentConfig
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateRegister(BaseModel):
    email: str
    password: str
    display_name: str


class CandidateLogin(BaseModel):
    email: str
    password: str


class CandidateResponse(BaseModel):
    id: int
    email: str
    display_name: str
    profile_details: dict[str, Any] | None = None
    resume_url: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobApplicationCreate(BaseModel):
    job_post_id: int


class AssessmentAttemptResponse(BaseModel):
    id: int
    status: str
    warnings_count: int
    answers: dict[str, Any]
    score_details: dict[str, Any]
    created_at: datetime
    completed_at: datetime | None

    class Config:
        from_attributes = True


class JobApplicationResponse(BaseModel):
    id: int
    job_post_id: int
    status: str
    created_at: datetime
    candidate: CandidateResponse | None = None
    assessment_attempt: AssessmentAttemptResponse | None = None

    class Config:
        from_attributes = True


class AssessmentSubmit(BaseModel):
    answers: dict[str, Any]
    warnings_count: int

class VerifyProctorCode(BaseModel):
    code: str
