from __future__ import annotations

import json
import os
from pathlib import Path

from fastapi.testclient import TestClient

BASE_DIR = Path(__file__).resolve().parents[1]
TEST_UPLOADS = BASE_DIR / "test_uploads"

os.environ["SECRET_KEY"] = "test-secret"
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)
os.environ["ADMIN_USERNAME"] = "admin"
os.environ["ADMIN_PASSWORD"] = "Admin@123"

from app.main import app  # noqa: E402


def login(client: TestClient) -> None:
    response = client.post(
        "/auth/login",
        data={"username": "admin", "password": "Admin@123"},
        follow_redirects=False,
    )
    assert response.status_code == 303


def sample_payload() -> dict:
    return {
        "status": "published",
        "employer_details": {
            "type_of_company": "Enterprise",
            "company_name": "SkillSync Advisory",
            "publish_this_job": True,
            "expiry_date": "2026-04-28",
        },
        "job_details": {
            "job_title": "Senior FastAPI Engineer",
            "job_type": "Full Time",
            "job_location_type": "Hybrid",
            "industry": "Information Technology",
            "sub_industry": "Software Products",
            "functional_area": "Engineering",
            "designation": "Senior Developer",
            "roles_and_responsibilities": "<p>Build APIs and hiring workflows.</p>",
            "desired_candidate_profile": "<p>Strong backend engineer with hiring domain awareness.</p>",
            "keywords": ["python", "fastapi", "assessment"],
            "number_of_vacancies": 2,
            "country": "United Arab Emirates",
            "state": "Dubai",
            "city": "Dubai",
        },
        "salary_details": {
            "currency": "AED",
            "minimum_salary": 18000,
            "maximum_salary": 24000,
            "hide_salary_from_job_seekers": False,
            "other_benefits": "Medical insurance, annual flights",
        },
        "candidate_profile": {
            "gender": "No Preference",
            "age_range": {"min": 27, "max": 40},
            "nationality": "Indian",
            "preferred_countries": ["United Arab Emirates"],
            "preferred_states": ["Dubai"],
            "preferred_cities": ["Dubai"],
            "languages_known": ["English", "Hindi"],
            "driving_license": "No",
            "availability": "30 Days",
            "visa_status": "Employment Visa",
        },
        "experience_requirement": {
            "industry": "Information Technology",
            "sub_industry": "Software Products",
            "work_experience_years": {"min": 5, "max": 9},
            "gcc_experience_years": {"min": 2, "max": 5},
        },
        "education_requirements": [
            {
                "qualifications": ["Basic", "Masters"],
                "mandatory": True,
                "course": "Computer Science",
                "specialization": "Artificial Intelligence",
            }
        ],
        "skills_requirement": {
            "functional_skills": ["System Design", "Stakeholder Management"],
            "professional_skills": ["Communication", "Leadership"],
            "it_skills": ["Python", "FastAPI", "SQL"],
        },
        "custom_questions": [
            "How many years of FastAPI experience do you have?",
            "Have you designed assessments or screening workflows before?",
        ],
        "recruiter_instructions": "<p>Prioritize candidates with platform delivery experience.</p>",
        "application_mode": "Internal Portal",
        "assessment_config": {
            "assessment_name": "Senior FastAPI Engineer Assessment",
            "screening_fields": ["salary_current_expected", "job_location_relocation"],
            "knowledge_sources": ["job_title", "industry", "roles_responsibilities", "it_skills"],
            "goals": ["skills_validation", "job_eligibility_review"],
            "difficulty": "Advanced",
            "competencies": ["functional_role_specific", "problem_solving", "communication_skills"],
            "delivery_rules": ["random_mix", "adaptive_difficulty"],
            "question_plan": [
                {"key": "mcq", "label": "MCQ", "count": 10, "minutes_per_question": 2, "weight": 30},
                {"key": "yes_no", "label": "Yes / No", "count": 5, "minutes_per_question": 1, "weight": 10},
                {"key": "descriptive", "label": "Descriptive", "count": 4, "minutes_per_question": 5, "weight": 40},
                {"key": "case_study", "label": "Case Study", "count": 3, "minutes_per_question": 15, "weight": 20},
            ],
        },
    }


def test_login_page_loads() -> None:
    with TestClient(app) as client:
        response = client.get("/login")
        assert response.status_code == 200
        assert ("Admin Login" in response.text or "id=\"root\"" in response.text or "<div id=" in response.text)



def test_create_job_returns_assessment_payload() -> None:
    with TestClient(app) as client:
        login(client)
        response = client.post(
            "/api/jobs",
            data={"payload": json.dumps(sample_payload())},
            files=[
                ("company_logo", ("logo.png", b"fake-image", "image/png")),
                ("job_photos", ("office.png", b"fake-image", "image/png")),
            ],
        )

        assert response.status_code == 201
        body = response.json()
        assert body["job"]["job_number"].startswith("JOB")
        assert body["job"]["assessment_number"].startswith("ASM")
        assert body["assessment_payload"]["assessment_request"]["job_posting"]["job_details"]["job_title"] == "Senior FastAPI Engineer"
        assert body["assessment_payload"]["assessment_request"]["assessment_blueprint"]["totals"]["question_count"] == 22
