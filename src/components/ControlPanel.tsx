import React from 'react';

interface ControlPanelProps {
  timelineState: string;
  onTimelineChange: (state: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  timelineState,
  onTimelineChange
}) => {
  // Config for timeline states
  const timelineSteps = [
    { id: 'current', label: 'Today' },
    { id: '24h', label: '24h' },
    { id: '72h', label: '72h' },
    { id: '7d', label: '7d' }
  ];

  return (
    <div className="w-full flex justify-center">
      {/* Timeline Selector - Centered & Compact */}
      <div className="glass-card p-4 border border-brand-green/10 w-full max-w-xl shadow-md">
        <div className="flex items-center justify-between mb-3 px-2">
          <h3 className="font-sans text-[10px] text-forest-text/40 tracking-widest uppercase font-semibold">
            TEMPORAL EXTRAPOLATION
          </h3>
          <span className="font-mono text-[9px] text-brand-green tracking-wider font-semibold">
            Active: {timelineSteps.find(s => s.id === timelineState)?.label}
          </span>
        </div>

        <div className="relative px-[6%]">
          {/* Background Connecting Line */}
          <div className="absolute left-[6%] right-[6%] top-3.5 h-[2px] bg-brand-green/10 z-0 -translate-y-1/2"></div>
          
          {/* Active Progress Line */}
          <div className="absolute left-[6%] right-[6%] top-3.5 h-[2px] z-0 -translate-y-1/2">
            <div 
              className="h-full bg-gradient-to-r from-brand-mint to-brand-green transition-all duration-500 ease-out"
              style={{
                width: 
                  timelineState === 'current' ? '0%' :
                  timelineState === '24h' ? '33.33%' :
                  timelineState === '72h' ? '66.66%' : '100%'
              }}
            ></div>
          </div>

          {/* Timeline Nodes */}
          <div className="relative z-10 flex justify-between">
            {timelineSteps.map((step, index) => {
              const isActive = timelineState === step.id;
              const isCompleted = 
                timelineSteps.findIndex(s => s.id === timelineState) >= index;

              return (
                <button
                  key={step.id}
                  onClick={() => onTimelineChange(step.id)}
                  className="flex flex-col items-center group cursor-pointer focus:outline-none w-12"
                >
                  {/* Node Dot Container */}
                  <div className="h-7 flex items-center justify-center">
                    <div 
                      className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                        isActive 
                          ? 'bg-beige-bg border-brand-green scale-125 shadow-[0_0_8px_rgba(21,128,61,0.4)]' 
                          : isCompleted
                            ? 'bg-brand-green border-brand-green'
                            : 'bg-beige-bg border-brand-green/20 group-hover:border-brand-green/50'
                      }`}
                    >
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>}
                    </div>
                  </div>
                  
                  {/* Step Label */}
                  <span 
                    className={`font-sans text-[9px] tracking-wide font-semibold transition-colors duration-200 ${
                      isActive 
                        ? 'text-brand-green font-bold' 
                        : 'text-forest-text/40 group-hover:text-forest-text/70'
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
