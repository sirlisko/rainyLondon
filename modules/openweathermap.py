"""Module fo openweather API."""
import requests
import pprint


def create_url(query):
    """Create the url."""
    try:
        api_key = os.environ['openweatherkey']
    except KeyError as e:
        logger.error(e)
        return
       
    basic_uri = 'http://samples.openweathermap.org/data/2.5/'
    current_weather = 'weather?q={0}'
    app_id = 'appid={0}'
    url = basic_uri + appid.format(API_KEY) + current_weather.format(query)
    return url


def get_weather(city_id=None, name=None, state=None):
    """Get the current weather for city_id."""
    if not city_id and not name:
        return
    
    query = city_id if city_id else name + ',' + state
    
    result = requests.get(create_url(query))
    
    if result.status_code == 200:
        return result.json()
