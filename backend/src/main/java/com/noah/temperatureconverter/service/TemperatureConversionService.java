package com.noah.temperatureconverter.service;

import com.noah.temperatureconverter.dto.ConversionResponse;
import com.noah.temperatureconverter.dto.TemperatureUnit;
import java.math.BigDecimal;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;

@Service
public class TemperatureConversionService {

    private static final BigDecimal THIRTY_TWO = BigDecimal.valueOf(32);
    private static final BigDecimal FIVE = BigDecimal.valueOf(5);
    private static final BigDecimal NINE = BigDecimal.valueOf(9);

    public ConversionResponse convert(BigDecimal value, TemperatureUnit from, TemperatureUnit to) {
        if (from == to) {
            return new ConversionResponse(
                    scale(value),
                    scale(value),
                    from,
                    to,
                    "Same unit selected, value remains unchanged.",
                    describeClimate(from == TemperatureUnit.CELSIUS ? value : toCelsius(value))
            );
        }

        BigDecimal converted = from == TemperatureUnit.CELSIUS
                ? toFahrenheit(value)
                : toCelsius(value);

        BigDecimal celsiusValue = from == TemperatureUnit.CELSIUS ? value : converted;

        return new ConversionResponse(
                scale(value),
                scale(converted),
                from,
                to,
                formulaFor(from),
                describeClimate(celsiusValue)
        );
    }

    private BigDecimal toFahrenheit(BigDecimal celsius) {
        return celsius.multiply(NINE).divide(FIVE, 6, RoundingMode.HALF_UP).add(THIRTY_TWO);
    }

    private BigDecimal toCelsius(BigDecimal fahrenheit) {
        return fahrenheit.subtract(THIRTY_TWO).multiply(FIVE).divide(NINE, 6, RoundingMode.HALF_UP);
    }

    private BigDecimal scale(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private String formulaFor(TemperatureUnit from) {
        return from == TemperatureUnit.CELSIUS
                ? "F = C x 9 / 5 + 32"
                : "C = (F - 32) x 5 / 9";
    }

    private String describeClimate(BigDecimal celsius) {
        double value = celsius.doubleValue();
        if (value <= 0) {
            return "Icy";
        }
        if (value <= 16) {
            return "Cool";
        }
        if (value <= 26) {
            return "Comfort";
        }
        if (value <= 34) {
            return "Warm";
        }
        return "Hot";
    }
}
