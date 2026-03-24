import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const GEOAPIFY_KEY = import.meta.env.VITE_GEOAPIFY_KEY;
const INITIAL_COORDINATES = { lat: 31.2304, lon: 121.4737 };

const WEATHER_LABELS = {
  0: "Clear Sky",
  1: "Mainly Clear",
  2: "Partly Cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing Rime Fog",
  51: "Light Drizzle",
  53: "Moderate Drizzle",
  55: "Dense Drizzle",
  56: "Light Freezing Drizzle",
  57: "Dense Freezing Drizzle",
  61: "Slight Rain",
  63: "Moderate Rain",
  65: "Heavy Rain",
  66: "Light Freezing Rain",
  67: "Heavy Freezing Rain",
  71: "Slight Snow Fall",
  73: "Moderate Snow Fall",
  75: "Heavy Snow Fall",
  77: "Snow Grains",
  80: "Slight Rain Showers",
  81: "Moderate Rain Showers",
  82: "Violent Rain Showers",
  85: "Slight Snow Showers",
  86: "Heavy Snow Showers",
  95: "Thunderstorm",
  96: "Thunderstorm With Hail",
  99: "Severe Thunderstorm With Hail",
};

const toFahrenheit = (celsius) => (celsius * 9) / 5 + 32;

const formatCoordinate = (value) => Number(value).toFixed(4);

const formatTemperaturePair = (value) => {
  const celsius = Number(value);
  return `${celsius.toFixed(1)}°C / ${toFahrenheit(celsius).toFixed(1)}°F`;
};

