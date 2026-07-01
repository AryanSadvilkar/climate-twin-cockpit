import requests

url = "https://archive-api.open-meteo.com/v1/archive"

params = {
    "latitude": 18.52,
    "longitude": 73.85,
    "start_date": "1990-01-01",
    "end_date": "2026-06-26",
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

response = requests.get(url, params=params)

print(response.status_code)

data = response.json()

print(data["daily"].keys())

import pandas as pd

df = pd.DataFrame({
    "date": data["daily"]["time"],
    "T2M": data["daily"]["temperature_2m_mean"],
    "T2M_MAX": data["daily"]["temperature_2m_max"],
    "T2M_MIN": data["daily"]["temperature_2m_min"],
    "RH2M": data["daily"]["relative_humidity_2m_mean"],
    "PRECTOTCORR": data["daily"]["precipitation_sum"],
    "PS": data["daily"]["surface_pressure_mean"],
    "ALLSKY_SFC_SW_DWN": data["daily"]["shortwave_radiation_sum"]
})

print(df.head())
print(df.tail())
print(df.shape)

df.to_csv("pune_weather_openmeteo.csv", index=False)
print("\nSaved to pune_weather_openmeteo.csv")

