var request = require('request')

const weatherDictionary = {
  2: 'rainy',
  3: 'rainy',
  5: 'rainy',
  6: 'cloudy',
  7: 'cloudy',
  8: 'sunny',
  9: 'cloudy'
}

function getData (data) {
  let weatherCode = Math.floor(data.weather[0].id / 100)
  return {
    type: weatherDictionary[weatherCode],
    description: data.weather[0].description,
    clouds: data.clouds.all
  }
}

function getWeather (location, cb) {
  var url = `http://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${process.env.OPENWEATHERMAP_API}`
  request(url, (err, resp, data) => {
    if (err) return cb(err)
    try {
      data = JSON.parse(data)
    } catch (e) {
      return cb(err)
    }
    cb(null, getData(data))
  })
}

module.exports = getWeather
