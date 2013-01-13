var http = require('http')
  , api = {
    host: 'api.wunderground.com'
  , key: '576a023a7d846f9c'
  , city: 'Chicago'
  , state: 'IL'
}
  , http_options_daily = {
    host: api.host
  , path: ['/api/', api.key, '/forecast/q/', api.state, '/', api.city, '.json'].join("")
}
  , http_options_hourly = {
    host: api.host
  , path: ['/api/', api.key, '/hourly/q/', api.state, '/', api.city, '.json'].join("")
}

forecast = {}

function windchill(t, v) {
  // http://www.nws.noaa.gov/os/windchill/
  return Math.round(35.74+0.6215*t-35.75*Math.pow(v, 0.16)+0.4275*t*Math.pow(v, 0.16))
}

function build_day(h, l) {
  // lazy and reasonable diurnal thermal lag and whatever else simulator
  // interpolate using 4am as the lowest temp and 4pm being the highest temp
  //
  // best to build an hourly coeffecient table built from
  //   daily high/low
  //   vs. observed hourly temps
  //   from historical data
  day = []
  for (var hour = 0; hour < 24; hour++) {
    day.push(Math.round(Math.abs(hour % 24 - 12)/12*(h-l)+l))
  }
  // Kinda sorta forget how to offset in the equation, so…
  for (var i = 0; i < 8; i++) {
    day.push(day.shift())
  }
  return day
}

parse_daily = function(response) {

  function simplify(o) {
    temp = ((+o.low.fahrenheit)+(+o.high.fahrenheit))/2
    return {
        time: o.date.epoch*1000
      , temp: windchill(temp, o.avewind.mph)
    }
  }

  var str = ''
  response.on('data', function(chunk) {
    str += chunk
  })
  response.on('end', function() {
    dailies = JSON.parse(str).forecast.simpleforecast.forecastday.map(simplify)
    for (var a in dailies) {
      forecast[dailies[a].time] = dailies[a].temp
      console.log(forecast)
    }
  })
}

parse_hourly = function(response) {

  function simplify(o) {
    return {
        time: o.FCTTIME.epoch*1000
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
      forecast[hourlies[a].time] = hourlies[a].temp
      console.log(forecast)
    }
  })
}

http.request(http_options_daily, parse_daily).end()
// http.request(http_options_hourly, parse_hourly).end()
