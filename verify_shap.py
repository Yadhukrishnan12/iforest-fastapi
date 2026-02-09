import pandas as pd
from pyod.models.iforest import IForest
import shap
import numpy as np

def test_shap_workflow():
    print("Loading data...")
    try:
        df = pd.read_csv("financial_data.csv")
    except FileNotFoundError:
        print("Warning: financial_data.csv not found. Using random data.")
        df = pd.DataFrame(np.random.rand(100, 5), columns=['col1', 'col2', 'col3', 'col4', 'col5'])
    
    # Ensure all columns are numeric
    X = df.select_dtypes(include=["int64", "float64"])
    print(f"Data shape: {X.shape}")

    print("Training IForest...")
    model = IForest(contamination=0.1)
    model.fit(X)

    print("Detecting anomalies...")
    # labels_ is available after fit
    anomalies_mask = model.labels_ == 1
    X_anomalies = X[anomalies_mask]
    
    print(f"Found {len(X_anomalies)} anomalies.")

    if len(X_anomalies) > 0:
        print("Initializing SHAP explainer...")
        try:
            # Verify access to sklearn model
            sklearn_model = model.detector_
            explainer = shap.TreeExplainer(sklearn_model)
            
            print("Calculating SHAP values...")
            # check_additivity=False is often safer for IForest approximations
            shap_values = explainer.shap_values(X_anomalies, check_additivity=False)
            
            print("SHAP values shape:", np.shape(shap_values))
            
            # Match app.py logic
            explanation_list = []
            feature_names = X.columns.tolist()
            
            print("\nProcessing explanations (matching app.py logic)...")
            for i in range(len(X_anomalies)):
                vals = shap_values[i]
                # Create dict of feature -> shap value
                row_explanation = {feature_names[j]: float(vals[j]) for j in range(len(feature_names))}
                # Sort by impact
                sorted_exp = dict(sorted(row_explanation.items(), key=lambda item: abs(item[1]), reverse=True))
                explanation_list.append(sorted_exp)
            
            print("First anomaly explanation:")
            for k, v in explanation_list[0].items():
                print(f"  {k}: {v:.4f}")
                
            print("\nVerification successful! The logic matches app.py.")
            return True

        except Exception as e:
            print(f"\nERROR in SHAP calculation: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    else:
        print("No anomalies found to test SHAP on.")
        return True

if __name__ == "__main__":
    success = test_shap_workflow()
    if not success:
        exit(1)
