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
      
      console.log('Location url: ' + locationUrl);
      
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
    url = "http://www.mapquestapi.com/directions/v2/route?key=affE1LXAEKtDF8KfXG7fAx0XHG7NweCe&from=37+May+Ct,+Hayward,+CA+94544&to=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404";  
  } else {
    url = "http://www.mapquestapi.com/directions/v2/route?key=affE1LXAEKtDF8KfXG7fAx0XHG7NweCe&from=777+Mariners+Island+Blvd,+San+Mateo,+CA+94404&to=37+May+Ct,+Hayward,+CA+94544";  
  }
  
  xhrRequest(url, 'GET', 
    function(responseText) {
      var json = JSON.parse(responseText);
      var time = json.route.realTime;
      
      var min = Math.floor(time / 60);
      var sec = time - (min * 60);
      
      var stringTime = min + ":" + sec;
      
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

function getGameInfo() {
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
      
      console.log('Games len: ' + games.length);
      
      for(var i = 0; i < games.length; i++) {
        var game = games[i];
        console.log('Home team: ' + game.home_team_name);
        if (game.home_team_name == "Giants" || game.away_team_name == "Giants") {
          var home_score = game.linescore.r.home;
          var away_score = game.linescore.r.away;
          var score_string;
          if (game.home_team_name == "Giants") {
            score_string = game.away_team_name[0] + " " + away_score + "-" + home_score + " G";
          } else {
            score_string = "G " + away_score + "-" + home_score + " " + game.home_team_name[0];
          }
          console.log('Score str: ' + score_string);
          
          var dictionary = {
            'KEY_GAME': score_string,
          };
      
          Pebble.sendAppMessage(dictionary, sendSuccess, sendFail);
        }
      }
    }
  );
}

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log('AppMessage received!');
    console.log('Received message: ' + JSON.stringify(e.payload));
    if (e.payload.hasOwnProperty("KEY_INFO")) {
      getTraffic(e.payload.KEY_INFO);
    } else if (e.payload.hasOwnProperty("KEY_GAME")) {
      getGameInfo();
    } else {
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