const formatWeatherTime = (timestamp) => {
  if (!timestamp) {
    return "--";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
};

const formatDistance = (meters) => {
  if (typeof meters !== "number") {
    return "--";
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};

const pickPlaceCategories = (weatherCode, temperatureC) => {
  if ([95, 96, 99, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return ["radius_1000.entertainment", "radius_500.shopping_mall", "radius_500.cafe", "radius_500.restaurant"];
  }

  if (temperatureC >= 30) {
    return ["radius_1000.tourism", "radius_500.shopping_mall", "radius_500.cafe"];
  }

  if (temperatureC <= 8) {
    return ["radius_1000.entertainment", "radius_1000.tourism", "radius_500.cafe"];
  }

  return ["radius_1000.tourism", "radius_1000.park", "radius_500.cafe"];
};

const buildOutingPlan = (weatherCode, temperatureC) => {
  if ([95, 96, 99].includes(weatherCode)) {
    return {
      title: "Indoor-First Plan",
      detail: "Best window: 11:00 AM to 4:00 PM. Keep the plan mostly indoors.",
    };
  }

  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
    return {
      title: "Compact City Route",
      detail: "Best window: 10:30 AM to 3:30 PM. Keep travel short and stay close to indoor stops.",
    };
  }

  if (temperatureC >= 30) {
    return {
      title: "Heat-Aware Schedule",
      detail: "Best windows: 7:00 AM to 10:00 AM and after 6:00 PM. Avoid midday heat.",
    };
  }

  if (temperatureC <= 8) {
    return {
      title: "Midday Comfort Window",
      detail: "Best window: 10:00 AM to 3:30 PM. Add warm indoor breaks.",
    };
  }

  return {
    title: "Prime Walking Hours",
    detail: "Best windows: 8:30 AM to 11:30 AM and 4:30 PM to 7:30 PM.",
  };
};

const isPlaceDisplayable = (feature) => {
  const properties = feature?.properties || {};
  const categories = properties.categories || [];
  const raw = properties.datasource?.raw || {};
  const name = (properties.name || "").trim();
  const street = (properties.street || "").trim();

  if (!name) {
    return false;
  }

  if (properties.feature_type === "details" || properties.feature_type === "building") {
    return false;
  }

  if (raw.highway || categories.some((category) => category.startsWith("highway"))) {
    return false;
  }

  if (street && name.toLowerCase() === street.toLowerCase()) {
    return false;
  }

  return categories.some((category) =>
    [
      "tourism.attraction",
      "tourism.sights",
      "leisure.park",
      "entertainment.culture",
      "entertainment",
      "catering.cafe",
      "catering.restaurant",
      "commercial.shopping_mall",
    ].some((prefix) => category.startsWith(prefix)),
  );
};

const humanizeCategory = (categories) => {
  const primary = (categories || []).find((category) =>
    [
      "tourism.attraction",
      "tourism.sights",
      "leisure.park",
      "entertainment.culture",
      "entertainment",
      "catering.cafe",
      "catering.restaurant",
      "commercial.shopping_mall",
    ].some((prefix) => category.startsWith(prefix)),
  );

  if (!primary) {
    return "place";
  }

  return primary.split(".").slice(-1)[0].replaceAll("_", " ");
};

const buildPlaceLabel = (feature) => {
  return feature?.place_name || feature?.text || "";
};

export default function WeatherMapPanel({ onWeatherResolved, onLocationResolved }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const placeMarkersRef = useRef([]);
  const [coordinates, setCoordinates] = useState(INITIAL_COORDINATES);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [locationLabel, setLocationLabel] = useState("Shanghai");
  const [locationStatus, setLocationStatus] = useState("Locating");
  const hasRequestedGeolocation = useRef(false);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Unavailable");
      return;
    }

    setLocationStatus("Locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoordinates = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        };

        setCoordinates(nextCoordinates);
        setLocationStatus("Current Location");

        if (markerRef.current) {
          markerRef.current.setLngLat([nextCoordinates.lon, nextCoordinates.lat]);
        }

        if (mapRef.current) {
          mapRef.current.easeTo({
            center: [nextCoordinates.lon, nextCoordinates.lat],
            zoom: 7,
            duration: 1100,
          });
        }
      },
      () => {
        setLocationStatus("Location Denied");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const markerNode = document.createElement("div");
    markerNode.className = "weather-marker";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [INITIAL_COORDINATES.lon, INITIAL_COORDINATES.lat],
      zoom: 3.2,
      pitch: 28,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

    const marker = new mapboxgl.Marker({ element: markerNode, anchor: "center" })
      .setLngLat([INITIAL_COORDINATES.lon, INITIAL_COORDINATES.lat])
      .addTo(map);

    map.on("click", (event) => {
      const nextCoordinates = {
        lat: event.lngLat.lat,
        lon: event.lngLat.lng,
      };

      marker.setLngLat([nextCoordinates.lon, nextCoordinates.lat]);
      setCoordinates(nextCoordinates);
      setLocationStatus("Manual Selection");
      map.easeTo({
        center: [nextCoordinates.lon, nextCoordinates.lat],
        duration: 900,
      });
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      placeMarkersRef.current.forEach((placeMarker) => placeMarker.remove());
      marker.remove();
      map.remove();
      placeMarkersRef.current = [];
      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (hasRequestedGeolocation.current || !navigator.geolocation) {
      if (!navigator.geolocation) {
        setLocationStatus("Unavailable");
      }
      return;
    }

    hasRequestedGeolocation.current = true;
    handleLocateMe();
  }, []);

  useEffect(() => {
    if (!MAPBOX_TOKEN) {
      return;
    }

    const controller = new AbortController();

    async function resolvePlaceLabel() {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lon.toFixed(4)},${coordinates.lat.toFixed(4)}.json?types=address,place,locality,neighborhood,region&limit=1&access_token=${MAPBOX_TOKEN}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const label =
          buildPlaceLabel(data.features?.[0]) ||
          `${formatCoordinate(coordinates.lat)}, ${formatCoordinate(coordinates.lon)}`;

        setLocationLabel(label);
        onLocationResolved?.(label);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          const fallbackLabel = `${formatCoordinate(coordinates.lat)}, ${formatCoordinate(coordinates.lon)}`;
          setLocationLabel(fallbackLabel);
          onLocationResolved?.(fallbackLabel);
        }
      }
    }

    resolvePlaceLabel();

    return () => controller.abort();
  }, [coordinates, onLocationResolved]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchWeather() {
      setWeatherLoading(true);
      setWeatherError("");

      try {
        const search = new URLSearchParams({
          latitude: coordinates.lat.toFixed(4),
          longitude: coordinates.lon.toFixed(4),
          current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
          timezone: "auto",
        });

        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${search.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok || !data.current) {
          throw new Error("Unable to load live weather.");
        }

        setWeather(data);

        const placeLabel = locationLabel || `${formatCoordinate(coordinates.lat)}, ${formatCoordinate(coordinates.lon)}`;
        if (locationStatus !== "Locating") {
          onWeatherResolved?.({
            temperatureC: Number(data.current.temperature_2m),
            placeLabel,
            coordinates,
          });
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setWeatherError(requestError.message || "Unable to load live weather.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    }

    fetchWeather();
    const intervalId = window.setInterval(fetchWeather, 300000);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [coordinates, locationLabel, locationStatus, onWeatherResolved]);

  const weatherSummary = useMemo(() => {
    if (!weather?.current) {
      return null;
    }

    const current = weather.current;
    return {
      label: WEATHER_LABELS[current.weather_code] || "Live Weather",
      currentTemp: formatTemperaturePair(current.temperature_2m),
      apparentTemp: formatTemperaturePair(current.apparent_temperature),
      humidity: `${current.relative_humidity_2m}%`,
      wind: `${Number(current.wind_speed_10m).toFixed(1)} km/h`,
      updatedAt: formatWeatherTime(current.time),
      timezone: weather.timezone_abbreviation || weather.timezone || "--",
    };
  }, [weather]);

  useEffect(() => {
    if (!GEOAPIFY_KEY || !weather?.current) {
      return;
    }

    const controller = new AbortController();

    async function fetchNearbyPlaces() {
      setPlacesLoading(true);
      setPlacesError("");

      try {
        const current = weather.current;
        const features = pickPlaceCategories(current.weather_code, Number(current.temperature_2m));
        const search = new URLSearchParams({
          lat: coordinates.lat.toFixed(4),
          lon: coordinates.lon.toFixed(4),
          features: features.join(","),
          lang: "en",
          apiKey: GEOAPIFY_KEY,
        });

        const response = await fetch(`https://api.geoapify.com/v2/place-details?${search.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error("Unable to load nearby places.");
        }

        const uniqueNames = new Set();
        const nextPlaces = (data.features || [])
          .filter(isPlaceDisplayable)
          .filter((feature) => {
            const name = (feature.properties?.name || feature.properties?.address_line1 || "").trim().toLowerCase();
            if (!name || uniqueNames.has(name)) {
              return false;
            }

            uniqueNames.add(name);
            return true;
          })
          .map((feature) => ({
            id: feature.properties.place_id || `${feature.properties.feature_type}-${feature.properties.lon}-${feature.properties.lat}`,
            name: feature.properties.name || feature.properties.address_line1 || "Unnamed place",
            address: feature.properties.formatted || feature.properties.address_line2 || "Address unavailable",
            distance: feature.properties.distance,
            category: humanizeCategory(feature.properties.categories),
            lon: feature.geometry?.coordinates?.[0] ?? feature.properties.lon,
            lat: feature.geometry?.coordinates?.[1] ?? feature.properties.lat,
          }))
          .sort((left, right) => (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER))
          .slice(0, 6);

        setPlaces(nextPlaces);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setPlacesError(requestError.message || "Unable to load nearby places.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setPlacesLoading(false);
        }
      }
    }

    fetchNearbyPlaces();

    return () => controller.abort();
  }, [coordinates, weather]);

  const outingPlan = useMemo(() => {
    if (!weather?.current) {
      return {
        title: "Outing Plan",
        detail: "Waiting for local weather before shaping the route.",
      };
    }

    return buildOutingPlan(weather.current.weather_code, Number(weather.current.temperature_2m));
  }, [weather]);

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    placeMarkersRef.current.forEach((placeMarker) => placeMarker.remove());
    placeMarkersRef.current = [];

    places.forEach((place, index) => {
      if (typeof place.lon !== "number" || typeof place.lat !== "number") {
        return;
      }

      const markerNode = document.createElement("button");
      markerNode.className = "place-pin";
      markerNode.type = "button";
      markerNode.textContent = String(index + 1);
      markerNode.setAttribute("aria-label", place.name);

      const popup = new mapboxgl.Popup({
        offset: 18,
        closeButton: false,
      }).setHTML(
        `<div class="place-popup"><strong>${place.name}</strong><span>${place.category}</span><small>${formatDistance(place.distance)}</small></div>`,
      );

      const placeMarker = new mapboxgl.Marker({ element: markerNode, anchor: "bottom" })
        .setLngLat([place.lon, place.lat])
        .setPopup(popup)
        .addTo(mapRef.current);

      placeMarkersRef.current.push(placeMarker);
    });
  }, [places]);

  const handlePlaceFocus = (place) => {
    if (!mapRef.current || typeof place.lon !== "number" || typeof place.lat !== "number") {
      return;
    }

    mapRef.current.easeTo({
      center: [place.lon, place.lat],
      zoom: Math.max(mapRef.current.getZoom(), 11),
      duration: 800,
    });
  };

  if (!MAPBOX_TOKEN) {
    return (
      <section className="weather-card weather-stage weather-card-empty">
        <p className="eyebrow">Weather Atlas</p>
        <h3>Map access token missing</h3>
        <p>Add `VITE_MAPBOX_TOKEN` to `frontend/.env.local` and restart.</p>
      </section>
    );
  }

  return (
    <section className="weather-card weather-stage">
      <div className="weather-stage-header">
        <div className="weather-stage-copy">
          <p className="eyebrow">Weather Atlas</p>
          <h2>Pick a point. Read the day.</h2>
          <p>See live weather, nearby places, and a simple outing plan for the selected location.</p>
          <button type="button" className="locate-button" onClick={handleLocateMe}>
            Use My Location
          </button>
        </div>

        <div className="weather-stage-summary">
          <div className="weather-summary-card">
            <span>Current Air</span>
            <strong>{weatherSummary?.currentTemp || "--"}</strong>
          </div>
          <div className="weather-summary-card">
            <span>Location</span>
            <strong>{locationLabel || locationStatus}</strong>
          </div>
        </div>
      </div>

      <div className="map-frame map-frame-large" ref={mapContainerRef} />

      <div className="weather-meta weather-stage-grid">
        <div className="weather-meta-row">
          <span>Selected Point</span>
          <strong>{formatCoordinate(coordinates.lat)}, {formatCoordinate(coordinates.lon)}</strong>
        </div>
        <div className="weather-meta-row">
          <span>Updated</span>
          <strong>{weatherSummary?.updatedAt || "--"}</strong>
        </div>
        <div className="weather-meta-row">
          <span>Status</span>
          <strong>{weatherLoading ? "Refreshing" : locationStatus}</strong>
        </div>
      </div>

      {weatherError ? <p className="error-text">{weatherError}</p> : null}

      <div className="weather-grid">
        <div className="weather-stat">
          <span>Current</span>
          <strong>{weatherSummary?.currentTemp || "--"}</strong>
        </div>
        <div className="weather-stat">
          <span>Feels Like</span>
          <strong>{weatherSummary?.apparentTemp || "--"}</strong>
        </div>
        <div className="weather-stat">
          <span>Humidity</span>
          <strong>{weatherSummary?.humidity || "--"}</strong>
        </div>
        <div className="weather-stat">
          <span>Wind</span>
          <strong>{weatherSummary?.wind || "--"}</strong>
        </div>
      </div>

      <div className="itinerary-card">
        <div className="card-head">
          <span>Suggested Outing Window</span>
          <small>Based on local weather</small>
        </div>
        <div className="outing-plan">
          <strong>{outingPlan.title}</strong>
          <p>{outingPlan.detail}</p>
        </div>
      </div>

      <div className="itinerary-card">
        <div className="card-head">
          <span>Nearby Recommendations</span>
          <small>{placesLoading ? "Refreshing" : "Nearby picks"}</small>
        </div>

        {placesError ? <p className="error-text">{placesError}</p> : null}

        <div className="place-list">
          {places.length ? (
            places.map((place) => (
              <button type="button" className="place-item" key={place.id} onClick={() => handlePlaceFocus(place)}>
                <div>
                  <strong>{place.name}</strong>
                  <p>{place.address}</p>
                </div>
                <div className="place-meta">
                  <span>{formatDistance(place.distance)}</span>
                  <small>{place.category}</small>
                </div>
              </button>
            ))
          ) : (
            <p className="empty-state">{placesLoading ? "Looking for places..." : "No nearby places found."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
