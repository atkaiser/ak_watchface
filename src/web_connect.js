// Global vars
var forecastUrl = 'http://api.wunderground.com/api/801311f587b14fc7/';

// Helper function for sending an xml http request
function xhrRequest(url, type, state, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText, state);
  };
  xhr.open(type, url);
  xhr.send();
}

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

function convertEastToWest(start) {
  var hours = Number(start.substr(0, start.indexOf(":")));
  var min = Number(start.substr(start.indexOf(":")+1, 2));
  var am_pm = start.substr(start.indexOf(" ")+1, 2);
  if (am_pm == "PM") {
    hours += 12;
  }
  var eastTime = new Date(2015, 0, 1, hours, min);
  var westTime = new Date(eastTime - 3*60*60*1000);
  var timeOfDay = "AM";
  var newHours = westTime.getHours();
  var newMin = westTime.getMinutes();
  if (newHours >= 12) {
    newHours -= 12;
    timeOfDay = "PM";
  }
  var newTime = newHours + ":" + pad(newMin, 2) + " " + timeOfDay;
  return newTime;
}

// Send the weather results to the pebble
function sendWeather(temperature, conditions, city) {
  // Assemble dictionary using our keys
  var dictionary = {
    'KEY_TEMPERATURE': temperature,
    'KEY_CONDITIONS': conditions,
    'KEY_CITY': city,
  };

  Pebble.sendAppMessage(dictionary,
                        function(e) {
                          console.log('Weather info sent to Pebble successfully!');
                        },
                        function(e) {
                          console.log('Error sending weather info to Pebble!');
                        }
                       );
}

function getWeatherLocation(pos) {
//   var date = new Date();
//   var dayOfWeek = date.getDay();
  var position = '';
//   if ((dayOfWeek >= 1 && dayOfWeek <= 4) ||
//       (dayOfWeek === 0 && date.getHours() >= 15) ||
//       (dayOfWeek === 5 && date.getHours() < 15)) {
//     // Get San Mateo weather
//     position = '37.561,-122.286';
//   } else {
    console.log("Lat: " + pos.coords.latitude);
    console.log("Lon: " + pos.coords.longitude);
    position = pos.coords.latitude + ',' + pos.coords.longitude;
//   }
  return position;
}

// Pares the city response and send back the info for weather
// State contains temperature and conditions
function parseCity(cityResponse, state) {
  var temperature = state.temperature;
  var conditions = state.conditions;
  var cityJson = JSON.parse(cityResponse);
          
  var address = cityJson.results[0].address_components;
  var component = 0;
  while(address[component].types.indexOf("locality") < 0) {
    component++;
  }

  var city = address[component].short_name;

  console.log('City is ' + city);
  sendWeather(temperature, conditions, city);
}

// State has pos, temperature, conditions
function parseCurrentTemp(responseText, state) {
  var pos = state.pos;
  
  var json = JSON.parse(responseText);

  var temperature = json.current_observation.temp_f;
  console.log('Temperature is ' + temperature);
  var forecastTemp = state.temperature;
  state.temperature = Math.round(temperature) + "/" + Math.round(forecastTemp);
  
  var locationUrl = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + getWeatherLocation(pos);

  xhrRequest(locationUrl, 'GET', state,
             parseCity);
  
}

// Parse the response temperature and get the city
// State contains pos
function parseForecast(responseText, state) {
  var pos = state.pos;
  
  var desiredDate = new Date();
  var hour = desiredDate.getHours();
  if (hour >= 15) {
    desiredDate.setDate(desiredDate.getDate() + 1);
  }
  
  var json = JSON.parse(responseText);
  
  var forecasts = json.forecast.simpleforecast.forecastday;
  var forecast;
  for(var i = 0; i < forecasts.length; i++) {
    if (forecasts[i].date.day == desiredDate.getDate()) {
      forecast = forecasts[i];
    }
  }
  
  var temperature = forecast.high.fahrenheit;
  var conditions = forecast.icon;

  // Get the current weather
  var position = pos.coords.latitude + ',' + pos.coords.longitude;
  var url = forecastUrl + 'conditions/q/' + position + '.json';
  console.log('current url: ' + url);
  
  xhrRequest(url, 'GET', {pos: pos,
                          temperature: temperature,
                          conditions: conditions}, parseCurrentTemp);
}

// After getting the location, get the weather
function locationSuccess(pos) {
  var url = forecastUrl + 'forecast/q/' +
            getWeatherLocation(pos) + '.json';

  console.log('Forecast URL: ' + url);
  
  xhrRequest(url, 'GET', {pos: pos}, parseForecast);
}

