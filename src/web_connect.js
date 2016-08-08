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
function sendWeather(temperature, conditions) {
  // Assemble dictionary using our keys
  var dictionary = {
    'KEY_TEMPERATURE': temperature,
    'KEY_CONDITIONS': conditions
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
  var date = new Date();
  var dayOfWeek = date.getDay();
  var position = '';
  if ((dayOfWeek >= 1 && dayOfWeek <= 4) ||
      (dayOfWeek === 0 && date.getHours() >= 15) ||
      (dayOfWeek === 5 && date.getHours() < 15)) {
    // Get San Mateo weather
    position = '37.561,-122.286';
  } else {
    console.log("Lat: " + pos.coords.latitude);
    console.log("Lon: " + pos.coords.longitude);
    position = pos.coords.latitude + ',' + pos.coords.longitude;
  }
  return position;
}

// State has pos, temperature, conditions
function parseCurrentTemp(responseText, state) {
  var conditions = state.conditions;
  
  var json = JSON.parse(responseText);

  var temperature = json.current_observation.temp_f;
  console.log('Temperature is ' + temperature);
  var forecastTemp = state.temperature;
  state.temperature = Math.round(temperature) + "/" + Math.round(forecastTemp);
  
  sendWeather(state.temperature, conditions);
  
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
    url = "http://sc2ls.mooo.com:10000/time?origin=5024+Ray+Ave,+Castro+Valley,+CA+94546&destination=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404";
  } else {
    url = "http://sc2ls.mooo.com:10000/time?origin=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404&destination=5024+Ray+Ave,+Castro+Valley,+CA+94546";
  }
  console.log('Traffic url: ' + url);
  xhrRequest(url, 'GET', {}, 
    function(responseText, state) {
      var stringTime = responseText + " min";
          
      console.log("Traffic time: " + stringTime);
          
      var dictionary = {
        'KEY_INFO': stringTime,
        'KEY_IN_INFO': 1,
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
  console.log('MLB call');
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
      var inGame = 0;
      
      if (games) {
        for(var i = 0; i < games.length; i++) {
          var game = games[i];
          if (game.home_team_name == "Giants" || game.away_team_name == "Giants") {
            var time;
            
            var score_string;
            var status = game.status.status;
            if (status === "In Progress" ||
                status === "Game Over" ||
                status === "Final") {
              var home_score = game.linescore.r.home;
              var away_score = game.linescore.r.away;
              if (game.status.status == "In Progress") {
                inGame = 1;
                var inning = game.status.inning;
                if (game.status.top_inning == "Y") {
                  inning = "T" + inning;
                } else {
                  inning = "B" + inning;
                }
                score_string = game.away_team_name[0] + " " + away_score + "-" + home_score + " " + game.home_team_name[0] + " " + inning;
              } else if (game.status.status == "Game Over" || game.status.status == "Final") {
                score_string = game.away_team_name[0] + " " + away_score + "-" + home_score + " " + game.home_team_name[0] + " F";
              }
            }
            else {
              var awayTeamAbbreviation;
              var homeTeamAbbreviation;
              if (game.home_team_name == "Giants") {
                time = game.home_time;
                homeTeamAbbreviation = "G";
                awayTeamAbbreviation = game.away_team_name.substr(0,3);
              } else {
                awayTeamAbbreviation = "G";
                homeTeamAbbreviation = game.home_team_name.substr(0,3);
                time = game.away_time;
              }
              score_string = awayTeamAbbreviation + "-" + homeTeamAbbreviation + " " + time;
            }
            
            console.log('Baseball str: ' + score_string);
            
            var dictionary = {
              'KEY_INFO': score_string,
              'KEY_IN_INFO': inGame,
            };
            
            Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
            sentGame = true;
          }
        }
      }
      if (!sentGame && scoresQ.length !== 0) {
        console.log('MLB done, getting next');
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
      var inGame = 0;
      
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
            inGame = 1;
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
              'KEY_IN_INFO': inGame,
            };
  
            Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
            sentGame = true;
          }
        }
      }
      if (!sentGame && scoresQ.length !== 0) {
        var nextInfo = scoresQ.pop();
        console.log('NHL Done, getting next');
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
      var inGame = 0;
      
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
            inGame = 1;
            score_string = game.visitor.abbreviation[0] + ' ' + game.visitor.score + '-' +
                           game.home.score + ' ' + game.home.abbreviation[0];
          }
          
          console.log('Score str: ' + score_string);

          var dictionary = {
            'KEY_INFO': score_string,
            'KEY_IN_INFO': inGame,
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
    'KEY_IN_INFO': 0,
  };

  var sendSuccess = function(e) {console.log('Game info sent to Pebble successfully!');};
  var sendFail = function(e) {console.log('Error sending game info to Pebble!');};
  Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
}

function getInfo() {
  console.log("Getting some info");
  var date = new Date();
  var trafficTime = false;
  if (date.getDay() >= 1 && date.getDay() <= 5) {
    if (date.getHours() >= 7 && date.getHours() <= 9) {
      trafficTime = true;
      getTraffic('0');
    }
    else if (date.getHours() >= 16 && date.getHours() <= 18) {
      trafficTime = true;
      getTraffic('1');
    }
  }
  if (!trafficTime) {
    console.log("No traffic, sports time");
    var scoresQ = [];
    scoresQ.push(returnBlank);
    scoresQ.push(getNbaInfo);
    scoresQ.push(getBaseballInfo);
    getNhlInfo(scoresQ);
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
    getInfo();
  }
);
