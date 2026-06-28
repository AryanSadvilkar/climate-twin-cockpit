import React, { createContext, useContext, useState } from "react";

interface TelemetryContextType {
  selectedCoords: { lat: number; lon: number } | null;
  setSelectedCoords: (coords: { lat: number; lon: number } | null) => void;
  selectedName: string | null;
  setSelectedName: (name: string | null) => void;
  activeTelemetry: any;
  setActiveTelemetry: (data: any) => void;
  liveLoading: boolean;
  liveError: string | null;
  allStatesTelemetry: Record<string, any>;
  setAllStatesTelemetry: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export const TelemetryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [activeTelemetry, setActiveTelemetry] = useState<any>(null);
  const [allStatesTelemetry, setAllStatesTelemetry] = useState<Record<string, any>>({});

  return (
    <TelemetryContext.Provider
      value={{
        selectedCoords,
        setSelectedCoords,
        selectedName,
        setSelectedName,
        activeTelemetry,
        setActiveTelemetry,
        liveLoading: false,
        liveError: null,
        allStatesTelemetry,
        setAllStatesTelemetry
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetry = () => {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error("useTelemetry must be used within a TelemetryProvider");
  }
  return context;
};
