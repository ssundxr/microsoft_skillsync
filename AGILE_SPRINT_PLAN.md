# Agile Sprint Plan & Ticket Registry - Sprint 1

## 📌 Project Overview
**Project**: Skill Sync - Unified Recruitment Platform  
**Sprint**: Sprint 1 (2-Week Iteration)  
**Goal**: Integrate Admin Analytics/Storage, Implement Mandatory Candidate Profile Gating, Redesign Job Detail Views, and Build Candidate Matching/Scoring Logic.

---

## 🏷️ GitLab Taxonomy & Setup Guide

### 1. Recommended GitLab Labels

| Category | Label Name | Color | Description |
| :--- | :--- | :--- | :--- |
| **Domain** | `domain::admin` | `#5843AD` | Features belonging to Admin/Recruiter Portal |
| | `domain::candidate` | `#4287f5` | Features belonging to Candidate Portal |
| | `domain::scoring` | `#ff9900` | Scoring, matching & algorithm features |
| | `domain::integration` | `#107c41` | External service integrations (PowerBI, SharePoint) |
| **Type** | `type::feature` | `#009966` | New user feature or capability |
| | `type::ui-ux` | `#e11d48` | UI layout, forms, responsive design |
| | `type::backend` | `#333333` | Database, API, services |
| **Status** | `status::backlog` | `#8f909d` | Issue queued for work |
| | `status::in-progress` | `#e2a03f` | Currently being developed |
| | `status::in-review` | `#007acc` | Merge request submitted / code review |
| | `status::done` | `#2e7d32` | Completed and merged into `develop` |

---

### 2. Recommended GitLab Issue Boards

1. **Sprint 1 Kanban Board**:
   - Filter: `Sprint 1`
   - Lists: `status::backlog` ➔ `status::in-progress` ➔ `status::in-review` ➔ `status::done`
2. **Team Workload Board**:
   - Lists by Assignee: `@utsav-18`, `@rahulsantosh2006-glitch`, `@supriyabalakrishna598`, `@Dhanekula_Mounika`, `@shyamsundxr`

---

## 🎫 Ticket Specifications

### Epic 1: Admin Portal Storage & Analytics Integrations

#### 🟢 Ticket #1: PowerBI Dashboard Integration in Admin Portal
- **Assignee**: Rahul (@rahulsantosh2006-glitch)
- **Labels**: `domain::admin`, `domain::integration`, `type::feature`, `priority::high`
- **Description**: 
  Integrate PowerBI embedded reporting dashboard into the Admin Portal (`/admin/dashboard` or new `/admin/analytics` tab).
- **Tasks**:
  1. Set up PowerBI Embedded container component in React frontend.
  2. Implement backend endpoint `/api/admin/powerbi-token` to securely supply embed tokens/URLs.
  3. Ensure responsive layout and error handling if report fails to load.
- **Acceptance Criteria**:
  - [ ] PowerBI dashboard renders seamlessly inside the Admin portal.
  - [ ] Tokens and workspace IDs are retrieved from environment configuration.

---

#### 🟢 Ticket #2: SharePoint Storage Integration for Document Assets
- **Assignee**: Utsav (@utsav-18)
- **Labels**: `domain::admin`, `domain::integration`, `type::backend`, `priority::high`
- **Description**:
  Integrate Microsoft SharePoint API (Graph API) to store recruiter attachments, company assets, and uploaded candidate documents securely in SharePoint drive.
- **Tasks**:
  1. Configure Microsoft Graph API authentication service in backend (`app/services/sharepoint_service.py`).
  2. Build file upload & retrieval endpoints connecting FastAPI to SharePoint storage.
  3. Replace local disk file uploads with SharePoint document library links.
- **Acceptance Criteria**:
  - [ ] Uploaded documents are saved directly to designated SharePoint folder.
  - [ ] Secure download/preview links generated for Admin users.

---

### Epic 2: Candidate Mandatory Profile Completion & Gating Flow

#### 🔵 Ticket #3: Mandatory Candidate Profile Gating Logic
- **Assignee**: Supriya (@supriyabalakrishna598) & Team
- **Labels**: `domain::candidate`, `type::feature`, `priority::high`
- **Description**:
  Enforce mandatory profile completion right after candidate login/registration. Candidates must complete all mandatory sections before being allowed to apply for any job.
