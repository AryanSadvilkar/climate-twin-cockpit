import pandas as pd
import numpy as np
import requests
import joblib
import json
from datetime import datetime, timedelta

from maharashtra_districts import districts

LOOKBACK = 30
FORECAST_DAYS = 7

# ------------------------------------------------------------
# Load models once
# ------------------------------------------------------------

mean_model = joblib.load(
    r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\temperature_model_mean.pkl"
)

max_model = joblib.load(
    r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\temperature_model_max.pkl"
)

min_model = joblib.load(
    r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\temperature_model_min.pkl"
)
humidity_model = joblib.load("relative_humidity_model.pkl")
rainfall_model = joblib.load("rainfall_model.pkl")
pressure_model = joblib.load("surface_pressure_model.pkl")
solar_model = joblib.load("solar_radiation_model.pkl")

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

results = {}

# ------------------------------------------------------------
# Forecast every district
# ------------------------------------------------------------

for DISTRICT, (lat, lon) in districts.items():

    print(f"\nForecasting {DISTRICT}...")

    response = requests.get(
        "https://archive-api.open-meteo.com/v1/archive",
        params={
            "latitude": lat,
            "longitude": lon,
            "start_date": (
                datetime.today() - timedelta(days=LOOKBACK - 1)
            ).strftime("%Y-%m-%d"),
            "end_date": datetime.today().strftime("%Y-%m-%d"),
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

    if "daily" not in data:
        print(f"Skipping {DISTRICT} - API failure")
        continue

    df = pd.DataFrame({
        "latitude": lat,
        "longitude": lon,
        "T2M": data["daily"]["temperature_2m_mean"],
        "T2M_MAX": data["daily"]["temperature_2m_max"],
        "T2M_MIN": data["daily"]["temperature_2m_min"],
        "RH2M": data["daily"]["relative_humidity_2m_mean"],
        "PRECTOTCORR": data["daily"]["precipitation_sum"],
        "PS": data["daily"]["surface_pressure_mean"],
        "ALLSKY_SFC_SW_DWN": data["daily"]["shortwave_radiation_sum"]
    })

    window_data = df[features].values.tolist()

    district_forecast = []

    for day in range(FORECAST_DAYS):

        window = (
            np.array(window_data[-LOOKBACK:])
            .flatten()
            .reshape(1, -1)
        )

        pred_mean = float(mean_model.predict(window)[0])
        pred_max = float(max_model.predict(window)[0])
        pred_min = float(min_model.predict(window)[0])
        pred_humidity = float(humidity_model.predict(window)[0])
        pred_rainfall = float(rainfall_model.predict(window)[0])
        pred_pressure = float(pressure_model.predict(window)[0])
        pred_solar = float(solar_model.predict(window)[0])

        district_forecast.append({
    "day": day + 1,

    "T2M": round(pred_mean, 2),
    "T2M_MAX": round(pred_max, 2),
    "T2M_MIN": round(pred_min, 2),

    "RH2M": round(pred_humidity, 2),
    "PRECTOTCORR": round(pred_rainfall, 2),
    "PS": round(pred_pressure, 2),
    "ALLSKY_SFC_SW_DWN": round(pred_solar, 2)
})

        # Hold non-temperature variables constant
        new_row = [
    pred_mean,
    pred_max,
    pred_min,
    pred_humidity,
    pred_rainfall,
    pred_pressure,
    pred_solar,
    lat,
    lon
]

        window_data.append(new_row)

    results[DISTRICT] = district_forecast

# ------------------------------------------------------------
# Save results
# ------------------------------------------------------------

with open("forecast_7d.json", "w") as f:
    json.dump(results, f, indent=4)

print("\nSaved forecast_7d.json")