package com.noah.temperatureconverter.dto;

public enum TemperatureUnit {
    CELSIUS("C", "Celsius"),
    FAHRENHEIT("F", "Fahrenheit");

    private final String symbol;
    private final String displayName;

    TemperatureUnit(String symbol, String displayName) {
        this.symbol = symbol;
        this.displayName = displayName;
    }

    public String getSymbol() {
        return symbol;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static TemperatureUnit from(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Temperature unit is required.");
        }

        return switch (value.trim().toUpperCase()) {
            case "C", "CELSIUS" -> CELSIUS;
            case "F", "FAHRENHEIT" -> FAHRENHEIT;
            default -> throw new IllegalArgumentException("Unsupported temperature unit: " + value);
        };
    }
}
