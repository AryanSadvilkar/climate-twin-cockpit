import pandas as pd
import numpy as np
import requests
import joblib
from datetime import datetime, timedelta

from maharashtra_districts import districts

DISTRICT = input("Enter district: ").strip().title()
LOOKBACK = 30

if DISTRICT not in districts:
    print("\nSupported districts:")
    for d in districts:
        print("-", d)
    raise ValueError("Invalid district selected.")

lat, lon = districts[DISTRICT]

print(f"Fetching data for {DISTRICT}...")

response = requests.get(
    "https://archive-api.open-meteo.com/v1/archive",
    params={
        "latitude": lat,
        "longitude": lon,
        "start_date": (datetime.today() - timedelta(days=LOOKBACK)).strftime("%Y-%m-%d"),
        "end_date": (datetime.today() - timedelta(days=1)).strftime("%Y-%m-%d"),
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

window = df[features].values.flatten().reshape(1, -1)

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

pred_mean = mean_model.predict(window)[0]
pred_max = max_model.predict(window)[0]
pred_min = min_model.predict(window)[0]
pred_humidity = humidity_model.predict(window)[0]
pred_rainfall = rainfall_model.predict(window)[0]
pred_pressure = pressure_model.predict(window)[0]
pred_solar = solar_model.predict(window)[0]

tomorrow = (datetime.today() + timedelta(days=1)).strftime("%d %B %Y")

print("\n--------------------------------")
print(f"District         : {DISTRICT}")
print(f"Date             : {tomorrow}")

print(f"\nMean Temp      : {pred_mean:.2f} °C")
print(f"Max Temp       : {pred_max:.2f} °C")
print(f"Min Temp       : {pred_min:.2f} °C")

print(f"\nHumidity       : {pred_humidity:.2f} %")
print(f"Rainfall       : {pred_rainfall:.2f} mm")
print(f"Pressure       : {pred_pressure:.2f} hPa")
print(f"Solar Radiation: {pred_solar:.2f} MJ/m²/day")

print("--------------------------------")