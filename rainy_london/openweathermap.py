"""Module fo openweather API."""
import logging
import os

import requests

api_key = os.environ['OPENWEATHERMAP']
uri = 'http://api.openweathermap.org/data/2.5/weather'
logger = logging.getLogger(__name__)

def get_weather(lat, lon):
    """Get the current weather."""
    result = requests.get(uri, params={
        'appid': api_key, 'lat': lat, 'lon': lon})
    if result.status_code == 200:
        return result.json()
