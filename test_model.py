
import json
import joblib
import pandas as pd

model = joblib.load("ml/logistic_regression_pipeline_corrected.joblib")

with open("ml/model_input_schema.json", encoding="utf-8") as f:
    schema = json.load(f)

# Supply all expected features in the correct order.
sample = {feature: None for feature in schema["features"]}

# Use representative values for the first test.
sample.update({
    "Application_Date": "2026-10-27",
    "Membership_Date": "2022-01-01",
    "Age": 35,
    "Gender": "Male",
    "Marital_Status": "Married",
    "Number_of_Dependents": 2,
    "Occupation": "Trader",
    "Employment_Status": "Employed",
    "Monthly_Income": 250000,
    "Yearly_Income": 3000000,
    "Existing_Monthly_Obligation": 50000,
    "Membership_Status": "Active",
    "Savings_Balance": 500000,
    "Share_Value": 100000,
    "Previous_Default_Count": 0,
    "Previous_Repayment_Rate": 0.95,
    "Amount_Requested": 500000,
    "Loan_Term": 12,
    "Interest_Rate": 10,
    "Collateral_Value": 300000,
    "Number_of_Guarantors": 2,
    "Membership_Duration_Days": 1760,
})

df = pd.DataFrame([sample], columns=schema["features"])
probability = float(model.predict_proba(df)[0][1])

print("Default probability:", round(probability, 4))
