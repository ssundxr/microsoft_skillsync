from __future__ import annotations

import json
import os

import asyncio
import google.generativeai as genai

from ..models import JobPost


def resolve_gemini_model() -> str:
  preferred = os.getenv("GEMINI_MODEL", "").strip()
  candidates = [
    preferred,
    "gemini-3.1-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ]

  models = list(genai.list_models())
  supported = []
  for model in models:
    methods = set(getattr(model, "supported_generation_methods", []) or [])
    if "generateContent" not in methods:
      continue
    name = getattr(model, "name", "")
    if not name:
      continue
    supported.append(name.removeprefix("models/"))

  for candidate in candidates:
    if candidate and candidate in supported:
      return candidate

  if supported:
    return supported[0]

  raise ValueError("No Gemini models available for generateContent with this API key.")


def is_unavailable_model_error(exc: Exception) -> bool:
  message = str(exc).lower()
  return (
    "not found" in message
    or "no longer available" in message
    or "not supported for generatecontent" in message
  )


def extract_first_json_object(text: str) -> str:
  start = text.find("{")
  if start == -1:
    raise ValueError("No JSON object found in Gemini response.")

  in_string = False
  escaped = False
  depth = 0
  end = -1

  for idx, ch in enumerate(text[start:], start=start):
    if in_string:
      if escaped:
        escaped = False
      elif ch == "\\":
        escaped = True
      elif ch == '"':
        in_string = False
      continue

    if ch == '"':
      in_string = True
    elif ch == "{":
      depth += 1
    elif ch == "}":
      depth -= 1
      if depth == 0:
        end = idx + 1
        break

  if end == -1:
    raise ValueError("Incomplete JSON object in Gemini response.")

  return text[start:end]


def parse_gemini_json(raw_text: str) -> dict:
  raw = raw_text.strip()
  if raw.startswith("```"):
    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

  try:
    return json.loads(raw)
  except json.JSONDecodeError:
    extracted = extract_first_json_object(raw)
    return json.loads(extracted)


def build_prompt(job: JobPost, assessment_config: dict) -> str:
    details = job.job_details or {}
    skills = job.skills_requirement or {}
    experience = job.experience_requirement or {}

    goals_map = {
        "preliminary_screening": "Preliminary Screening",
        "skills_validation": "Skills Validation",
        "job_eligibility_review": "Job Eligibility Review",
        "pre_interview_case_study": "Pre-Interview / Case Study",
    }
    competencies_map = {
        "functional_role_specific": "Functional / Role-Specific Skills",
        "problem_solving": "Problem Solving & Cognitive",
        "role_based_knowledge": "Role-Based Knowledge",
        "leadership_decision_making": "Leadership & Decision Making",
        "compliance_industry_knowledge": "Compliance & Industry Knowledge",
        "cultural_fit": "Cultural Fit",
        "behavioural_soft_skills": "Behavioural & Soft Skills",
        "communication_skills": "Communication Skills",
    }

    goals_str = ", ".join(goals_map.get(g, g) for g in assessment_config.get("goals", []))
    competencies_str = ", ".join(competencies_map.get(c, c) for c in assessment_config.get("competencies", []))
    functional_skills = ", ".join(skills.get("functional_skills", [])) or "N/A"
    professional_skills = ", ".join(skills.get("professional_skills", [])) or "N/A"
    it_skills = ", ".join(skills.get("it_skills", [])) or "N/A"
    gen_exp = experience.get("work_experience_years", {})
    gcc_exp = experience.get("gcc_experience_years", {})

    question_plan = assessment_config.get("question_plan", [])
    plan_str = "\n".join(
        f"  - {item.get('label', item.get('key'))}: {item.get('count', 0)} questions, "
        f"{item.get('minutes_per_question', 0)} min each, weight {item.get('weight', 0)}%"
        for item in question_plan
    )

    return f"""You are an expert HR Assessment Designer for SkillSync, a professional recruitment platform.
Generate a comprehensive, role-specific candidate assessment.

JOB TITLE: {details.get("job_title", "N/A")}
INDUSTRY: {details.get("industry", "N/A")}
FUNCTIONAL AREA: {details.get("functional_area", "N/A")}

ROLES & RESPONSIBILITIES:
{details.get("roles_and_responsibilities") or "Not specified"}

DESIRED CANDIDATE PROFILE:
{details.get("desired_candidate_profile") or "Not specified"}

SKILLS: Functional: {functional_skills} | Professional: {professional_skills} | IT: {it_skills}
EXPERIENCE: General {gen_exp.get("min", 0)}-{gen_exp.get("max", 0)} yrs | GCC {gcc_exp.get("min", 0)}-{gcc_exp.get("max", 0)} yrs

ASSESSMENT GOALS: {goals_str or "Skills Validation"}
DIFFICULTY: {assessment_config.get("difficulty", "Intermediate")}
COMPETENCIES: {competencies_str or "Functional / Role-Specific Skills"}

QUESTION BLUEPRINT:
{plan_str or "  - MCQ: 10 questions, 2 min each, weight 40%"}

RECRUITER INSTRUCTIONS: {job.recruiter_instructions or "None"}

Return ONLY a valid JSON object (no markdown) with this structure:
{{
  "assessment_name": "string",
  "assessment_number": "{job.assessment_number}",
  "job_number": "{job.job_number}",
  "difficulty": "string",
  "total_questions": 0,
  "estimated_duration_minutes": 0,
  "sections": [
    {{
      "type": "mcq|yes_no|descriptive|case_study",
      "label": "string",
      "weight_percent": 0,
      "questions": [
        {{
          "id": 1,
          "question": "string",
          "competency": "string",
          "difficulty": "Basic|Intermediate|Advanced",
          "time_minutes": 0,
          "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
          "correct_answer": "A",
          "model_answer": "string"
        }}
      ]
    }}
  ]
}}
Notes: options+correct_answer only for mcq/yes_no. model_answer only for descriptive/case_study.
Generate EXACTLY the count from the blueprint. Questions must be role-specific."""


async def generate_assessment(job: JobPost, assessment_config: dict) -> dict:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    genai.configure(api_key=api_key)
    model_name = resolve_gemini_model()
    prompt = build_prompt(job, assessment_config)
    generation_config = genai.GenerationConfig(
      temperature=0.2,
      max_output_tokens=8192,
      response_mime_type="application/json",
    )

    model_candidates = [model_name, "gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash-latest"]
    # Keep candidate order while removing duplicates/empties.
    model_candidates = [m for i, m in enumerate(model_candidates) if m and m not in model_candidates[:i]]

    last_exc: Exception | None = None
    chosen_model = model_name
    response = None
    for candidate in model_candidates:
      try:
        chosen_model = candidate
        model = genai.GenerativeModel(candidate)
        response = await asyncio.to_thread(
          model.generate_content,
          prompt,
          generation_config=generation_config,
        )
        break
      except Exception as exc:  # pragma: no cover - depends on external API
        last_exc = exc
        if is_unavailable_model_error(exc):
          continue
        raise

    if response is None:
      raise ValueError(f"No usable Gemini model found. Last error: {last_exc}")

    raw = (response.text or "").strip()
    if not raw:
      raise ValueError("Gemini returned an empty response.")

    try:
      generated = parse_gemini_json(raw)
    except Exception:
      # One retry with a stricter instruction to recover from malformed JSON.
      strict_prompt = (
        prompt
        + "\n\nIMPORTANT: Return ONLY strict JSON. Use double quotes for all keys/strings,"
        + " no markdown fences, no comments, and no trailing commas."
      )
      retry = await asyncio.to_thread(
        genai.GenerativeModel(chosen_model).generate_content,
        strict_prompt,
        generation_config=generation_config,
      )
      retry_raw = (retry.text or "").strip()
      generated = parse_gemini_json(retry_raw)

    return {
        "prompt": prompt,
      "generated_assessment": generated,
      "model": chosen_model,
    }
