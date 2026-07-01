from datetime import datetime
import requests
import pandas as pd

LAT = 18.52
LON = 73.85

START = "19900101"                          # your original start
END   = datetime.today().strftime("%Y%m%d") # up to today

PARAMS = "T2M,T2M_MAX,T2M_MIN,RH2M,WS10M,PRECTOTCORR,PS,ALLSKY_SFC_SW_DWN"

print("Fetching data from NASA POWER...")
print(f"Date range: {START} → {END}")

url = "https://power.larc.nasa.gov/api/temporal/daily/point"

response = requests.get(url, params={
    "parameters": PARAMS,
    "community":  "AG",
    "longitude":  LON,
    "latitude":   LAT,
    "start":      START,
    "end":        END,
    "format":     "JSON"
})

if response.status_code != 200:
    print(f"Error: {response.status_code}")
    print(response.text)
    exit()

data = response.json()
daily = data["properties"]["parameter"]

df = pd.DataFrame(daily)
df.index = pd.to_datetime(df.index, format="%Y%m%d")
df.index.name = "date"
df.replace(-999, pd.NA, inplace=True)

SAVE = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\pune_weather_1990_2023.csv"
df.to_csv(SAVE)

print(f"Saved! Shape: {df.shape}  →  {df.shape[0]} days, {df.shape[1]} features")
print(df.head())
print("\nMissing values:\n", df.isnull().sum())