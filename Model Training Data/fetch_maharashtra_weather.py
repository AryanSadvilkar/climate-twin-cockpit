import requests
import pandas as pd
import time

# ------------------------------------------------------------------
# Districts
# ------------------------------------------------------------------

from maharashtra_districts import districts
# ------------------------------------------------------------------
# Storage
# ------------------------------------------------------------------

import os

if os.path.exists("maharashtra_weather.csv"):
    existing_df = pd.read_csv("maharashtra_weather.csv")
    all_data = [existing_df]
    completed_districts = set(existing_df["district"].unique())
else:
    all_data = []
    completed_districts = set()

# ------------------------------------------------------------------
# Fetch data
# ------------------------------------------------------------------
for district, (lat, lon) in districts.items():

    if district in completed_districts:
        print(f"\nSkipping {district} (already fetched)")
        continue

    print(f"\nFetching {district}...")

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": "2015-01-01",
        "end_date": "2025-12-31",
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

    while True:

        try:
            response = requests.get(
                "https://archive-api.open-meteo.com/v1/archive",
                params=params,
                timeout=30
            )

        except requests.exceptions.RequestException as e:
            print(f"\nConnection error: {e}")
            print("Retrying in 120 seconds...")
            time.sleep(120)
            continue

        print("Status code:", response.status_code)

        if response.status_code == 429:
            print("\nRate limit hit.")
            print("Retrying in 120 seconds...")
            time.sleep(120)
            continue

        if response.status_code != 200:
            print(f"\nUnexpected status code: {response.status_code}")
            print("Retrying in 120 seconds...")
            time.sleep(120)
            continue

        break

        if response.status_code == 429:
            print("\nRate limit hit.")
            print("Retrying in 2 minutes......")
            time.sleep(120)
            continue

        break

    print("Status:", response.status_code)

    data = response.json()

    if "daily" not in data:
        print(f"Failed for {district}")
        print(data)
        continue

    district_df = pd.DataFrame({
        "district": district,
        "latitude": lat,
        "longitude": lon,
        "date": data["daily"]["time"],
        "T2M": data["daily"]["temperature_2m_mean"],
        "T2M_MAX": data["daily"]["temperature_2m_max"],
        "T2M_MIN": data["daily"]["temperature_2m_min"],
        "RH2M": data["daily"]["relative_humidity_2m_mean"],
        "PRECTOTCORR": data["daily"]["precipitation_sum"],
        "PS": data["daily"]["surface_pressure_mean"],
        "ALLSKY_SFC_SW_DWN": data["daily"]["shortwave_radiation_sum"]
    })

    all_data.append(district_df)

    pd.concat(all_data, ignore_index=True).to_csv(
        "maharashtra_weather.csv",
        index=False
    )

    print(f"Fetched {len(district_df)} rows.")
    print(f"Completed {len(all_data)}/{len(districts)} districts")

    time.sleep(65)

# ------------------------------------------------------------------
# Combine everything
# ------------------------------------------------------------------

final_df = pd.concat(all_data, ignore_index=True)

print("\nFinal shape:", final_df.shape)
print(final_df.head())
print(final_df.tail())

# ------------------------------------------------------------------
# Save
# ------------------------------------------------------------------

final_df.to_csv("maharashtra_weather.csv", index=False)

print("\nSaved as maharashtra_weather.csv")