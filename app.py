from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

import pandas as pd
import numpy as np

from pyod.models.iforest import IForest

# Optional imports (can fail safely)
try:
    import shap
    SHAP_AVAILABLE = True
except Exception:
    SHAP_AVAILABLE = False

from sanitizer import DataSanitizer
from autoencoder import detect_categorical_anomalies

app = FastAPI(title="Anomaly Detection API")


# -------------------- CORS --------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------- Health --------------------
@app.get("/")
def health():
    return {"status": "backend is running"}


# -------------------- Numeric Anomaly Detection --------------------
@app.post("/detect")
async def detect_anomalies(file: UploadFile = File(...)):
    try:
        # 1️⃣ Validate file
        await DataSanitizer.validate_file(file)

        # 2️⃣ Load + sanitize
        df, metadata = await DataSanitizer.sanitize_dataframe(file)

        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV is empty")

        # 3️⃣ Prepare numeric features
        X, df_clean = DataSanitizer.prepare_features(df)

        if X is None or X.empty:
            raise HTTPException(
                status_code=400,
                detail="No usable numeric columns found after preprocessing"
            )

        # 4️⃣ Train Isolation Forest
        model = IForest(
            contamination=0.1,
            random_state=42,
            n_estimators=100
        )
        model.fit(X)

        # 5️⃣ Detect anomalies
        df_clean = df_clean.copy()
        df_clean["anomaly"] = model.labels_  # 1 = anomaly
        df_clean["score"] = model.decision_scores_

        anomalies = df_clean[df_clean["anomaly"] == 1].copy()

        # 6️⃣ SHAP explanation (SAFE MODE)
        explanations = []
        if SHAP_AVAILABLE and not anomalies.empty:
            try:
                explainer = shap.TreeExplainer(model.detector_)
                shap_values = explainer.shap_values(
                    X.loc[anomalies.index],
                    check_additivity=False
                )

                for i, idx in enumerate(anomalies.index):
                    row = X.loc[idx]
                    shap_row = shap_values[i]

                    feature_imp = sorted(
                        [
                            {
                                "feature": X.columns[j],
                                "value": float(row.iloc[j]),
                                "shap_value": float(shap_row[j]),
                            }
                            for j in range(len(X.columns))
                        ],
                        key=lambda x: abs(x["shap_value"]),
                        reverse=True,
                    )

                    explanations.append(feature_imp)

                anomalies["explanation"] = explanations

            except Exception as shap_err:
                # SHAP should NEVER crash the API
                anomalies["explanation"] = None
                metadata["shap_error"] = str(shap_err)

        else:
            anomalies["explanation"] = None
        
        return {
            "total_rows": len(df_clean),
            "anomalies_found": int(len(anomalies)),
            "anomalies": anomalies.to_dict(orient="records"),
            "metadata": {
                **metadata,
                "features_used": X.columns.tolist(),
                "shap_enabled": SHAP_AVAILABLE,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
        # 🔥 Catch-all to prevent 500 crash
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal error during anomaly detection",
                "details": str(e),
            },
        )


# -------------------- Categorical Autoencoder --------------------
@app.post("/detect_autoencoder")
async def detect_autoencoder(file: UploadFile = File(...)):
    try:
        await DataSanitizer.validate_file(file)

        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        df = pd.read_csv(pd.io.common.BytesIO(content))

        if df.empty:
            raise HTTPException(status_code=400, detail="CSV contains no rows")

        # Sanitize
        df.columns = DataSanitizer._sanitize_column_names(df.columns)
        df = DataSanitizer._sanitize_cell_values(df)

        result = detect_categorical_anomalies(df)

        return {
            "total_rows": len(df),
            "anomalies_found": len(result["anomalies"]),
            "anomalies": result["anomalies"],
            "metadata": result["metadata"],
        }

    except HTTPException:
        raise

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": "Autoencoder detection failed",
                "details": str(e),
            },
        )
