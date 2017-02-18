"""Module fo worldweatheronline API."""
import logging
import os

import requests

api_key = os.environ['WORLDWEATHERONLINE']
premium_uri = 'https://api.worldweatheronline.com/premium/v1/weather.ashx'

logger = logging.getLogger(__name__)

def get_weather(latitude, longitude):
    """Get the current weather for city_id."""
    query = '{0},{1}'.format(latitude, longitude)
    result = requests.get(premium_uri, params={
        'key': api_key, 'q': query, 'format': 'json'})
    if result.status_code == 200:
        return result.json()
