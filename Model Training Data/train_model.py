import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import matplotlib.pyplot as plt

# ── config ────────────────────────────────────────────────────────────────────
CSV_PATH  = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\maharashtra_weather.csv"
SAVE_PATH = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data"
LOOKBACK  = 30   # use last 30 days to predict tomorrow
TARGET    = "PS"  # target variable to predict

# ── load ──────────────────────────────────────────────────────────────────────
df = pd.read_csv(CSV_PATH)
df["date"] = pd.to_datetime(df["date"])
df = df.set_index("date")

print(f"Data loaded: {df.shape[0]} days")

# ── handle missing values ─────────────────────────────────────────────────────
print(f"Missing values before cleanup:\n{df.isnull().sum()}\n")
df = df.dropna()
print(f"After cleanup: {df.shape[0]} days remain")

# ── build sliding window dataset ──────────────────────────────────────────────
# each row = 30 days of all features flattened → predict T2M on day 31
features = [
    "T2M",
    "T2M_MAX",
    "T2M_MIN",
    "RH2M",
    "PRECTOTCORR",
    "PS",
    "ALLSKY_SFC_SW_DWN",
    "latitude",
    "longitude"
]

X = []
y = []

for district in df["district"].unique():

    district_df = (
        df[df["district"] == district]
        .sort_values("date")
        .reset_index(drop=True)
    )

    print(f"Processing {district}: {len(district_df)} rows")

    for i in range(LOOKBACK, len(district_df)):

        window = (
            district_df.iloc[i-LOOKBACK:i][features]
            .values
            .flatten()
        )

        target = district_df.iloc[i][TARGET]

        X.append(window)
        y.append(target)

X = np.array(X)
y = np.array(y)

print(f"\nDataset built: {X.shape[0]} samples, {X.shape[1]} features each")

if X.ndim < 2 or X.shape[0] == 0:
    raise ValueError(f"Not enough data. Got {len(df)} rows but need more than {LOOKBACK}. Check your CSV.")

print(f"Dataset built: {X.shape[0]} samples, {X.shape[1]} features each")

# ── chronological train/test split (80/20) ────────────────────────────────────
# NEVER shuffle time series data
split = int(len(X) * 0.8)
X_train, X_test = X[:split], X[split:]
y_train, y_test = y[:split], y[split:]

print(f"Train: {len(X_train)} samples  |  Test: {len(X_test)} samples")

# ── train xgboost ─────────────────────────────────────────────────────────────
print("\nTraining XGBoost...")
model = XGBRegressor(
    n_estimators=500,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    verbosity=0
)
model.fit(X_train, y_train)
print("Done!")

import joblib

joblib.dump(model, SAVE_PATH + r"\surface_pressure_model.pkl")
print("Model saved!")

# ── evaluate ──────────────────────────────────────────────────────────────────
y_pred = model.predict(X_test)

mae  = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))

print(f"\n── Results ──────────────────────────")
print(f"MAE  : {mae:.3f} °C   (avg error per day)")
print(f"RMSE : {rmse:.3f} °C  (punishes big errors more)")
print(f"─────────────────────────────────────")
