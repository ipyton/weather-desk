import { Suspense, lazy, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import TemperatureDial from "./components/TemperatureDial";

const WeatherMapPanel = lazy(() => import("./components/WeatherMapPanel"));

const MODES = {
  C_TO_F: { from: "C", to: "F", title: "Celsius to Fahrenheit" },
  F_TO_C: { from: "F", to: "C", title: "Fahrenheit to Celsius" },
};

const PRESETS = {
  C_TO_F: ["0", "18", "26", "37", "100"],
  F_TO_C: ["32", "68", "86", "98.6", "212"],
};

const formatNumber = (value) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

const formatTemperaturePair = (celsius) => `${formatNumber(celsius)}°C / ${formatNumber(toFahrenheit(celsius))}°F`;

const deriveCelsius = (result) => {
  if (!result) {
    return 20;
  }

  return result.fromUnit === "CELSIUS" ? Number(result.inputValue) : Number(result.outputValue);
};

const getOutfitInsight = (celsius) => {
  if (celsius <= -20) {
    return {
      title: "Arctic Ready",
      advice: "Go full winter: down parka, thermal base layer, gloves, and insulated boots.",
    };
  }

  if (celsius <= -10) {
    return {
      title: "Severe Cold",
      advice: "Choose a heavy coat, knit layers, thick socks, gloves, and a beanie.",
    };
  }

  if (celsius <= 0) {
    return {
      title: "Deep Winter",
      advice: "A wool coat or padded jacket with a sweater and scarf works best.",
    };
  }

  if (celsius <= 10) {
    return {
      title: "Cold but Manageable",
      advice: "Wear a coat or bomber over knitwear with long pants and closed shoes.",
    };
  }

  if (celsius <= 20) {
    return {
      title: "Light Layer Zone",
      advice: "A shirt with a light jacket, trench, or cardigan is enough.",
    };
  }

  if (celsius <= 30) {
    return {
      title: "Comfortably Warm",
      advice: "Keep it breathable: T-shirt, light shirt, or airy trousers.",
    };
  }

  if (celsius <= 40) {
    return {
      title: "Hot Weather Mode",
      advice: "Loose cotton or linen, lighter colors, and sun protection are the right call.",
    };
  }

  return {
    title: "Extreme Heat",
    advice: "Use ultra-light fabrics, minimal layers, and stay hydrated.",
  };
};

const getTemperatureTheme = (celsius) => {
  if (celsius <= 0) {
    return {
      "--accent": "#2c6dff",
      "--accent-deep": "#1b3f91",
      "--accent-soft": "#d9e7ff",
      "--line": "rgba(44, 109, 255, 0.12)",
      "--shadow": "0 28px 80px rgba(36, 86, 175, 0.12)",
      "--bg-gradient": "radial-gradient(circle at top left, rgba(74, 140, 255, 0.18), transparent 28%), radial-gradient(circle at 88% 12%, rgba(155, 206, 255, 0.18), transparent 18%), linear-gradient(180deg, #f8fbff 0%, #edf4ff 58%, #e4ecf8 100%)",
      "--ambient-a-color": "rgba(74, 140, 255, 0.12)",
      "--ambient-b-color": "rgba(118, 195, 255, 0.12)",
      "--hero-tint": "rgba(44, 109, 255, 0.08)",
      "--weather-tint": "rgba(74, 140, 255, 0.08)",
      "--spotlight-tint": "rgba(44, 109, 255, 0.1)",
      "--dial-start": "#66b8ff",
      "--dial-mid": "#cde8ff",
      "--dial-end": "#2c6dff",
    };
  }

  if (celsius <= 18) {
    return {
      "--accent": "#db0011",
      "--accent-deep": "#8f0f1c",
      "--accent-soft": "#f4d7d8",
      "--line": "rgba(145, 24, 32, 0.12)",
      "--shadow": "0 28px 80px rgba(108, 24, 33, 0.12)",
      "--bg-gradient": "radial-gradient(circle at top left, rgba(219, 0, 17, 0.12), transparent 26%), radial-gradient(circle at 88% 12%, rgba(143, 15, 28, 0.1), transparent 18%), linear-gradient(180deg, #fffdfa 0%, #f7f2ec 58%, #f1e7e1 100%)",
      "--ambient-a-color": "rgba(219, 0, 17, 0.08)",
      "--ambient-b-color": "rgba(143, 15, 28, 0.07)",
      "--hero-tint": "rgba(219, 0, 17, 0.08)",
      "--weather-tint": "rgba(219, 0, 17, 0.08)",
      "--spotlight-tint": "rgba(219, 0, 17, 0.1)",
      "--dial-start": "#db0011",
      "--dial-mid": "#ffd9a6",
      "--dial-end": "#8f0f1c",
    };
  }

  if (celsius <= 30) {
    return {
      "--accent": "#d97706",
      "--accent-deep": "#a94c10",
      "--accent-soft": "#fde5c4",
      "--line": "rgba(169, 76, 16, 0.12)",
      "--shadow": "0 28px 80px rgba(169, 76, 16, 0.12)",
      "--bg-gradient": "radial-gradient(circle at top left, rgba(245, 158, 11, 0.16), transparent 26%), radial-gradient(circle at 88% 12%, rgba(251, 191, 36, 0.14), transparent 18%), linear-gradient(180deg, #fffaf2 0%, #fbf0df 58%, #f5e4c9 100%)",
      "--ambient-a-color": "rgba(245, 158, 11, 0.09)",
      "--ambient-b-color": "rgba(249, 115, 22, 0.08)",
      "--hero-tint": "rgba(245, 158, 11, 0.08)",
      "--weather-tint": "rgba(249, 115, 22, 0.08)",
      "--spotlight-tint": "rgba(245, 158, 11, 0.12)",
      "--dial-start": "#ffb84d",
      "--dial-mid": "#ffd27a",
      "--dial-end": "#f97316",
    };
  }

  return {
    "--accent": "#e24b2f",
    "--accent-deep": "#a3261a",
    "--accent-soft": "#ffd8cf",
    "--line": "rgba(162, 38, 26, 0.12)",
    "--shadow": "0 28px 80px rgba(162, 38, 26, 0.14)",
    "--bg-gradient": "radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 26%), radial-gradient(circle at 88% 12%, rgba(239, 68, 68, 0.14), transparent 18%), linear-gradient(180deg, #fff7f2 0%, #fbe6dd 58%, #f4d4ca 100%)",
    "--ambient-a-color": "rgba(249, 115, 22, 0.1)",
    "--ambient-b-color": "rgba(239, 68, 68, 0.08)",
    "--hero-tint": "rgba(249, 115, 22, 0.09)",
    "--weather-tint": "rgba(239, 68, 68, 0.09)",
    "--spotlight-tint": "rgba(249, 115, 22, 0.13)",
    "--dial-start": "#ff9b54",
    "--dial-mid": "#ffcf70",
    "--dial-end": "#e24b2f",
  };
};

export default function App() {
  const [mode, setMode] = useState("C_TO_F");
  const [inputValue, setInputValue] = useState("26");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPlace, setCurrentPlace] = useState("Awaiting location");
  const [currentWeatherC, setCurrentWeatherC] = useState(null);

  const deferredValue = useDeferredValue(inputValue);
  const activeMode = MODES[mode];

  useEffect(() => {
    if (deferredValue === "" || Number.isNaN(Number(deferredValue))) {
      setResult(null);
      setError(deferredValue === "" ? "" : "Please enter a valid number.");
      return;
    }

    const controller = new AbortController();
    const search = new URLSearchParams({
      value: deferredValue,
      from: activeMode.from,
      to: activeMode.to,
    });

    async function convert() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/v1/convert?${search.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Conversion failed.");
        }

        setResult(data);
        startTransition(() => {
          setHistory((current) => {
            const nextItem = {
              id: `${data.fromUnit}-${data.toUnit}-${data.inputValue}-${Date.now()}`,
              input: `${formatNumber(Number(data.inputValue))}°${activeMode.from}`,
              output: `${formatNumber(Number(data.outputValue))}°${activeMode.to}`,
              tag: data.climateTag,
            };

            return [nextItem, ...current.filter((item) => item.input !== nextItem.input || item.output !== nextItem.output)].slice(0, 6);
          });
        });
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    convert();
    return () => controller.abort();
  }, [activeMode.from, activeMode.to, deferredValue]);

  const celsiusView = useMemo(() => deriveCelsius(result), [result]);
  const climateCelsius = currentWeatherC ?? celsiusView;
  const outfitInsight = useMemo(() => getOutfitInsight(climateCelsius), [climateCelsius]);
  const temperatureTheme = useMemo(() => getTemperatureTheme(climateCelsius), [climateCelsius]);

  const handleWeatherResolved = useCallback((payload) => {
    if (!payload) {
      return;
    }

    if (typeof payload.temperatureC === "number") {
      setCurrentWeatherC(payload.temperatureC);
      setInputValue((current) => (current === "26" || current === "" ? payload.temperatureC.toFixed(1) : current));
    }

    if (payload.placeLabel) {
      setCurrentPlace(payload.placeLabel);
    }
  }, []);

  const handleLocationResolved = useCallback((placeLabel) => {
    if (placeLabel) {
      setCurrentPlace(placeLabel);
    }
  }, []);

  return (
    <div className="app-shell" style={temperatureTheme}>
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <main className="layout">
        <header className="brand-bar">
          <div className="brand-lockup">
            <img src="/hsbc-logo.png" alt="HSBC logo" className="brand-logo-image" />
            <div>
              <p className="brand-kicker">Private Weather Desk</p>
              <strong className="brand-name">Thermal Shift Reserve</strong>
            </div>
          </div>
          <div className="brand-note">Live weather, conversion, and local plans.</div>
        </header>

        <Suspense
          fallback={
            <div className="weather-card weather-stage weather-card-empty">
              <p className="eyebrow">Weather Atlas</p>
              <h3>Loading the map</h3>
              <p>The live weather canvas is being prepared.</p>
            </div>
          }
        >
          <WeatherMapPanel onWeatherResolved={handleWeatherResolved} onLocationResolved={handleLocationResolved} />
        </Suspense>

        <section className="content-grid">
          <section className="hero-panel">
            <p className="eyebrow">Climate View</p>
            <h1>Thermal Shift</h1>
            <p className="hero-copy">Read the weather fast. Convert temperature instantly. Plan the day with more confidence.</p>

            <div className="hero-metrics">
              <div className="hero-metric">
                <span>Current Place</span>
                <strong>{currentPlace}</strong>
              </div>
              <div className="hero-metric">
                <span>Selected Scale</span>
                <strong>{activeMode.from} to {activeMode.to}</strong>
              </div>
              <div className="hero-metric">
                <span>Local Air</span>
                <strong>{formatTemperaturePair(climateCelsius)}</strong>
              </div>
            </div>

            <div className="converter-card">
              <div className="converter-head">
                <div>
                  <p className="eyebrow">Temperature Conversion</p>
                  <h2>Convert temperature</h2>
                </div>
                <div className="mode-switch">
                  {Object.entries(MODES).map(([key, item]) => (
                    <button
                      key={key}
                      className={key === mode ? "mode-chip active" : "mode-chip"}
                      onClick={() => setMode(key)}
                      type="button"
                    >
                      {item.from} → {item.to}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="temperature-input">Temperature Input</label>
                <div className="input-frame">
                  <input
                    id="temperature-input"
                    inputMode="decimal"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    placeholder={`Enter a value in °${activeMode.from}`}
                  />
                  <span className="unit-badge">°{activeMode.from}</span>
                </div>
              </div>

              <div className="preset-row">
                {PRESETS[mode].map((preset) => (
                  <button key={preset} type="button" className="preset-chip" onClick={() => setInputValue(preset)}>
                    {preset}°{activeMode.from}
                  </button>
                ))}
              </div>

              <div className="result-panel">
                <div>
                  <p className="result-label">{activeMode.title}</p>
                  <h2>{result ? `${formatNumber(Number(result.outputValue))}°${activeMode.to}` : "--"}</h2>
                </div>
                <div className="status-pill">{loading ? "Refreshing" : result?.climateTag || "Standby"}</div>
              </div>

              <div className="formula-bar">
                <span>Formula</span>
                <strong>{result?.formula || "F = C x 9 / 5 + 32"}</strong>
              </div>

              {error ? <p className="error-text">{error}</p> : null}
            </div>
          </section>

          <section className="insight-panel">
            <div className="insight-card spotlight-card">
              <p className="eyebrow">What to Wear</p>
              <h3>{outfitInsight.title}</h3>
              <p>{outfitInsight.advice}</p>
            </div>

            <div className="insight-cluster">
              <TemperatureDial celsius={celsiusView} />

              <div className="history-card">
                <div className="card-head">
                  <span>Recent Conversions</span>
                  <small>Latest values</small>
                </div>
                <div className="history-list">
                  {history.length ? (
                    history.map((item) => (
                      <div className="history-item" key={item.id}>
                        <div>
                          <strong>{item.output}</strong>
                          <p>{item.input}</p>
                        </div>
                        <span>{item.tag}</span>
                      </div>
                    ))
                  ) : (
                    <p className="empty-state">Your latest conversions will appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}
