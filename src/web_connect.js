// Helper function for sending an xml http request
var xhrRequest = function (url, type, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onload = function () {
    callback(this.responseText);
  };
  xhr.open(type, url);
  xhr.send();
};

function getWeatherLocation(pos) {
  var date = new Date();
  var dayOfWeek = date.getDay();
  var position = '';
  if ((dayOfWeek >= 1 && dayOfWeek <= 4) ||
      (dayOfWeek === 0 && date.getHours() >= 15) ||
      (dayOfWeek === 5 && date.getHours() < 15)) {
    // Get San Mateo weather
    position = '&lat=37.561&lon=-122.286';
  } else {
    position = '&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude;
  }
  return position;
}

// After getting the location, get the weather
function locationSuccess(pos) {
  var url = 'http://api.openweathermap.org/data/2.5/forecast/daily?' +
            'cnt=2' + 
            '&units=imperial' +
            getWeatherLocation(pos);

  xhrRequest(url, 'GET', 
    function(responseText) {
      var json = JSON.parse(responseText);
      
      var date = new Date();
      var hour = date.getHours();
      var dayNum = 0;
      if (hour >= 15) {
        dayNum = 1;
      }
      
      var city = json.city.name;
      console.log('City is ' + city);

      // Temperature in Kelvin requires adjustment
      var temperature = json.list[dayNum].temp.day;
      console.log('Temperature is ' + temperature);

      var conditions = json.list[dayNum].weather[0].main;
      console.log('Conditions are ' + conditions);
      
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

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
  function(e) {
    console.log('AppMessage received!');
    getWeather();
  }                     
);

// Listen for when the watchface is opened
Pebble.addEventListener('ready', 
  function(e) {
    console.log('PebbleKit JS ready!');
    getWeather();
  }
);
