# PROJECT MASTER SPECIFICATION

## 1. Project Identity

**Project Title:**
Design and Implementation of an Intelligent Loan Default Prediction System for Financial Lending Institutions: A Case Study of Cooperative Societies

**Project Type:**
Final-Year Computer Science Project

**Primary Goal:**
Develop a web-based intelligent loan management system for cooperative societies that integrates machine learning-based loan default risk prediction as a decision-support tool for loan officers.

---

## 2. System Scope

The system will manage:

* User authentication and access control
* Cooperative member records
* Loan applications
* Borrower and loan assessment
* Loan default risk prediction
* Loan approval/rejection
* Approved loan management
* Loan repayments
* Risk and loan dashboards
* Reports and analytics

The system **will not automatically approve or reject loans**. The machine learning model provides a predicted default probability and risk classification, while the loan officer makes the final decision.

---

# 3. User Roles

## 3.1 Member

Members can:

* Log in
* Manage/view their profile
* Submit loan applications
* View application status
* View loan information
* View repayment history

## 3.2 Loan Officer

Loan officers can:

* Log in
* View/manage members
* Submit loan applications
* Review applications
* View borrower information
* View loan history
* View default risk predictions
* Approve or reject applications
* Manage approved loans
* Record repayments
* View reports and dashboards

## 3.3 Administrator

Administrators can:

* Log in
* Manage users
* Manage user roles
* Activate/deactivate accounts
* View system records
* View administrative reports

---

# 4. Technology Stack

## Frontend

* Next.js
* Tailwind CSS

## Backend

* Python
* Flask
* Flask REST API

## Database

* MySQL
* MySQL Workbench

## Machine Learning

* Python
* Pandas
* NumPy
* Scikit-learn
* XGBoost

## Development Tools

* VS Code
* Git
* GitHub
* Figma

---

# 5. System Architecture

The system follows a layered web architecture:

```text
Users
(Member / Loan Officer / Administrator)
              ↓
      Next.js + Tailwind CSS
              ↓
          REST API
              ↓
        Python + Flask
          ↓       ↓
       MySQL    ML Module
                  ↓
          Selected ML Model
```

The Flask backend is responsible for communication between the frontend, database, authentication system, and machine learning component.

---

# 6. Database Structure

The implemented MySQL database is:

`cooperative_loan_system`

## Main Tables

### Users

* user_id
* username
* email
* password_hash
* role
* status
* created_at

### Members

* member_id
* user_id
* first_name
* last_name
* gender
* date_of_birth
* phone
* email
* address
* membership_date
* membership_status

### Loan Applications

* application_id
* member_id
* submitted_by
* amount_requested
* loan_purpose
* loan_term
* repayment_frequency
* application_date
* application_status
* decision_date
* decision_by

### Loans

* loan_id
* application_id
* amount_approved
* interest_rate
* disbursement_date
* amount_due
* outstanding_balance
* loan_status

### Repayments

* repayment_id
* loan_id
* payment_date
* amount_paid
* payment_method
* payment_status
* remaining_balance

### Risk Predictions

* prediction_id
* application_id
* default_probability
* risk_level
* model_name
* prediction_date

---

# 7. Database Relationships

* User → Member: 1:0..1
* Member → Loan Application: 1:N
* User → Loan Application: 1:N
* Loan Application → Loan: 1:0..1
* Loan Application → Risk Prediction: 1:N
* Loan → Repayment: 1:N

Primary and foreign keys will enforce referential integrity.

---

# 8. Core System Workflows

## 8.1 Authentication

```text
User
 ↓
Login
 ↓
Next.js
 ↓
Flask API
 ↓
MySQL
 ↓
Authentication Result
 ↓
Role-based Dashboard
```

## 8.2 Loan Application and Risk Prediction

```text
Member/Loan Officer
 ↓
Loan Application
 ↓
Flask API
 ↓
Validate Application
 ↓
ML Preprocessing
 ↓
Selected ML Model
 ↓
Default Probability
 ↓
Risk Level
 ↓
Store Prediction
 ↓
Display to Loan Officer
```

## 8.3 Loan Decision

```text
Loan Officer
 ↓
Review Application
 ↓
View Borrower Information
 ↓
View Risk Prediction
 ↓
Approve / Reject
 ↓
Flask API
 ↓
MySQL
 ↓
Updated Application Status
```

## 8.4 Repayment

