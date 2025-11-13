import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const getWeatherTool = createTool({
  id: 'getWeather',
  description:
    'Get the current weather at a location. You can provide either coordinates or a city name.',
  inputSchema: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    city: z
      .string()
      .describe("City name (e.g., 'San Francisco', 'New York', 'London')")
      .optional(),
  }),
  outputSchema: z.record(z.string(), z.any()),
  execute: async ({ context }) => {
    const {
      city,
      latitude: lat,
      longitude: lon,
    } = context as {
      city?: string;
      latitude?: number;
      longitude?: number;
    };

    let latitude: number;
    let longitude: number;

    if (city) {
      const coords = await geocodeCity(city);
      if (!coords) {
        return {
          error: `Could not find coordinates for "${city}". Please check the city name.`,
        };
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    } else if (lat !== undefined && lon !== undefined) {
      latitude = lat;
      longitude = lon;
    } else {
      return {
        error:
          'Please provide either a city name or both latitude and longitude coordinates.',
      };
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&hourly=temperature_2m&daily=sunrise,sunset&timezone=auto`
    );

    const weatherData = await response.json();

    if (city) {
      weatherData.cityName = city;
    }

    return weatherData;
  },
});

async function geocodeCity(
  city: string
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
    );

    if (!response.ok) return null;

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch {
    return null;
  }
}
