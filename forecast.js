var http = require('http')
  , api = {
        host: 'api.wunderground.com'
      , key: '576a023a7d846f9c'
      , city: 'Chicago'
      , state: 'IL'
    }
  , http_options = {
        host: api.host
      , path: ['/api/', api.key, '/hourly10day/q/', api.state, '/', api.city, '.json'].join("")
    }
  , forecast = {
        epoch: 0
      , temps: []
      , unit: 60*60*1000 // milliseconds
    }

// initialize forecast for the next 6 days
forecast.epoch = new Date()
forecast.epoch.setHours(0, 0, 0, 0)
for (var h = 0; h < 24*11; h++) {
  //forecast.temps.push(new Date(value=forecast.epoch.getTime()+(h*forecast.unit)))
  forecast.temps.push(undefined)
}

function windchill(t, v) {
  // http://www.nws.noaa.gov/os/windchill/
  return Math.round(35.74+0.6215*t-35.75*Math.pow(v, 0.16)+0.4275*t*Math.pow(v, 0.16))
}

parse_hourlies = function(response) {

  function simplify(o) {
    return {
        time: new Date(o.FCTTIME.epoch*1000)
      , temp: windchill(o.temp.english, o.wspd.english)
    }
  }

  var str = ''
  response.on('data', function(chunk) {
    str += chunk
  })
  response.on('end', function() {
    hourlies = JSON.parse(str).hourly_forecast.map(simplify)
    for (var a in hourlies) {
      forecast.temps[(hourlies[a].time-forecast.epoch)/forecast.unit] = hourlies[a].temp
    }
    interpolate_forecast()
  })
}

interpolate_forecast = function() {
  console.log(forecast)
}

http.request(http_options, parse_hourlies).end()