```text
Loan Officer
 ↓
Enter Repayment
 ↓
Flask API
 ↓
Record Repayment
 ↓
Update Loan Balance
 ↓
MySQL
 ↓
Updated Repayment Information
```

---

# 9. Machine Learning Specification

## 9.1 Objective

Predict the likelihood that a loan will default using borrower and loan information available at the time of loan assessment.

## 9.2 Classification Approach

The models will perform **binary classification**:

* Default
* Non-default

The predicted probability will then be converted into a risk category:

* Low
* Medium
* High

The final risk thresholds will be determined after model development and validation. They must not be arbitrarily fixed before examining the actual model behaviour and project requirements.

## 9.3 Models

Five classifiers will be developed and compared:

1. Logistic Regression
2. K-Nearest Neighbours (KNN)
3. Random Forest
4. Gradient Boosting
5. XGBoost

The best-performing model will be selected for live prediction.

The system will **not run all five models simultaneously for live user predictions**.

---

# 10. Dataset

Primary dataset:

**Nigerian Cooperative Loan Dataset**

The dataset contains records from five cooperative societies.

Current audited totals:

* Raw records: 7,198
* Unique loans: 5,752
* Unique members: 3,503
* Default records: 1,522
* Non-default records: 5,676
* Approximate raw default rate: 21.14%

The raw dataset contains multiple repayment records for some loans. Therefore, the machine learning dataset must be constructed at the appropriate **loan level** rather than treating every repayment row as an independent training example.

---

# 11. Data Preprocessing Rules

The preprocessing pipeline must address:

* Duplicate records
* Missing values
* Inconsistent categorical values
* Mixed date formats
* Text-based numeric values
* Outliers where appropriate
* Categorical encoding
* Numerical scaling where required
* Feature engineering
* Class imbalance
* Data leakage

## Important Leakage Rule

Information that only becomes available after the loan has been issued or repayments have begun must not be used as an application-time predictor.

Examples include:

* Payment_Date
* Amount_Paid
* Days_Late
* Payment_Status
* Missed_Payment
* Partial_Payment
* Outstanding_Balance
* Remaining_Balance
* Cumulative_Amount_Paid
* Loan_Balance

These may be used for defining or validating loan outcomes where appropriate, but not as predictors if they would not be known when assessing a new application.

---

# 12. Potential Predictor Features

Candidate features include:

* Age
* Gender
* Employment_Status
* Monthly_Income
* Savings_Balance
* Share_Value
* Previous_Loan_Count
* Previous_Default_Count
* Previous_Repayment_Rate
* Loan_Purpose
* Amount_Requested
* Amount_Approved
* Loan_Term
* Interest_Rate
* Repayment_Frequency
* Collateral_Type
* Collateral_Value
* Number_of_Guarantors
* Existing_Monthly_Obligation
* Membership_Duration

Additional engineered features may include:

* Loan-to-Income Ratio
* Loan-to-Savings Ratio
* Previous Default Rate
* Existing Obligation-to-Income Ratio
* Approval Ratio
* Savings-to-Income Ratio
* Previous Loan Completion Rate

Final features will be determined after data analysis and leakage checks.

---

# 13. Dataset Splitting

The proposal specifies:

* 70% Training
* 15% Validation
* 15% Testing

The final implementation must ensure that related records from the same member or loan do not improperly appear across multiple splits.

The exact splitting strategy will be finalized during ML implementation based on the structure and temporal characteristics of the dataset.

---

# 14. Model Evaluation

The models will be evaluated using appropriate classification metrics, including:

* Accuracy
* Precision
* Recall
* F1-score
* ROC-AUC

ROC-AUC is the primary metric for comparing model discrimination because the dataset contains an imbalanced default/non-default distribution.

Confusion matrices and relevant evaluation charts will also be produced for Chapter 4.

---

# 15. Risk Prediction

The selected model will return:

```text
Default Probability
        ↓
Risk Classification
        ↓
Low / Medium / High
```

The interface should display both:

**Risk Level:** High
**Default Probability:** 72.4%

The prediction is a decision-support output and does not constitute an automatic lending decision.

---

# 16. Frontend Screen Map

The Figma prototype should cover the following major screens.

## Authentication

* Login

## Member

* Member Dashboard
* Profile
* Apply for Loan
* My Applications
* Application Details
* My Loans
* Repayment History

## Loan Officer

