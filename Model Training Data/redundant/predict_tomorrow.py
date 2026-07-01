import pandas as pd
import numpy as np
import joblib
from datetime import datetime, timedelta
import requests

LAT = 18.52
LON = 73.85
LOOKBACK = 30


# ── fetch last 30 days from Open-Meteo ERA5 ──────────────────────────────────
END = datetime.today()
START = END - timedelta(days=LOOKBACK)

print("Fetching last 30 days from Open-Meteo...")

response = requests.get(
    "https://archive-api.open-meteo.com/v1/archive",
    params={
        "latitude": LAT,
        "longitude": LON,
        "start_date": START.strftime("%Y-%m-%d"),
        "end_date": END.strftime("%Y-%m-%d"),
        "daily": [
            "temperature_2m_mean",
            "temperature_2m_max",
            "temperature_2m_min",
            "relative_humidity_2m_mean",
            "precipitation_sum",
            "surface_pressure_mean",
            "shortwave_radiation_sum"
        ],
        "timezone": "auto"
    }
)

data = response.json()

df = pd.DataFrame({
    "T2M": data["daily"]["temperature_2m_mean"],
    "T2M_MAX": data["daily"]["temperature_2m_max"],
    "T2M_MIN": data["daily"]["temperature_2m_min"],
    "RH2M": data["daily"]["relative_humidity_2m_mean"],
    "PRECTOTCORR": data["daily"]["precipitation_sum"],
    "PS": data["daily"]["surface_pressure_mean"],
    "ALLSKY_SFC_SW_DWN": data["daily"]["shortwave_radiation_sum"]
})

df = df.apply(pd.to_numeric, errors="coerce")
df = df.interpolate().dropna()

print(f"Got {len(df)} days of data")


# ── build the input window ────────────────────────────────────────────────────
# model expects exactly 30 days × 8 features = 240 values flattened
window = df.iloc[-LOOKBACK:].values.flatten().reshape(1, -1)


# ── load models and predict ───────────────────────────────────────────────────

BASE_PATH = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data"

mean_model = joblib.load(BASE_PATH + r"\temperature_model_mean.pkl")
max_model  = joblib.load(BASE_PATH + r"\temperature_model_max.pkl")
min_model  = joblib.load(BASE_PATH + r"\temperature_model_min.pkl")
print("Mean model expects:", mean_model.n_features_in_)
print("Max model expects :", max_model.n_features_in_)
print("Min model expects :", min_model.n_features_in_)
pred_mean = mean_model.predict(window)[0]
pred_max  = max_model.predict(window)[0]
pred_min  = min_model.predict(window)[0]

tomorrow = (END + timedelta(days=1)).strftime("%d %B %Y")

print(f"\n── Forecast ─────────────────────────")
print(f"Date             : {tomorrow}")
print(f"Mean Temperature : {pred_mean:.2f} °C")
print(f"Maximum Temp     : {pred_max:.2f} °C")
print(f"Minimum Temp     : {pred_min:.2f} °C")
print(f"─────────────────────────────────────")