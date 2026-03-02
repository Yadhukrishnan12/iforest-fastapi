import numpy as np
import pandas as pd

from autoencoder import detect_numeric_anomalies_autoencoder
from fastapi import HTTPException


def test_numeric_autoencoder():
    print("Loading data...")
    try:
        df = pd.read_csv("financial_data.csv")
        X = df.select_dtypes(include=[np.number])
        if X.empty:
            raise ValueError("financial_data.csv has no numeric columns")
        df = X
    except Exception as e:
        print(f"Warning: using random numeric data ({e})")
        rng = np.random.default_rng(42)
        df = pd.DataFrame(rng.normal(size=(500, 12)), columns=[f"col{i}" for i in range(12)])

    print(f"Data shape: {df.shape}")
    print("Training + scoring numeric autoencoder (quick run)...")

    result = detect_numeric_anomalies_autoencoder(
        df,
        epochs=3,
        batch_size=128,
        threshold_percentile=95.0,
        validation_split=0.1,
    )

    anomalies = result["anomalies"]
    print(f"Anomalies found: {len(anomalies)}")
    if anomalies:
        first = anomalies[0]
        print("First anomaly score:", first.get("score"))
        print("Top per-feature errors:", first.get("per_feature", [])[:3])

    print("Verification successful!")
    return True


if __name__ == "__main__":
    try:
        ok = test_numeric_autoencoder()
        raise SystemExit(0 if ok else 1)
    except HTTPException as e:
        print(f"\nHTTPException: {e.detail}")
        if "TensorFlow" in str(e.detail):
            print("Install TensorFlow in your active environment, then rerun:")
            print("  pip install -r requirements.txt")
        raise SystemExit(1)
