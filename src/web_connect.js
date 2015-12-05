// Helper function for sending an xml http request
function xhrRequest(url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
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

// After getting the location, get the weather
function locationSuccess(pos) {
  var desiredDate = new Date();
  var hour = desiredDate.getHours();
  if (hour >= 15) {
    desiredDate.setDate(desiredDate.getDate() + 1);
  }
  desiredDate.setHours(13);
  desiredDate.setMinutes(0);
  var timeString = desiredDate.getTime()/1000|0;
  
  console.log('Date: ' + desiredDate);
  
  var url = 'https://api.forecast.io/forecast/dee1b0c1a1c5af5520fa94cbd4d99665/' +
            getWeatherLocation(pos) + ',' +
            timeString;

  console.log('URL: ' + url);
  
  xhrRequest(url, 'GET', 
    function(responseText) {
      var json = JSON.parse(responseText);

      // Temperature in Kelvin requires adjustment
      var temperature = json.daily.data[0].temperatureMax;
      console.log('Temperature is ' + temperature);

      var conditions = json.daily.data[0].icon;
      if (conditions.indexOf('partly-cloudy') >= 0) {
        conditions = 'Partly cloudy';
      }
      console.log('Conditions are ' + conditions);
      
      var locationUrl = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=' + getWeatherLocation(pos);
      
      xhrRequest(locationUrl, 'GET',
        function(cityResponse) {
          var cityJson = JSON.parse(cityResponse);
          
          var address = cityJson.results[0].address_components;
          var component = 0;
          while(address[component].types.indexOf("locality") < 0) {
            component++;
          }
          
          var city = address[component].short_name;
          
          console.log('City is ' + city);
          
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
      );
    }
  );
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
  xhrRequest(url, 'GET', 
    function(responseText) {
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
  xhrRequest(url, 'GET', 
    function(responseText) {
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
  xhrRequest(url, 'GET',
    function(res) {
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
  xhrRequest(url, 'GET',
    function(res) {
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
  if (date.getDay() >= 1 && date.getDay() <= 5) {
    if (date.getHours() >= 7 && date.getHours() <= 9) {
      trafficTime = true;
      if (date.getMinutes() % 3 === 0) {
        getTraffic('0');
      }
    }
    else if (date.getHours() >= 16 && date.getHours() <= 18) {
      trafficTime = true;
      if (date.getMinutes() % 3 === 0) {
        getTraffic('1');
      }
    }
  }
  if (!trafficTime) {
    console.log("No traffic, sports time");
    if (date.getMinutes() % 1 === 0) {
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