function locationError(err) {
  console.log('Error requesting location!');
}

function getWeather() {
  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    {timeout: 15000, maximumAge: 60000}
  );
}

function getTraffic(morning) {
  var url;
  if (morning == '0') {
    url = "http://sc2ls.mooo.com:10000/time?origin=37+May+Ct,+Hayward,+CA+94544&destination=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404";
//     url = "http://www.mapquestapi.com/directions/v2/route?key=affE1LXAEKtDF8KfXG7fAx0XHG7NweCe&from=37.632540,-122.059575&to=37.561,-122.286&doReverseGeocode=false";
  } else {
    url = "http://sc2ls.mooo.com:10000/time?origin=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404&destination=37+May+Ct,+Hayward,+CA+94544";
//     url = "http://www.mapquestapi.com/directions/v2/route?key=affE1LXAEKtDF8KfXG7fAx0XHG7NweCe&from=37.561,-122.286&to=37.632540,-122.059575&doReverseGeocode=false";  
  }
  console.log('Traffic url: ' + url);
  xhrRequest(url, 'GET', {}, 
    function(responseText, state) {
//       var json = JSON.parse(responseText);
//       var time = json.route.realTime;

//       var min = Math.floor(time / 60);
//       var sec = time - (min * 60);
          
//       var stringTime = min + ":" + pad(sec, 2);
      
      var stringTime = responseText + " min";
          
      console.log("Traffic time: " + stringTime);
          
      var dictionary = {
        'KEY_INFO': stringTime,
      };
          
      Pebble.sendAppMessage(dictionary,
        function(e) {
          console.log('Traffic info sent to Pebble successfully!');
        },
        function(e) {
          console.log('Error sending traffic info to Pebble!');
        }
      );
    }
  );
}

function getBaseballInfo(scoresQ) {
  var date = new Date();
  var url = 'http://mlb.mlb.com/gdcross/components/game/mlb/year_' +
      date.getFullYear() + '/month_' + pad(date.getMonth()+1, 2) + '/day_' + pad(date.getDate(), 2) + '/master_scoreboard.json';
  console.log('Bball url: '+ url);
  xhrRequest(url, 'GET', {}, 
    function(responseText, state) {
      var json = JSON.parse(responseText);
      var games = json.data.games.game;
      
      var sendSuccess = function(e) {console.log('Game info sent to Pebble successfully!');};
      var sendFail = function(e) {console.log('Error sending game info to Pebble!');};
      var sentGame = false;
      
      if (games) {
        for(var i = 0; i < games.length; i++) {
          var game = games[i];
          if (game.home_team_name == "Giants" || game.away_team_name == "Giants") {
            var home_score = game.linescore.r.home;
            var away_score = game.linescore.r.away;
            var inning = game.status.inning;
            if (game.status.top_inning == "Y") {
              inning = "T" + inning;
            } else {
              inning = "B" + inning;
            }
            
            var score_string = game.away_team_name[0] + " " + away_score + "-" + home_score + " " + game.home_team_name[0] + " " + inning;
            
            console.log('Baseball str: ' + score_string);
            
            var dictionary = {
              'KEY_INFO': score_string,
            };
            
            Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
            sentGame = true;
          }
        }
      }
      if (!sentGame && scoresQ.length !== 0) {
        var nextInfo = scoresQ.pop();
        nextInfo(scoresQ);
      }
    }
  );
}

function getNhlInfo(scoresQ) {
  console.log("NHL call");
  var url = 'http://live.nhle.com/GameData/RegularSeasonScoreboardv3.jsonp';
  xhrRequest(url, 'GET', {}, 
    function(res, state) {
      var sendSuccess = function(e) {console.log('Game info sent to Pebble successfully!');};
      var sendFail = function(e) {console.log('Error sending game info to Pebble!');};
      var sentGame = false;
      
      var json_str = res.substr(res.indexOf("(")+1,
                                res.indexOf(")") - (res.indexOf("(") + 1));
      var json = JSON.parse(json_str);
      var games = json.games;
      for(var i = 0; i < games.length; i++) {
        var game = games[i];
        if (game.htv == "sharks" || game.atv == "sharks") {
          var score_string = '';
          var time = game.ts;
          console.log(game.bs);
          if (game.bs == "LIVE") {
            if (!isNaN(time[0])) {
              time = time.substr(0, time.length-2);
            }
            score_string = game.atv[0].toUpperCase() + 
                " " + game.ats + "-" + 
                game.hts + " " + game.htv[0].toUpperCase() + 
                " " + time;
          } else if (time == "TODAY") {
            var newTime = convertEastToWest(game.bs);
            var away = game.atv[0].toUpperCase();
            var home = game.htv[0].toUpperCase();
            if (game.htv == "sharks") {
              away = game.atv.substr(0,3);
              away = away.charAt(0).toUpperCase() + away.slice(1);
            } else {
              home = game.htv.substr(0,3);
              home = home.charAt(0).toUpperCase() + home.slice(1);
            }
            score_string = away + "-" + home + " " + newTime;
          } else if (game.bs == "FINAL") {
            if (Number(time.substring(time.indexOf("/") + 1,time.length)) == (new Date()).getDate()) {
              score_string = game.atv[0].toUpperCase() + " " + game.ats +
                "-" + game.hts + " " + game.htv[0].toUpperCase() + " F";
            }
          }
          if (score_string !== '') {
            console.log('Score str: ' + score_string);
            console.log('Time: ' + time);
  
            var dictionary = {
              'KEY_INFO': score_string,
            };
  
            Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
            sentGame = true;
          }
        }
      }
      if (!sentGame && scoresQ.length !== 0) {
        var nextInfo = scoresQ.pop();
        nextInfo(scoresQ);
      }
    }
  );
}

