#

# def network_anomaly_detection(df):
#     print("Detecting network anomalies.. called.")
#     scaler = joblib.load("network_scaler.pkl")
#     model = joblib.load("network_iforest_model.pkl")
#     print("Model and scaler loaded successfully.")
#     scaled_data = scaler.transform(df)
#     print("Data scaled successfully.")
#     predictions = model.predict(scaled_data)
#     print("prediction done")
#     df["anomaly"] = predictions
#     print(df)

#     return df                                                                                                                                                                                 