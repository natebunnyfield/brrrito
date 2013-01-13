var http = require('http')
  , api = {
        host: 'api.wunderground.com'
      , key: '576a023a7d846f9c'
      , city: 'Chicago'
      , state: 'IL'
    }
  , http_options_dailies = {
        host: api.host
      , path: ['/api/', api.key, '/forecast10day/q/', api.state, '/', api.city, '.json'].join("")
    }
  , http_options_hourlies = {
        host: api.host
      , path: ['/api/', api.key, '/hourly10day/q/', api.state, '/', api.city, '.json'].join("")
    }
  , forecast = {
        epoch: 0
      , hourlies: []
      , unit: 60*60*1000 // milliseconds
    }

// initialize forecast for the next 6 days
forecast.epoch = new Date()
forecast.epoch.setHours(0, 0, 0, 0)
for (var h = 0; h < 24*12; h++) {
  //forecast.hourlies.push(new Date(value=forecast.epoch.getTime()+(h*forecast.unit)))
  forecast.hourlies.push(null)
}

function windchill(t, v) {
  // http://www.nws.noaa.gov/os/windchill/
  return Math.round(35.74+0.6215*t-35.75*Math.pow(v, 0.16)+0.4275*t*Math.pow(v, 0.16))
}

parse_dailies = function(response) {

  function simplify(o) {
    return {
        date: new Date(o.date.epoch*1000)
      , high: windchill(o.high.fahrenheit, o.avewind.mph)
      , low: windchill(o.low.fahrenheit, o.avewind.mph)
    }
  }

  var str = ''
  response.on('data', function(chunk) {
    str += chunk
  })
  response.on('end', function() {
    dailies = JSON.parse(str).forecast.simpleforecast.forecastday.map(simplify)
    for (var a in dailies) {
      high_time = low_time = dailies[a].date
      low_time.setHours(5, 0, 0, 0)
      forecast.hourlies[(low_time-forecast.epoch)/forecast.unit] = dailies[a].low
      high_time.setHours(16, 0, 0, 0)
      forecast.hourlies[(high_time-forecast.epoch)/forecast.unit] = dailies[a].high
    }
    http.request(http_options_hourlies, parse_hourlies).end()
  })
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
      forecast.hourlies[(hourlies[a].time-forecast.epoch)/forecast.unit] = hourlies[a].temp
    }
    interpolate_forecast()
  })
}

interpolate_forecast = function() {
  console.log(forecast)
}

http.request(http_options_dailies, parse_dailies).end()