- **Tasks**:
  1. Add `is_profile_complete` flag to Candidate DB model & session token.
  2. Create global routing guard in React frontend: redirect uncompleted profiles to `/candidate/complete-profile`.
  3. Disable "Apply Now" button on job pages with a prompt directing candidate to complete their profile.
- **Acceptance Criteria**:
  - [ ] New candidate is automatically redirected to profile form upon first login.
  - [ ] Candidate cannot navigate to job application pages until `is_profile_complete == True`.

---

#### 🔵 Ticket #4: Multi-Section Candidate Profile Form Development
- **Assignee**: Supriya (@supriyabalakrishna598) & Mounika (@Dhanekula_Mounika)
- **Labels**: `domain::candidate`, `type::ui-ux`, `priority::high`
- **Description**:
  Build comprehensive candidate profile completion form matching the multi-section spec screenshots:
  - **Employment Summary**: Total Exp (Yrs/Months), GCC Exp (Yrs/Months), Current Salary, Expected Salary, Notice Period / Availability to Join (Immediately, 15 Days, 1 Month, 2 Month, 3 Month, 6 Month).
  - **Profile Summary**: Rich text summary block.
  - **Current/Latest Employment Details**: Employer Name, Website, Country, State, Industry, Sub Industry, Functional Area, Designation, Monthly Salary, Working Period (From-To), Job Description.
  - **Education Details**: Degree Level (Bachelors/Diploma/School, Masters, Doctorate, Certification), Course, Specialization, University/Institute, Location, Passing Year.
  - **IT Skills & Functional/Professional Skills**: Skill name, Last used year, Experience (Yrs/Months).
  - **Achievements & Awards**: Major achievements, honors.
  - **Personal Details**: First Name, Last Name, Current Location (Country, State), Mobile Number (+code).
- **Tasks**:
  1. Build modular form components in `frontend/src/pages/CandidateProfilePage.jsx`.
  2. Create backend schemas and DB model updates for storing full profile breakdown.
  3. Implement POST/PUT `/api/candidate/profile` save endpoint with validation.
- **Acceptance Criteria**:
  - [ ] Form captures all required fields cleanly with client & server-side validation.
  - [ ] Dynamic "Add" buttons working for multiple Education, Employment, and Skill items.

---

### Epic 3: Standardized Job Details View (Admin & Candidate)

#### 🎨 Ticket #5: Redesign Job Details View (Admin & Candidate Portals)
- **Assignee**: Supriya (@supriyabalakrishna598), Mounika (@Dhanekula_Mounika) & Team
- **Labels**: `domain::admin`, `domain::candidate`, `type::ui-ux`, `priority::medium`
- **Description**:
  Implement the standard Job Details View layout across both Admin and Candidate views according to the 4th reference screenshot.
- **Header & Key Stats**:
  - Job Title, Exp range, Salary range, Location.
  - Education, Nationality, Gender requirement, Vacancies, Required Joining Date, Type of Job (On Site/Remote/Hybrid).
- **Body Sections**:
  - Job Description & Key Responsibilities
  - Desired Candidate Profile
  - Keywords & Required Skills list
  - Instructions to Recruiters / Custom Candidate Questions / Mode of Application
- **Tasks**:
  1. Create shared React component `JobDetailsView.jsx`.
  2. Implement responsive styling matching screenshot 4.
  3. Wire up job data fetching from GET `/api/jobs/{id}`.
- **Acceptance Criteria**:
  - [ ] Display layout matches reference specification accurately across screen sizes.

---

### Epic 4: Candidate Matching & Automated Scoring Engine

#### ⚡ Ticket #6: Automated Candidate Scoring Engine
- **Assignee**: Shyam (@shyamsundxr)
- **Labels**: `domain::scoring`, `type::backend`, `priority::high`
- **Description**:
  Develop scoring algorithm evaluating candidate profiles against job posting parameters on each application.
- **Scoring Rules**:
  - Experience Score (Total & GCC experience match).
  - Skill Match Score (IT & Functional skills matching job requirements).
  - Education & Designation Alignment Score.
  - Notice Period / Joining Date Compatibility Score.
  - Salary Expectations Alignment Score.
- **Tasks**:
  1. Build scoring utility module `app/services/scoring_service.py`.
  2. Calculate and store match percentage & field breakdown scores upon job application submission.
  3. Expose candidate rank list in Admin candidate management view.
- **Acceptance Criteria**:
  - [ ] Application submission triggers automated score calculation.
  - [ ] Admin dashboard displays candidate match score with broken down field insights.
