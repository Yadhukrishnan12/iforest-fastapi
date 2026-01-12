import numpy as np
import pandas as pd

# Configuration
ROWS = 1000
COLUMNS = 200
ANOMALY_PERCENT = 0.03  # 3% anomalies

np.random.seed(42)

# Generate normal data
data = np.random.normal(loc=50, scale=10, size=(ROWS, COLUMNS))

# Inject anomalies
num_anomalies = int(ROWS * ANOMALY_PERCENT)
anomaly_indices = np.random.choice(ROWS, num_anomalies, replace=False)

for idx in anomaly_indices:
    # Make anomalies extreme
    data[idx] = np.random.normal(loc=200, scale=50, size=COLUMNS)

# Create column names
columns = [f"feature_{i}" for i in range(COLUMNS)]

# Create DataFrame
df = pd.DataFrame(data, columns=columns)

# Save CSV
df.to_csv("synthetic_anomaly_dataset.csv", index=False)

print("Dataset created:")
print(f"- Rows: {ROWS}")
print(f"- Columns: {COLUMNS}")
print(f"- Anomalies: {num_anomalies}")
print("Saved as: synthetic_anomaly_dataset.csv")
