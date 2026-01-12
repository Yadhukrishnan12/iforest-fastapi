from fastapi import FastAPI, File, UploadFile
import pandas as pd
from pyod.models.iforest import IForest

app = FastAPI()

@app.post("/detect")
async def detect_anomalies(file: UploadFile = File(...)):
    # Read CSV
    df = pd.read_csv(file.file)

    # Keep only numeric columns
    X = df.select_dtypes(include=["int64", "float64"])

    if X.shape[1] == 0:
        return {"error": "No numeric columns found"}

    # Train model on uploaded data
    model = IForest(contamination=0.1)
    model.fit(X)

    # Detect anomalies
    df["anomaly"] = model.labels_      # 1 = anomaly, 0 = normal
    df["score"] = model.decision_scores_

    # Return results
    anomalies = df[df["anomaly"] == 1]

    return {
        "total_rows": len(df),
        "anomalies_found": len(anomalies),
        "anomalies": anomalies.to_dict(orient="records")
    }
