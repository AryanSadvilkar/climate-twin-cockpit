import React, { useState } from 'react';
import { 
  X, CloudRain, Wind, Sun, 
  Activity, Calendar, Sprout, Database, 
  TrendingUp, Award, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import type { DistrictClimateData } from './MapTwin';

interface DistrictDetailDrawerProps {
  districtName: string;
  data: DistrictClimateData;
  tempOffset: number;
  rainfallOffset: number;
  humidityOffset: number;
  onClose: () => void;
  theme: 'light' | 'dark';
}

export const DistrictDetailDrawer: React.FC<DistrictDetailDrawerProps> = ({
  districtName,
  data,
  tempOffset,
  rainfallOffset,
  humidityOffset,
  onClose,
  theme
}) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'agriculture' | 'imd' | 'analysis'>('forecast');

  // Recalculate variables based on active What-If offsets
  const temp = parseFloat((data.temp + tempOffset).toFixed(1));
  const rainfall = Math.max(0, Math.round(data.rainfall * (1 + rainfallOffset / 100)));
  const humidity = Math.min(100, Math.max(0, data.humidity + humidityOffset));
  const cropStress = Math.min(100, Math.max(0, data.cropStress + (tempOffset * 5) - (rainfallOffset * 0.4)));
  const waterAvailability = Math.min(100, Math.max(0, data.waterAvailability + (rainfallOffset * 0.5) - (tempOffset * 3)));

  // Mock Forecast Hourly Trend Data
  const forecastHourlyData = [
    { time: '06:00', temp: Math.round(temp - 3), humidity: humidity + 5 },
    { time: '09:00', temp: Math.round(temp - 1), humidity: humidity + 2 },
    { time: '12:00', temp: Math.round(temp), humidity: humidity },
    { time: '15:00', temp: Math.round(temp + 2), humidity: humidity - 8 },
    { time: '18:00', temp: Math.round(temp + 1), humidity: humidity - 2 },
    { time: '21:00', temp: Math.round(temp - 2), humidity: humidity + 4 },
  ];

  // 5-Day Forecast mockup values
  const fiveDayForecast = [
    { day: 'Thu', date: 'Jun 18', icon: Sun, condition: 'Sunny', high: Math.round(temp + 2), low: Math.round(temp - 4), pop: 10 },
    { day: 'Fri', date: 'Jun 19', icon: CloudRain, condition: 'Light Shower', high: Math.round(temp + 1), low: Math.round(temp - 3), pop: 60 },
    { day: 'Sat', date: 'Jun 20', icon: CloudRain, condition: 'Heavy Rain', high: Math.round(temp - 1), low: Math.round(temp - 5), pop: 90 },
    { day: 'Sun', date: 'Jun 21', icon: Sun, condition: 'Clear Sky', high: Math.round(temp + 3), low: Math.round(temp - 2), pop: 15 },
    { day: 'Mon', date: 'Jun 22', icon: Sun, condition: 'Clear Sky', high: Math.round(temp + 4), low: Math.round(temp - 1), pop: 5 }
  ];

  // Mock IMD Gridded Rainfall Data (Actual vs Normal LPA)
  const imdRainfallData = [
    { name: 'Jan', Actual: Math.round(15 * (1 + rainfallOffset / 100)), Normal: 12 },
    { name: 'Feb', Actual: Math.round(12 * (1 + rainfallOffset / 100)), Normal: 10 },
    { name: 'Mar', Actual: Math.round(8 * (1 + rainfallOffset / 100)), Normal: 6 },
    { name: 'Apr', Actual: Math.round(10 * (1 + rainfallOffset / 100)), Normal: 8 },
    { name: 'May', Actual: Math.round(25 * (1 + rainfallOffset / 100)), Normal: 20 },
    { name: 'Jun', Actual: Math.round(102 * (1 + rainfallOffset / 100)), Normal: 110 },
    { name: 'Jul', Actual: Math.round(330 * (1 + rainfallOffset / 100)), Normal: 295 },
    { name: 'Aug', Actual: Math.round(235 * (1 + rainfallOffset / 100)), Normal: 270 },
    { name: 'Sep', Actual: Math.round(180 * (1 + rainfallOffset / 100)), Normal: 175 },
    { name: 'Oct', Actual: Math.round(38 * (1 + rainfallOffset / 100)), Normal: 45 },
    { name: 'Nov', Actual: Math.round(12 * (1 + rainfallOffset / 100)), Normal: 15 },
    { name: 'Dec', Actual: Math.round(8 * (1 + rainfallOffset / 100)), Normal: 10 }
  ];

  // Agricultural specific advisories
  const getAgriAdvisories = () => {
    if (tempOffset >= 3) {
      return {
        warning: 'CRITICAL WARNING: Intense heatwave stresses standing crops. Evapotranspiration index is elevated by 35%. Increase irrigation cycles immediately.',
        tips: [
          'Adopt micro-sprinkler or drip irrigation techniques. Use mulching (plastic or organic straw) to reduce evaporation.',
          'Schedule irrigation during early morning (before 8 AM) or late evening (after 6 PM). Provide shade nets for nursery crops.',
          'Postpone nitrogen fertilizer application as it accelerates dehydration in leaves. Treat soil with organic compost.'
        ]
      };
    }
    if (rainfallOffset <= -30) {
      return {
        warning: 'DROUGHT ADVISORY: Rainfall deficit exceeds limits. Ground aquifer levels are collapsing. Target critical irrigation stages only.',
        tips: [
          'Prioritize protective irrigation for life-saving crops. Avoid flood irrigation completely.',
          'Spray Potassium Nitrate (1.5%) to induce drought tolerance. Cultivate short-duration intercrops.',
          'Prepare emergency farm ponds for rainwater harvesting. Avoid sowing water-intensive crops like sugarcane.'
        ]
      };
    }
    if (rainfallOffset >= 30) {
      return {
        warning: 'FLOOD ADVISORY: Precipitation surplus triggers local drainage congestion. High chance of root rot in low-lying zones.',
        tips: [
          'Ensure immediate clearance of field drainage channels. Drain excess water accumulated in root areas.',
          'Postpone chemical spraying and fertilizer broadcasts till rainfall subsides.',
          'Stitch or prop weak crop stalks (like cotton or maize). Shift harvested produce to dry, elevated storage.'
        ]
      };
    }
    return {
      warning: 'STANDARD CLIMATE ADVISORY: Current climate indicators remain within decadal normal parameters. Sowing and harvesting can follow calendar guidelines.',
      tips: [
        'Perform weeding cycles at standard intervals. Apply organic bio-fertilizers.',
        'Monitor soil moisture levels using field tensiometers. Maintain rotation cycles.',
        'Sow seed varieties recommended by MPKV (Mahatma Phule Krishi Vidyapeeth) for the active monsoon.'
      ]
    };
  };

  const agriDetails = getAgriAdvisories();

  return (
    <div className="w-full h-full flex flex-col bg-white/70 dark:bg-black/70 backdrop-blur-2xl border-l border-brand-green/15 dark:border-brand-green/25 text-forest-text relative shadow-2xl">
      {/* Top Banner Header */}
      <div className="p-5 flex items-center justify-between border-b border-brand-green/10 bg-brand-green/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
            <h2 className="font-display font-extrabold text-xl tracking-wide uppercase">
              {districtName}
            </h2>
          </div>
          <p className="text-[10px] font-mono text-forest-text/50 uppercase tracking-widest mt-1">
            PILOT ZONE TELEMETRY • MH-ID: 27-{data.Dist_Code || '00'}
          </p>
        </div>

        <button 
          onClick={onClose}
          className="p-2 rounded-xl bg-white/80 dark:bg-black/50 border border-brand-green/15 dark:border-brand-green/25 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs Switcher Panel */}
      <div className="flex border-b border-brand-green/10 bg-white/50 dark:bg-black/30 sticky top-0 z-20">
        {(['forecast', 'agriculture', 'imd', 'analysis'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3.5 text-xs font-mono font-bold tracking-wider uppercase border-b-2 transition-all cursor-pointer ${
              activeTab === tab 
                ? 'border-brand-green text-brand-green bg-brand-green/[0.03]' 
                : 'border-transparent text-forest-text/50 hover:text-forest-text hover:bg-brand-green/[0.01]'
            }`}
          >
            {tab === 'imd' ? 'IMD Data' : tab}
          </button>
        ))}
      </div>

      {/* Main Tab View Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        
        {/* ===================== TAB 1: FORECAST ===================== */}
        {activeTab === 'forecast' && (
          <div className="space-y-6">
            {/* Weather Alert Banner */}
            {tempOffset >= 3 || rainfallOffset >= 30 || rainfallOffset <= -30 ? (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-mono text-xs font-extrabold text-red-500 uppercase tracking-wider">
                    ACTIVE METEOROLOGICAL ANOMALY
                  </h4>
                  <p className="text-xs text-forest-text/80 mt-1 leading-relaxed">
                    {tempOffset >= 3 ? `Extreme heatwave advisory active. Temperatures soaring at ${temp}°C.` : ''}
                    {rainfallOffset >= 30 ? `Heavy rainfall hazard warning. Drainage overflows expected.` : ''}
                    {rainfallOffset <= -30 ? `Severe precipitation deficit. Hydrological drought conditions emerging.` : ''}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-brand-green/5 border border-brand-green/15 rounded-xl p-4 flex items-start gap-3">
                <Activity className="w-5 h-5 text-brand-green shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-mono text-xs font-extrabold text-brand-green uppercase tracking-wider">
                    SYSTEM STATUS: NOMINAL
                  </h4>
                  <p className="text-xs text-forest-text/75 mt-1 leading-relaxed">
                    All seasonal temperature, rainfall, and relative humidity matrices are currently within standard error boundaries.
                  </p>
                </div>
              </div>
            )}

            {/* Weather Forecast App Mockup */}
            <div className="glass-card p-5 border border-brand-green/10">
              <h3 className="font-display font-bold text-sm text-forest-text mb-4 uppercase tracking-wider">
                Current Meteorological Metrics
              </h3>
              
              {/* Daily 5-day grid */}
              <div className="grid grid-cols-5 gap-2.5 pb-4 border-b border-brand-green/10 mb-4">
                {fiveDayForecast.map((fc, i) => {
                  const Icon = fc.icon;
                  return (
                    <div key={i} className="bg-brand-green/5 rounded-xl p-2.5 border border-brand-green/5 flex flex-col items-center text-center">
                      <span className="text-[9px] font-mono text-forest-text/40">{fc.day}</span>
                      <span className="text-[8px] font-mono text-forest-text/30 block mb-1">{fc.date}</span>
                      <Icon className="w-6 h-6 my-1.5 text-brand-green" />
                      <span className="text-xs font-bold font-mono text-forest-text mt-0.5">{fc.high}°</span>
                      <span className="text-[9px] font-mono text-forest-text/40">{fc.low}°</span>
                      <span className="text-[8px] font-mono text-brand-blue font-bold mt-1">{fc.pop}% Rain</span>
                    </div>
                  );
                })}
              </div>

              {/* Forecast graph (Temp & Humidity trends) */}
              <h4 className="font-mono text-[9px] text-forest-text/40 tracking-widest uppercase mb-3">
                24-Hour Forecast Profile (Hourly Trend)
              </h4>
              <div className="w-full h-[150px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastHourlyData}>
                    <XAxis dataKey="time" stroke={theme === 'dark' ? 'rgba(240, 253, 244, 0.4)' : 'rgba(27, 38, 30, 0.4)'} fontSize={9} tickLine={false} />
                    <YAxis stroke={theme === 'dark' ? 'rgba(240, 253, 244, 0.4)' : 'rgba(27, 38, 30, 0.4)'} fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: '10px', background: theme === 'dark' ? 'rgba(11, 15, 12, 0.95)' : '#fff', border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(21,128,61,0.1)'}`, color: theme === 'dark' ? '#f0fdf4' : '#1b261e' }} />
                    <Line type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f59e0b" strokeWidth={2.5} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Extra Weather cards */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-brand-green/5 rounded-xl p-3 border border-brand-green/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-blue/10 text-brand-blue">
                    <Wind className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-forest-text/40 block">WIND SPEED</span>
                    <span className="text-xs font-bold font-mono text-forest-text">18 km/h</span>
                  </div>
                </div>

                <div className="bg-brand-green/5 rounded-xl p-3 border border-brand-green/10 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-brand-yellow/10 text-brand-yellow">
                    <Sun className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-forest-text/40 block">UV INDEX</span>
                    <span className="text-xs font-bold font-mono text-forest-text">6 (Moderate)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: AGRICULTURE ===================== */}
        {activeTab === 'agriculture' && (
          <div className="space-y-6">
            {/* 1. Agricultural Impact Assessment Warning Banner */}
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
              <Sprout className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-display font-bold text-sm text-amber-800 tracking-wide">
                  Agricultural Impact Assessment
                </h4>
                <p className="text-xs text-amber-900/80 mt-1 leading-relaxed font-sans">
                  {agriDetails.warning}
                </p>
              </div>
            </div>

            {/* 2. Actionable Recommendations */}
            <div className="glass-card p-5 border border-brand-green/10">
              <h3 className="font-display font-bold text-sm text-forest-text mb-4 uppercase tracking-wider flex items-center gap-2">
                <Award className="w-4 h-4 text-brand-green" />
                Actionable Recommendations
              </h3>
              
              <div className="space-y-3">
                {agriDetails.tips.map((tip, i) => (
                  <div key={i} className="flex gap-3 items-start bg-brand-green/[0.02] border border-brand-green/5 rounded-xl p-3.5">
                    <span className="w-6 h-6 rounded-full bg-brand-green text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <p className="text-xs text-forest-text/85 leading-relaxed">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Crop Calendar Grid */}
            <div className="glass-card p-5 border border-brand-green/10">
              <h3 className="font-display font-bold text-sm text-forest-text mb-3.5 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-green" />
                Regional Crop Calendar
              </h3>
              <p className="text-[11px] text-forest-text/50 mb-4 font-mono uppercase">
                Active seasonal sowing, vegetative, and harvest stages
              </p>
              
              <div className="overflow-x-auto rounded-xl border border-brand-green/15">
                <table className="w-full font-mono text-xs text-left">
                  <thead className="bg-brand-green/5 border-b border-brand-green/10 text-forest-text/60">
                    <tr>
                      <th className="p-3">Crop Type</th>
                      <th className="p-3">Sowing Phase</th>
                      <th className="p-3">Peak Growing</th>
                      <th className="p-3">Harvesting</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-green/5 bg-white/30 dark:bg-black/20">
                    <tr className="hover:bg-brand-green/[0.01]">
                      <td className="p-3 font-semibold text-forest-text">Cotton (Kharif)</td>
                      <td className="p-3 text-brand-yellow font-bold">Jun - Jul</td>
                      <td className="p-3">Aug - Oct</td>
                      <td className="p-3 text-brand-green font-bold">Nov - Dec</td>
                    </tr>
                    <tr className="hover:bg-brand-green/[0.01]">
                      <td className="p-3 font-semibold text-forest-text">Soybean</td>
                      <td className="p-3 text-brand-yellow font-bold">Jun - Jul</td>
                      <td className="p-3">Aug - Sep</td>
                      <td className="p-3 text-brand-green font-bold">Oct - Nov</td>
                    </tr>
                    <tr className="hover:bg-brand-green/[0.01]">
                      <td className="p-3 font-semibold text-forest-text">Sugarcane (Adsali)</td>
                      <td className="p-3 text-brand-yellow font-bold">Jul - Aug</td>
                      <td className="p-3">Sep - Jul</td>
                      <td className="p-3 text-brand-green font-bold">Aug - Oct</td>
                    </tr>
                    <tr className="hover:bg-brand-green/[0.01]">
                      <td className="p-3 font-semibold text-forest-text">Wheat (Rabi)</td>
                      <td className="p-3 text-brand-yellow font-bold">Nov - Dec</td>
                      <td className="p-3">Jan - Feb</td>
                      <td className="p-3 text-brand-green font-bold">Mar - Apr</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Soil & Pest Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Soil Analysis */}
              <div className="glass-card p-4.5 border border-brand-green/10">
                <h4 className="font-display font-bold text-xs text-forest-text uppercase tracking-wider mb-3">
                  Soil Chemistry
                </h4>
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="flex justify-between border-b border-brand-green/5 pb-1">
                    <span className="text-forest-text/55">Soil pH Level</span>
                    <span className="font-bold text-forest-text">6.8 (Neutral)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-green/5 pb-1">
                    <span className="text-forest-text/55">Organic Carbon (OC)</span>
                    <span className="font-bold text-brand-green">0.65% (Optimal)</span>
                  </div>
                  <div className="flex justify-between border-b border-brand-green/5 pb-1">
                    <span className="text-forest-text/55">Nitrogen (N)</span>
                    <span className="font-bold text-brand-yellow">125 kg/ha (Low)</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-forest-text/55">Phosphorus (P)</span>
                    <span className="font-bold text-brand-green">28 kg/ha (High)</span>
                  </div>
                </div>
              </div>

              {/* Pest & Disease Alerts */}
              <div className="glass-card p-4.5 border border-brand-green/10 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-xs text-forest-text uppercase tracking-wider mb-3">
                    Pest Risk Thresholds
                  </h4>
                  <div className="space-y-2.5 font-mono text-[11px]">
                    <div className="flex justify-between items-center">
                      <span className="text-forest-text/55">Pink Bollworm (Cotton)</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${tempOffset > 1 ? 'bg-red-100 text-red-600' : 'bg-brand-green/10 text-brand-green'}`}>
                        {tempOffset > 1 ? 'HIGH RISK' : 'LOW RISK'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-forest-text/55">Stem Borer (Soybean)</span>
                      <span className="px-2 py-0.5 rounded bg-brand-green/10 text-brand-green font-bold">
                        LOW RISK
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-forest-text/55">Aphids (Horticulture)</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${humidity > 70 ? 'bg-amber-100 text-amber-600' : 'bg-brand-green/10 text-brand-green'}`}>
                        {humidity > 70 ? 'MEDIUM RISK' : 'LOW RISK'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 3: IMD DATA ===================== */}
        {activeTab === 'imd' && (
          <div className="space-y-6">
            {/* IMD Gridded Data Analysis Banner (Replicating Image 4) */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-5 text-white border border-indigo-500/20 shadow-md relative overflow-hidden">
              {/* Background design elements */}
              <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/10 rounded-xl border border-white/15">
                  <Database className="w-5 h-5 text-brand-sage" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base tracking-wide">
                    IMD Gridded Data Analysis
                  </h3>
                  <p className="text-[10px] font-mono text-brand-sage uppercase tracking-widest mt-0.5">
                    India Meteorological Department, Pune
                  </p>
                </div>
              </div>

              {/* Grid cell details */}
              <div className="grid grid-cols-2 gap-4 mt-5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-[9px] font-mono text-white/50 uppercase block">Rainfall Grid Cell</span>
                  <span className="font-bold font-mono text-sm block mt-0.5">0.25° × 0.25° resolution</span>
                  <span className="text-[9px] font-mono text-white/40 block mt-1">Grid Cell: (75, 66) | Lat: 19.75°N, Lon: 75.25°E</span>
                </div>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <span className="text-[9px] font-mono text-white/50 uppercase block">Temperature Grid Cell</span>
                  <span className="font-bold font-mono text-sm block mt-0.5">1.0° × 1.0° resolution</span>
                  <span className="text-[9px] font-mono text-white/40 block mt-1">Grid Cell: (18, 15) | Lat: 19.50°N, Lon: 75.00°E</span>
                </div>
              </div>

              {/* Rainfall Comparison metrics */}
              <div className="grid grid-cols-3 gap-3 mt-4 border-t border-white/10 pt-4 text-center font-mono">
                <div>
                  <span className="text-[9px] text-white/50 uppercase block">Annual Rainfall</span>
                  <span className="font-extrabold text-base block mt-0.5">{rainfall} mm</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/50 uppercase block">Normal (LPA)</span>
                  <span className="font-extrabold text-base block mt-0.5">{data.rainfall} mm</span>
                </div>
                <div>
                  <span className="text-[9px] text-white/50 uppercase block">Departure</span>
                  <span className={`font-extrabold text-base block mt-0.5 ${rainfallOffset >= 0 ? 'text-brand-sage' : 'text-amber-300'}`}>
                    {rainfallOffset >= 0 ? `+${rainfallOffset}%` : `${rainfallOffset}%`}
                  </span>
                </div>
              </div>
            </div>

            {/* Monthly Rainfall Distribution Comparison Bar Chart */}
            <div className="glass-card p-5 border border-brand-green/10">
              <h3 className="font-display font-bold text-sm text-forest-text mb-1 uppercase tracking-wider flex items-center gap-2">
                <CloudRain className="w-4 h-4 text-brand-green" />
                Monthly Rainfall Distribution
              </h3>
              <p className="text-[10px] text-forest-text/40 font-mono uppercase mb-4">
                IMD 0.25° Gridded Data vs Long Period Average (LPA)
              </p>

              <div className="w-full h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={imdRainfallData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(21,128,61,0.06)'} />
                    <XAxis dataKey="name" stroke={theme === 'dark' ? 'rgba(240, 253, 244, 0.5)' : 'rgba(27, 38, 30, 0.5)'} fontSize={9} tickLine={false} />
                    <YAxis stroke={theme === 'dark' ? 'rgba(240, 253, 244, 0.5)' : 'rgba(27, 38, 30, 0.5)'} fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ fontSize: '10px', background: theme === 'dark' ? 'rgba(11, 15, 12, 0.95)' : '#fff', border: `1px solid ${theme === 'dark' ? 'rgba(34, 197, 94, 0.25)' : 'rgba(21,128,61,0.1)'}`, color: theme === 'dark' ? '#f0fdf4' : '#1b261e' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'sans-serif', color: theme === 'dark' ? '#f0fdf4' : '#1b261e' }} />
                    <Bar dataKey="Actual" fill="#3b82f6" name="Actual Rainfall" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Normal" fill={theme === 'dark' ? '#1e293b' : '#d1d5db'} name="Normal (LPA)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Seasonal Analysis Cards (Replicating Image 6) */}
            <div className="space-y-3.5">
              <h4 className="font-mono text-[9px] text-forest-text/40 tracking-widest uppercase">
                Seasonal Analysis (Indian Seasons)
              </h4>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3 text-center">
                  <span className="font-bold text-xs text-forest-text block">Winter</span>
                  <span className="text-[9px] font-mono text-forest-text/30 uppercase block">Jan-Feb</span>
                  <span className="text-[11px] font-mono text-brand-blue font-bold block mt-1.5">27 mm</span>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold block">24.3°C Avg</span>
                </div>

                <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3 text-center">
                  <span className="font-bold text-xs text-forest-text block">Pre-Monsoon</span>
                  <span className="text-[9px] font-mono text-forest-text/30 uppercase block">Mar-May</span>
                  <span className="text-[11px] font-mono text-brand-blue font-bold block mt-1.5">28 mm</span>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold block">37.2°C Avg</span>
                </div>

                <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3 text-center">
                  <span className="font-bold text-xs text-forest-text block">SW Monsoon</span>
                  <span className="text-[9px] font-mono text-forest-text/30 uppercase block">Jun-Sep</span>
                  <span className="text-[11px] font-mono text-brand-blue font-bold block mt-1.5">{Math.round(855 * (1 + rainfallOffset / 100))} mm</span>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold block">34.3°C Avg</span>
                </div>

                <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-3 text-center">
                  <span className="font-bold text-xs text-forest-text block">Post-Monsoon</span>
                  <span className="text-[9px] font-mono text-forest-text/30 uppercase block">Oct-Dec</span>
                  <span className="text-[11px] font-mono text-brand-blue font-bold block mt-1.5">56 mm</span>
                  <span className="text-[10px] font-mono text-brand-yellow font-bold block">28.8°C Avg</span>
                </div>
              </div>
            </div>

            {/* Long Term Climate Trends Card (Replicating Image 6) */}
            <div className="bg-amber-500/[0.03] border border-brand-yellow/20 rounded-2xl p-4.5">
              <h4 className="font-display font-bold text-xs text-brand-yellow uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Long-Term Climate Trends
              </h4>
              <p className="text-[9px] text-forest-text/40 font-mono uppercase mb-4">
                Based on historical IMD daily grids from 1951-2024
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="bg-white/40 dark:bg-black/20 border border-brand-green/5 rounded-xl p-3">
                  <span className="text-[9px] text-forest-text/40 block">RAINFALL TREND</span>
                  <span className="font-extrabold text-forest-text mt-1 block">➡️ Stable</span>
                </div>
                
                <div className="bg-white/40 dark:bg-black/20 border border-brand-green/5 rounded-xl p-3">
                  <span className="text-[9px] text-forest-text/40 block">TEMPERATURE TREND</span>
                  <span className="font-extrabold text-red-500 mt-1 block">📈 Rising</span>
                </div>

                <div className="bg-white/40 dark:bg-black/20 border border-brand-green/5 rounded-xl p-3 col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[9px] text-forest-text/40 block">RAINFALL VARIABILITY (CV)</span>
                      <span className="font-extrabold text-forest-text mt-0.5 block">24.7% — Moderate</span>
                    </div>
                    <div className="text-right border-l border-brand-green/10 pl-4">
                      <span className="text-[9px] text-forest-text/40 block">HISTORIC DROUGHT YEARS</span>
                      <span className="font-extrabold text-red-500 mt-0.5 block">2002, 2014, 2018</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Citations & Sources (Replicating Image 6) */}
            <div className="bg-brand-green/5 border border-brand-green/10 rounded-xl p-4 text-[10px] font-mono leading-relaxed text-forest-text/65">
              <h4 className="font-bold uppercase tracking-wider text-forest-text mb-1.5 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-brand-green" />
                Data Sources & Citation
              </h4>
              <p>
                <strong>Rainfall:</strong> IMD New High Spatial Resolution (0.25° × 0.25°) Daily Gridded Rainfall Data (1901-2024), 135x129 grid points across India.
              </p>
              <p className="mt-1">
                <strong>Temperature:</strong> IMD High Resolution 1° × 1° Gridded Daily Temperature Data (1951-2024). 31x31 grid points.
              </p>
              <p className="text-[9px] text-forest-text/40 mt-2 italic">
                Citation: Pai D.S. et al. (2014) - IMD High Resolution Rainfall Data; Srivastava A.K. et al. (2009) - IMD Gridded Temperature.
              </p>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: ANALYSIS ===================== */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Regional Analysis Purple Card (Replicating Image 2) */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-800 rounded-2xl p-5 text-white border border-indigo-500/20 shadow-md">
              <div className="flex items-center gap-3.5 border-b border-white/10 pb-3 mb-4">
                <div className="p-2.5 bg-white/10 rounded-xl border border-white/15">
                  <Activity className="w-5 h-5 text-brand-sage animate-pulse" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-base tracking-wide">
                    Regional Analysis
                  </h3>
                  <p className="text-[9px] font-mono text-brand-sage uppercase tracking-widest mt-0.5">
                    {districtName}, Maharashtra, India
                  </p>
                </div>
              </div>

              <div className="bg-black/10 border border-white/5 rounded-xl p-4.5 leading-relaxed font-sans text-xs text-white/90">
                <p>
                  <strong>{districtName}</strong> represents a key meteorological subzone in Maharashtra. Under current simulation parameters (Temperature Offset: <span className="text-brand-sage font-mono font-bold">+{tempOffset}°C</span>, Precipitation Offset: <span className="text-brand-sage font-mono font-bold">{rainfallOffset}%</span>), the active grid cell registers a local surface temperature of <span className="text-brand-sage font-mono font-bold">{temp}°C</span> and humidity index at <span className="text-brand-sage font-mono font-bold">{humidity}%</span>.
                </p>
                <p className="mt-3.5">
                  Model forecasts indicate agricultural strain. The simulated temperature surge shifts local evapotranspiration curves, causing a crop stress index of <span className="text-amber-300 font-bold">{cropStress}%</span>. Water availability sits at <span className="text-brand-sage font-bold">{waterAvailability}%</span>, which triggers drought advisories for sandy loam soils.
                </p>
                <p className="mt-3.5">
                  {rainfallOffset < -15 ? (
                    <span className="text-amber-300 font-bold">⚠️ Warning: The precipitation deficit triggers hydrological drought warnings. Vidarbha cotton sowing windows must slide forward by 14 days.</span>
                  ) : rainfallOffset > 25 ? (
                    <span className="text-rose-300 font-bold">🚨 Warning: Heavy precipitation anomaly poses flood hazards along low-lying river basins. High threat to germinating sprouts.</span>
                  ) : (
                    <span>The region remains climatologically stable with minimal heatwave or flood risks under standard decadal baselines.</span>
                  )}
                </p>
              </div>
            </div>

            {/* High-Resolution Analysis Card (Replicating Image 3) */}
            <div className="bg-purple-500/[0.03] border border-violet-500/20 rounded-2xl p-5">
              <h4 className="font-display font-bold text-xs text-violet-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="w-4 h-4" />
                High-Resolution Analysis
              </h4>
              <p className="text-xs text-forest-text/75 leading-relaxed mb-4">
                This analysis uses hourly forecast data at ~1km resolution from the Open-Meteo API with ECMWF weather model. Soil parameters are estimated from the ERA5-Land reanalysis at 0.1° resolution (~9km). For hyperlocal precision, consider supplementing with field-level IoT soil sensors.
              </p>

              <div className="grid grid-cols-3 gap-2.5 text-center font-mono text-[9px]">
                <div className="bg-brand-green/5 border border-brand-green/5 rounded-xl p-2.5">
                  <span className="text-forest-text/40 block uppercase">Model</span>
                  <span className="font-bold text-forest-text block mt-0.5">ECMWF IFS</span>
                </div>
                <div className="bg-brand-green/5 border border-brand-green/5 rounded-xl p-2.5">
                  <span className="text-forest-text/40 block uppercase">Resolution</span>
                  <span className="font-bold text-forest-text block mt-0.5">~1km hourly</span>
                </div>
                <div className="bg-brand-green/5 border border-brand-green/5 rounded-xl p-2.5">
                  <span className="text-forest-text/40 block uppercase">Forecast</span>
                  <span className="font-bold text-forest-text block mt-0.5">5 days ahead</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
