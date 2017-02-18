"""Location IQ module."""
import logging
import os

import requests

api_key = os.environ['LOCATIONIQ']
uri = 'http://locationiq.org/v1/search.php'

logger = logging.getLogger(__name__)


def get_geoloc(city, state):
    """Get latitude and longitude for a city."""
    query = '{0}, {1}'.format(city, state)
    result = requests.get(uri, params={
        'key': api_key, 'q': query, 'format': 'json'})

    if result.status_code == 200:
        dic = result.json()[0]
        try:
            return float(dic['lat']), float(dic['lon'])
        except KeyError as e:
            logger.error(e)
