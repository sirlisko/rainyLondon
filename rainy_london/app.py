"""Falcon app."""
import logging

import falcon

import rainy_london.current_weather

logger = logging.getLogger(__name__)

api = falcon.API()
api.add_route(
    '/current_weather',
    rainy_london.current_weather.CurrentWeather()
)
