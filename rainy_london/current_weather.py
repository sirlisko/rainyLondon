"""Class for getting current weather."""
import json
import logging

import falcon

import rainy_london.locationiq
import rainy_london.openweathermap
import rainy_london.worldweatheronline

logger = logging.getLogger(__name__)

class CurrentWeather:
    """CurrentWeather class."""

    def __init__(self):
        """Initializer."""
        self.services = {
            'openweathermap': rainy_london.openweathermap,
            'worldweatheronline': rainy_london.worldweatheronline
        }

    def on_get(self, req, resp):
        """Handle GET requests."""
        result = None
        services = None
        params = req.params

        if 'services' in params:
            services = params['services'] if params['services'] else None

        if 'lat'  in params and 'long' in params:
            result = self.get_weather(params['lat'], params['long'], services)

        elif 'city' in params and 'state' in params:
            _lat, _long = rainy_london.locationiq.get_geoloc(
                params['city'], params['state'])
            result = self.get_weather(_lat, _long, services)

        if result:
            resp.body = json.dumps(result)
            resp.status = falcon.HTTP_200

        else:
            resp.status = falcon.HTTP_400

    def get_weather(self, lat, lon, services):
        """Get weather."""
        result = {}

        if not services:
            services = self.services.keys()

        for service in services:
            result[service] = self.services[service].get_weather(lat, lon)

        return result
