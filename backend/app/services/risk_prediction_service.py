import json
import os
from datetime import date, datetime
from decimal import Decimal

import joblib
import pandas as pd
import math


def calibrate_probability(probability, calibration):
    """Turn the balanced model's output into a real-world default probability."""
    if not calibration:
        return probability
    p = min(max(probability, 1e-6), 1 - 1e-6)
    z = calibration["slope"] * math.log(p / (1 - p)) + calibration["intercept"]
    return 1 / (1 + math.exp(-z))

MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml")
)

MODEL_PATH = os.path.join(
    MODEL_DIR, "logistic_regression_pipeline_corrected.joblib"
)
SCHEMA_PATH = os.path.join(MODEL_DIR, "model_input_schema.json")
RISK_CONFIG_PATH = os.path.join(MODEL_DIR, "risk_category_config.json")


# The app stores previous_repayment_rate as a fraction (0 to 1), but the
# model was trained on percentages (0 to 100; training mean was about 82).
REPAYMENT_RATE_FIELD = "Previous_Repayment_Rate"

# The model was trained on lowercase text and silently ignores any value it
# has not seen. Map the app's wording to the closest training category.
# Keys are the app's values AFTER trimming and lowercasing.
# These mappings are judgement calls: review them against what each
# training category actually means.
CATEGORY_MAP = {
    "Loan_Type": {
        "personal": "normal loan",
        "personal loan": "normal loan",
    },
    "Loan_Purpose": {
        "school fees": "school fees (primary/secondary)",
        "education": "school fees (primary/secondary)",
    },
    "Contribution_Status": {
        "active": "up to date",
    },
    "Member_Category": {
        "regular": "ordinary",
    },
    "Loan_Channel": {
        "officer_assisted": "branch/office",
        "member_self_service": "online portal",
    },
}


def load_model_files():
    """Load the trained model, input schema, and risk thresholds."""
    paths = (MODEL_PATH, SCHEMA_PATH, RISK_CONFIG_PATH)

    if not all(os.path.isfile(path) for path in paths):
        raise FileNotFoundError("One or more ML model files are missing.")

    model = joblib.load(MODEL_PATH)

    with open(SCHEMA_PATH, "r", encoding="utf-8") as file:
        schema = json.load(file)

    with open(RISK_CONFIG_PATH, "r", encoding="utf-8") as file:
        risk_config = json.load(file)

    return model, schema, risk_config


def get_known_categories(model):
    """Read the categories the model was trained on from the pipeline itself."""
    preprocessor = model.named_steps["preprocessor"]
    columns = {name: cols for name, _, cols in preprocessor.transformers_}
    transformers = {name: t for name, t, _ in preprocessor.transformers_}

    encoder = transformers["categorical"].named_steps["encoder"]

    return {
        column: set(categories)
        for column, categories in zip(columns["categorical"], encoder.categories_)
    }


def prepare_features(row, known_categories):
    """Convert app values into the format the model was trained on.

    Returns the prepared row and a list of values the model does not know.
    """
    prepared = dict(row)

    rate = prepared.get(REPAYMENT_RATE_FIELD)
    if rate is not None:
        if not 0 <= rate <= 1:
            raise ValueError(
                "Previous repayment rate must be stored as a value "
                "between 0 and 1."
            )
        prepared[REPAYMENT_RATE_FIELD] = round(rate * 100, 4)

    unmapped = []

    for column, allowed in known_categories.items():
        value = prepared.get(column)

        if isinstance(value, str):
            value = value.strip().lower() or None
            value = CATEGORY_MAP.get(column, {}).get(value, value)

        prepared[column] = value

        if value is not None and value not in allowed:
            unmapped.append({"field": column, "value": value})

    return prepared, unmapped


def to_json_safe(value):
    """Convert common database and pandas values to JSON-safe values."""
    if value is None:
        return None

    if pd.isna(value):
        return None

    if isinstance(value, (date, datetime, pd.Timestamp)):
        return value.isoformat()

    if isinstance(value, Decimal):
        return float(value)

    if hasattr(value, "item"):
        return value.item()

    return value


def make_prediction(features):
    """Predict default probability and assign a provisional risk category."""
    model, schema, risk_config = load_model_files()

    feature_names = schema.get("features")

    if not isinstance(feature_names, list) or not feature_names:
        raise ValueError("The model input schema has no valid feature list.")

    missing_names = [name for name in feature_names if name not in features]
    if missing_names:
        raise ValueError(
            "Missing model feature mappings: " + ", ".join(missing_names)
        )

    # Preserve the exact feature names and order used during training.
    row = {name: features[name] for name in feature_names}
    row, unmapped_values = prepare_features(row, get_known_categories(model))
    dataframe = pd.DataFrame([row], columns=feature_names)

    probabilities = model.predict_proba(dataframe)[0]
    raw_probability = float(probabilities[1])
    probability = calibrate_probability(
        raw_probability, risk_config.get("calibration")
    )

    low_limit = float(risk_config["low"]["maximum_exclusive"])
    high_limit = float(risk_config["high"]["minimum"])

    if probability < low_limit:
        risk_level = "Low"
    elif probability < high_limit:
        risk_level = "Medium"
    else:
        risk_level = "High"

    # The snapshot now shows exactly what the model received.
    snapshot = {
        key: to_json_safe(value)
        for key, value in row.items()
    }

    return {
        "default_probability": round(probability, 4),
        "risk_level": risk_level,
        "model_name": schema.get("model_name", "Logistic Regression"),
        "model_version": "corrected_v1",
        "input_snapshot": snapshot,
        "unmapped_values": unmapped_values,
    }