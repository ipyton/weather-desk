package com.noah.temperatureconverter.dto;

import java.math.BigDecimal;

public record ConversionResponse(
        BigDecimal inputValue,
        BigDecimal outputValue,
        TemperatureUnit fromUnit,
        TemperatureUnit toUnit,
        String formula,
        String climateTag
) {
}
