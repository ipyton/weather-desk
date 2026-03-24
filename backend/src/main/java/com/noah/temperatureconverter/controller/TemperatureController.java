package com.noah.temperatureconverter.controller;

import com.noah.temperatureconverter.dto.ConversionResponse;
import com.noah.temperatureconverter.dto.TemperatureUnit;
import com.noah.temperatureconverter.service.TemperatureConversionService;
import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1")
public class TemperatureController {

    private final TemperatureConversionService conversionService;

    public TemperatureController(TemperatureConversionService conversionService) {
        this.conversionService = conversionService;
    }

    @GetMapping("/convert")
    public ConversionResponse convert(
            @RequestParam BigDecimal value,
            @RequestParam String from,
            @RequestParam String to
    ) {
        try {
            return conversionService.convert(value, TemperatureUnit.from(from), TemperatureUnit.from(to));
        } catch (IllegalArgumentException exception) {
            throw exception;
        }
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }
}
