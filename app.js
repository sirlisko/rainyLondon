var express = require('express')
var path = require('path')

var app = express()

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.static(path.join(__dirname, 'public')))

app.get('/', function (req, res) {
  res.render('index', { title: 'Express' })
})

var port = process.env.PORT || 3000
app.listen(port, function () {
  console.log('Up and running on port: ' + port)
})
