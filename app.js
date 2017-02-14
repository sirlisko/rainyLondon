var express = require('express')
var path = require('path')
var weather = require('./modules/current_weather')

var app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function (req, res) {
  weather('London, UK', (e, weather) => res.render('index', weather))
})

var port = process.env.PORT || 3000
app.listen(port, function () {
  console.log('Up and running on port: ' + port)
})