* Loan Officer Dashboard
* Members
* Member Details
* Applications
* Application Details
* Risk Assessment
* Loan Decision
* Active Loans
* Repayments
* Reports

## Administrator

* Admin Dashboard
* Users
* User Details
* Roles/Permissions
* System Records

The Figma prototype will serve as the primary visual guide for frontend implementation.

---

# 17. Backend API Principles

The Flask API will:

* Authenticate users
* Enforce role-based authorization
* Validate incoming data
* Communicate with MySQL
* Manage loan workflows
* Manage repayment records
* Communicate with the ML prediction module
* Store prediction results
* Return appropriate success/error responses

API endpoints must be documented before frontend integration.

---

# 18. Security Requirements

The implementation must include:

* Password hashing
* Authentication
* Role-based authorization
* Input validation
* Protected endpoints
* Appropriate database constraints
* Secure handling of user information
* Prevention of unauthorized access
* Appropriate error handling

Passwords must never be stored as plain text.

---

# 19. Development Methodology

The project follows Agile Software Development Methodology through five sprints:

### Sprint 1

Requirements Analysis and System Design

### Sprint 2

Data Collection and Preprocessing

### Sprint 3

Machine Learning Model Development

### Sprint 4

System Development and Integration

### Sprint 5

Testing and Evaluation

Detailed implementation activities and results will be documented in Chapter 4.

---

# 20. Implementation Order

The development will proceed in the following order:

### Phase 1

Finalize Figma screen map and user flows.

### Phase 2

Build and validate the machine learning pipeline.

### Phase 3

Finalize backend/API contracts.

### Phase 4

Implement Flask backend and authentication.

### Phase 5

Implement Next.js frontend based on Figma.

### Phase 6

Integrate frontend, backend, database, and ML model.

### Phase 7

Implement complete loan and repayment workflows.

### Phase 8

Test, debug, refine, and prepare deployment.

---

# 21. AI Collaboration Workflow

Two AI assistants may be used during development:

## ChatGPT

Primary responsibilities:

* System architecture
* Database/API consistency
* Machine learning methodology
* Flask backend
* Integration
* Debugging
* Security review
* Technical decision-making
* Documentation consistency

## Claude

Primary responsibilities:

* Frontend implementation
* Next.js components
* Tailwind styling
* UI implementation from Figma
* Isolated implementation tasks
* Code review where appropriate

## User

Final authority over:

* Project requirements
* Design decisions
* Feature inclusion
* Code acceptance
* Testing
* Supervisor requirements
* Final implementation decisions

Neither AI should independently change the established architecture or database structure without updating the project specification.

---

# 22. Source of Truth

Three sources should be treated as authoritative:

### Project Specification

Defines what the system is supposed to be.

### GitHub Repository

Defines the current actual code.

### Figma

Defines the intended visual interface and user experience.

If there is a conflict:

**Actual supervisor/project requirements → Project Specification → GitHub implementation → Figma implementation details**

Changes to architecture, database structure, API contracts, or major workflows must be documented before implementation.

---

# 23. Current Project Status

## Completed

* Project topic and scope
* System requirements
* User-needs assessment
* Agile methodology
* System architecture
* Context diagram
* Level 0 DFD
* Level 1 DFD
* ERD
* Use case diagrams
* Sequence diagrams
* Database design
* MySQL database creation
* Dataset audit
* ML model selection
* Chapter 3 methodology and design

## Currently Starting

* Figma prototype
* ML preprocessing and model training
* System implementation

## Next Major Milestones

1. Complete Figma
2. Complete ML pipeline
3. Build backend
4. Build frontend
5. Integrate components
6. Test system
7. Deploy if required
8. Document Chapter 4

---

# 24. Non-Negotiable Project Rules

1. Do not invent implementation results.
2. Do not claim a feature is implemented until it actually works.
3. Do not use post-loan information as an application-time predictor.
4. Do not allow the ML model to automatically approve or reject loans.
5. Do not change the database schema casually.
6. Do not introduce a new framework without a clear reason.
7. Do not create duplicate implementations of the same feature.
8. Keep frontend, backend, database, ML, Figma, and documentation consistent.
9. Test important functionality before considering it complete.
10. All final implementation decisions remain with the project owner.
11. Keep the implementation simple enough to understand, demonstrate, and defend.
12. Chapter 4 must document the actual system that was built, not an idealized version.