function getNbaInfo(scoresQ) {
  console.log("NBA call");
  var date = new Date();
  var url = 'http://data.nba.com/data/1h/json/cms/noseason/scoreboard/' + date.getFullYear() + pad(date.getMonth()+1, 2) + pad(date.getDate(), 2) + '/games.json';
  console.log('NBA url: ' + url);
  xhrRequest(url, 'GET', {}, 
    function(res, state) {
      var sendSuccess = function(e) {console.log('Game info sent to Pebble successfully!');};
      var sendFail = function(e) {console.log('Error sending game info to Pebble!');};
      var sentGame = false;
      
      var json = JSON.parse(res);
      var games = json.sports_content.games.game;
      for(var i = 0; i < games.length; i++) {
        var game = games[i];
        if (game.home.abbreviation == 'GSW' || game.visitor.abbreviation == 'GSW') {
          var score_string;
          if (game.visitor.score === '') {
            var start_time;
            if (game.home.abbreviation == 'GSW') {
              start_time = game.home_start_time;
            } else {
              start_time = game.visitor_start_time;
            }
            score_string = game.visitor.abbreviation + ' - ' + game.home.abbreviation + start_time;
          } else {
            score_string = game.visitor.abbreviation[0] + ' ' + game.visitor.score + '-' +
                           game.home.score + ' ' + game.home.abbreviation[0];
          }
          
          console.log('Score str: ' + score_string);

          var dictionary = {
            'KEY_INFO': score_string,
          };

          Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
          sentGame = true;
        }
      }
      if (!sentGame && scoresQ.length !== 0) {
        var nextInfo = scoresQ.pop();
        nextInfo(scoresQ);
      }
    }
  );
}

function returnBlank(scoresQ) {
  console.log("Returning nothing");
  var dictionary = {
    'KEY_INFO': '',
  };

  var sendSuccess = function(e) {console.log('Game info sent to Pebble successfully!');};
  var sendFail = function(e) {console.log('Error sending game info to Pebble!');};
  Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
}

function getInfo() {
  console.log("Getting some info");
  var date = new Date();
  var trafficTime = false;
//   if (date.getDay() >= 1 && date.getDay() <= 5) {
//     if (date.getHours() >= 7 && date.getHours() <= 9) {
//       trafficTime = true;
//       if (date.getMinutes() % 1 === 0) {
//         getTraffic('0');
//       }
//     }
//     else if (date.getHours() >= 16 && date.getHours() <= 18) {
//       trafficTime = true;
//       if (date.getMinutes() % 1 === 0) {
//         getTraffic('1');
//       }
//     }
//   }
  if (!trafficTime) {
    console.log("No traffic, sports time");
    if (date.getMinutes() % 2 === 0) {
      var scoresQ = [];
      scoresQ.push(returnBlank);
      scoresQ.push(getNbaInfo);
      scoresQ.push(getBaseballInfo);
      getNhlInfo(scoresQ);
    }
  }
}

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log('AppMessage received!');
    console.log('Received message: ' + JSON.stringify(e.payload));
    if (e.payload.hasOwnProperty("KEY_INFO")) {
      getInfo();
    }
    if (e.payload.hasOwnProperty("KEY_TEMPERATURE")) {
      getWeather();
    }
  }                     
);

// Listen for when the watchface is opened
Pebble.addEventListener('ready', 
  function(e) {
    console.log('PebbleKit JS ready!');
    getWeather();
  }
);
