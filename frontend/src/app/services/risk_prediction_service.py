
import json
import os
from datetime import date, datetime
from decimal import Decimal

import joblib
import pandas as pd


MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml")
)

MODEL_PATH = os.path.join(
    MODEL_DIR, "logistic_regression_pipeline_corrected.joblib"
)
SCHEMA_PATH = os.path.join(MODEL_DIR, "model_input_schema.json")
RISK_CONFIG_PATH = os.path.join(MODEL_DIR, "risk_category_config.json")


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
    dataframe = pd.DataFrame([row], columns=feature_names)

    probabilities = model.predict_proba(dataframe)[0]
    probability = float(probabilities[1])

    low_limit = float(risk_config["low"]["maximum_exclusive"])
    high_limit = float(risk_config["high"]["minimum"])

    if probability < low_limit:
        risk_level = "Low"
    elif probability < high_limit:
        risk_level = "Medium"
    else:
        risk_level = "High"

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
    }
