import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec

# ── load ──────────────────────────────────────────────────────────────────────
CSV_PATH = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\pune_weather_1990_2023.csv"

df = pd.read_csv(CSV_PATH)
df["date"] = pd.to_datetime(df["date"])
df = df.set_index("date")

print("Loaded successfully!")
print(f"Shape: {df.shape}")
print(f"Index type: {type(df.index)}")
print(f"First date: {df.index[0]}  |  Last date: {df.index[-1]}")
print()

fig = plt.figure(figsize=(16, 12))
fig.suptitle("Pune Weather — 1990 to 2023", fontsize=16, fontweight="bold", y=0.98)
gs = gridspec.GridSpec(3, 2, figure=fig, hspace=0.45, wspace=0.3)

print(df[["T2M", "T2M_MAX", "T2M_MIN"]].tail())

# ── 1. full temp history ──────────────────────────────────────────────────────
ax1 = fig.add_subplot(gs[0, :])
ax1.plot(df.index, df["T2M"], color="#e07b54", linewidth=0.4, alpha=0.6)
ax1.plot(df.resample("ME")["T2M"].mean(), color="#c0392b", linewidth=1.5, label="Monthly avg")
ax1.set_title("Daily Temperature (34 years)")
ax1.set_ylabel("Temp (°C)")
ax1.legend()

# ── 2. average monthly temp ───────────────────────────────────────────────────
ax2 = fig.add_subplot(gs[1, 0])
monthly_avg = df.groupby(df.index.month)["T2M"].mean()
months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
bars = ax2.bar(months, monthly_avg, color="#e07b54", edgecolor="white", linewidth=0.5)
ax2.set_title("Avg Temp by Month")
ax2.set_ylabel("Temp (°C)")
ax2.set_ylim(0, monthly_avg.max() + 5)
for bar, val in zip(bars, monthly_avg):
    ax2.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.3,
             f"{val:.1f}", ha="center", va="bottom", fontsize=7.5)

# ── 3. average monthly rainfall ──────────────────────────────────────────────
ax3 = fig.add_subplot(gs[1, 1])
rain_avg = df.groupby(df.index.month)["PRECTOTCORR"].mean()
bars2 = ax3.bar(months, rain_avg, color="#3498db", edgecolor="white", linewidth=0.5)
ax3.set_title("Avg Daily Rainfall by Month")
ax3.set_ylabel("Precipitation (mm)")
for bar, val in zip(bars2, rain_avg):
    ax3.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.05,
             f"{val:.1f}", ha="center", va="bottom", fontsize=7.5)

# ── 4. one year zoom-in (2022) ────────────────────────────────────────────────
ax4 = fig.add_subplot(gs[2, 0])
year = df.loc["2022-01-01":"2022-12-31"]
ax4.plot(year.index, year["T2M_MAX"], color="#e74c3c", linewidth=1, label="Max")
ax4.plot(year.index, year["T2M_MIN"], color="#3498db", linewidth=1, label="Min")
ax4.fill_between(year.index, year["T2M_MIN"], year["T2M_MAX"], alpha=0.15, color="#e07b54")
ax4.set_title("2022 — Daily Max vs Min Temp")
ax4.set_ylabel("Temp (°C)")
ax4.legend()

# ── 5. humidity vs temp scatter ───────────────────────────────────────────────
ax5 = fig.add_subplot(gs[2, 1])
ax5.scatter(df["T2M"], df["RH2M"], alpha=0.05, s=2, color="#8e44ad")
ax5.set_title("Temp vs Humidity (all 34 years)")
ax5.set_xlabel("Temp (°C)")
ax5.set_ylabel("Humidity (%)")

SAVE_PATH = r"C:\Users\manpr\Desktop\Nerd Stuff\hackathon projects\isro\Model Training Data\pune_weather_plots.png"
plt.savefig(SAVE_PATH, dpi=150, bbox_inches="tight")
print(f"Plots saved!")
plt.show()
