from __future__ import annotations

LOCATION_HIERARCHY = {
    "United Arab Emirates": {
        "Dubai": ["Dubai", "Jumeirah", "Dubai Silicon Oasis"],
        "Abu Dhabi": ["Abu Dhabi", "Al Ain", "Yas Island"],
        "Sharjah": ["Sharjah", "Al Nahda"],
    },
    "Saudi Arabia": {
        "Riyadh": ["Riyadh", "Diriyah"],
        "Makkah": ["Jeddah", "Makkah"],
        "Eastern Province": ["Dammam", "Khobar"],
    },
    "Qatar": {
        "Doha": ["Doha", "Lusail"],
        "Al Rayyan": ["Al Rayyan"],
    },
    "India": {
        "Karnataka": ["Bengaluru", "Mysuru"],
        "Maharashtra": ["Mumbai", "Pune"],
        "Delhi": ["New Delhi"],
    },
}

ALL_STATES = sorted({state for states in LOCATION_HIERARCHY.values() for state in states})
ALL_CITIES = sorted(
    {
        city
        for states in LOCATION_HIERARCHY.values()
        for cities in states.values()
        for city in cities
    }
)

REFERENCE_DATA = {
    "company_types": [
        "Recruitment Agency",
        "Enterprise",
        "Startup",
        "Government Entity",
        "Consulting Firm",
    ],
    "companies": [
        "SkillSync Advisory",
        "TalentBridge Global",
        "BlueOrbit Tech",
        "Nexa Operations",
    ],
    "job_types": ["Full Time", "Contract", "Part Time", "Internship", "Consultant"],
    "job_locations": ["On Site", "Hybrid", "Remote"],
    "industries": [
        "Information Technology",
        "Banking",
        "Healthcare",
        "Retail",
        "Construction",
        "Hospitality",
    ],
    "sub_industries": [
        "Software Products",
        "IT Services",
        "Digital Banking",
        "Retail Operations",
        "Clinical Services",
        "Infrastructure Delivery",
    ],
    "functional_areas": [
        "Engineering",
        "Product Management",
        "Sales",
        "Customer Success",
        "Operations",
        "Finance",
        "Human Resources",
    ],
    "designations": [
        "Software Engineer",
        "Senior Developer",
        "Engineering Manager",
        "Product Analyst",
        "Recruitment Specialist",
        "Operations Executive",
    ],
    "currencies": ["AED", "USD", "INR", "SAR", "QAR"],
    "countries": sorted(LOCATION_HIERARCHY.keys()),
    "states": ALL_STATES,
    "cities": ALL_CITIES,
    "location_hierarchy": LOCATION_HIERARCHY,
    "nationalities": ["Emirati", "Indian", "Saudi", "Qatari", "Filipino", "Egyptian"],
    "languages": ["English", "Arabic", "Hindi", "Tamil", "Urdu", "French"],
    "availability_options": ["Immediate", "15 Days", "30 Days", "60 Days"],
    "visa_statuses": ["Employment Visa", "Visit Visa", "Dependent Visa", "Transferable Visa"],
    "qualifications": ["Basic", "Masters", "Doctorate", "Certification"],
    "courses": [
        "Computer Science",
        "Information Systems",
        "Business Administration",
        "Finance",
        "Human Resources",
    ],
    "specializations": [
        "Artificial Intelligence",
        "Data Analytics",
        "Cybersecurity",
        "Talent Acquisition",
        "Accounting",
    ],
    "functional_skills": [
        "Requirement Gathering",
        "Stakeholder Management",
        "System Design",
        "Candidate Screening",
        "Client Engagement",
    ],
    "professional_skills": [
        "Communication",
        "Presentation",
        "Negotiation",
        "Leadership",
        "Time Management",
    ],
    "it_skills": [
        "Python",
        "FastAPI",
        "SQL",
        "Excel",
        "Power BI",
        "ATS Platforms",
    ],
    "application_modes": ["Internal Portal", "External Link", "Email Apply", "Quick Apply"],
    "screening_fields": [
        {"key": "salary_current_expected", "label": "Salary (Current / Expected)"},
        {"key": "job_location_relocation", "label": "Job Location (Current / Relocation)"},
        {"key": "personal_details", "label": "Availability / Notice / Visa"},
    ],
    "knowledge_sources": [
        {"key": "job_title", "label": "Job Title"},
        {"key": "industry", "label": "Industry"},
        {"key": "functional_area", "label": "Functional Area"},
        {"key": "roles_responsibilities", "label": "Roles & Responsibilities"},
        {"key": "desired_candidate_profile", "label": "Desired Candidate Profile"},
        {"key": "functional_skills", "label": "Functional Skills"},
        {"key": "professional_skills", "label": "Professional Skills"},
        {"key": "it_skills", "label": "IT Skills"},
        {"key": "experience_general", "label": "Experience (General)"},
        {"key": "experience_gcc", "label": "Experience (GCC)"},
    ],
    "assessment_goals": [
        {"key": "preliminary_screening", "label": "Preliminary Screening"},
        {"key": "skills_validation", "label": "Skills Validation"},
        {"key": "job_eligibility_review", "label": "Job Eligibility Review"},
        {"key": "pre_interview_case_study", "label": "Pre-Interview / Case Study"},
    ],
    "difficulties": ["Basic", "Intermediate", "Advanced", "Expert"],
    "competencies": [
        {"key": "functional_role_specific", "label": "Functional / Role-Specific Skills"},
        {"key": "problem_solving", "label": "Problem Solving & Cognitive"},
        {"key": "behavioural_soft_skills", "label": "Behavioural & Soft Skills"},
        {"key": "communication_skills", "label": "Communication Skills"},
        {"key": "compliance_industry_knowledge", "label": "Compliance & Industry Knowledge"},
        {"key": "role_based_knowledge", "label": "Role-Based Knowledge"},
        {"key": "cultural_fit", "label": "Cultural Fit"},
        {"key": "leadership_decision_making", "label": "Leadership & Decision Making"},
    ],
    "delivery_rules": [
        {"key": "random_mix", "label": "Random Mix"},
        {"key": "fixed_sequence", "label": "Fixed Sequence"},
        {"key": "adaptive_difficulty", "label": "Adaptive Difficulty"},
    ],
    "question_types": [
        {"key": "mcq", "label": "MCQ", "default_count": 10, "default_minutes": 2, "default_weight": 30},
        {"key": "yes_no", "label": "Yes / No", "default_count": 5, "default_minutes": 1, "default_weight": 10},
        {"key": "descriptive", "label": "Descriptive", "default_count": 4, "default_minutes": 5, "default_weight": 40},
        {"key": "case_study", "label": "Case Study", "default_count": 3, "default_minutes": 15, "default_weight": 20},
    ],
    "custom_question_limit": 6,
}

DEFAULT_ASSESSMENT_CONFIG = {
    "assessment_name": "Create Assessment",
    "screening_fields": ["salary_current_expected", "job_location_relocation", "personal_details"],
    "knowledge_sources": [
        "job_title",
        "industry",
        "functional_area",
        "roles_responsibilities",
        "desired_candidate_profile",
        "functional_skills",
        "professional_skills",
        "it_skills",
        "experience_general",
        "experience_gcc",
    ],
    "goals": ["skills_validation", "job_eligibility_review"],
    "difficulty": "Advanced",
    "competencies": [
        "functional_role_specific",
        "problem_solving",
        "behavioural_soft_skills",
        "communication_skills",
    ],
    "delivery_rules": ["random_mix", "adaptive_difficulty"],
    "question_plan": REFERENCE_DATA["question_types"],
}
