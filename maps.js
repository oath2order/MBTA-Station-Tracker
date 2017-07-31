var RED_ICON = 'http://labs.google.com/ridefinder/images/mm_20_red.png';
var INITIAL_ZOOM = 14;
var TRAIN_MARKERS = [];
var MY_MARKER = null;
var DEFAULT_POS = { lat: 42.346577, lng: -71.1247365 }; // Beacon Hill, Boston
var BUS_ROUTE_TYPE = 3; // spec for route_type (https://developers.google.com/transit/gtfs/reference)

ROUTE_COLORS = {
    'GREEN': 'green',
    'RED': 'red',
    'BLUE': 'blue',
    'ORANGE': 'orange',
    'SILVER': 'gray'
};

$(document).ready(init_map);

function init_map() {
    if (!navigator.geolocation) {
        load_map_noLocation('Geolocation not supported by this browser');
    } else {
        navigator.geolocation.getCurrentPosition(load_map_foundLocation, load_map_noLocation);
    }
}

function update_my_position() {
    if (!navigator.geolocation) {
        update_noLocation('Geolocation not supported by this browser');
    } else {
        navigator.geolocation.getCurrentPosition(update_pos_foundLocation, update_pos_noLocation);
    }
}

function load_map_noLocation(err) {
    console.log('could not find location', err);
    load_map(DEFAULT_POS);
}

function update_pos_noLocation(err) {
    console.log('could not find location', err);
}

function load_map_foundLocation(position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    load_map({ lat: lat, lng: lng });
}

function update_pos_foundLocation(position) {
    var map_p = $(document).data('MAP_P');
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    map_p.done(function() {
        update_my_marker({ lat: lat, lng: lng });
    });
}

var INFO_WINDOW = null;

function load_map(position) {
    var mapOptions = { center: position, zoom: INITIAL_ZOOM };
    var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
    var map_p = $(document).data('MAP_P');
    init_my_marker(map);
    map_p.resolve(map);
    google.maps.event.addListener(map, 'zoom_changed',
        function() { on_zoom(map); });
    map.data.loadGeoJson('data/MBTARapidTransitLines.json');
    colorize_routes(map);
    update_my_marker(position);
    INFO_WINDOW = new google.maps.InfoWindow({ content: $('<div/>').text('train info')[0] });
    trainStopMarker()

    // Click anywhere on an info window to close it
    google.maps.event.addDomListener(INFO_WINDOW.content,

        'click',
        function() { INFO_WINDOW.close(); });
}


function colorize_routes(map) {
    map.data.setStyle(function(feature) {
        var line = feature.getProperty('LINE');
        var color = ROUTE_COLORS[line];
        if (line == undefined) {
            color = 'pink';
        }
        return {
            strokeColor: color,
            strokeOpacity: 0.3,
            strokeWeight: 4
        };
    });
}
// called after map is loaded
function init_my_marker(map) {
    MY_MARKER = new google.maps.Marker({
        icon: RED_ICON,
        position: DEFAULT_POS,
        map: map,
        title: 'Your current position'
    });
}

function update_my_marker(position) {
    MY_MARKER.setPosition(position);
}

function lookupRouteColor(route_id) {
    var properties = ROUTES[route_id];
    return properties['color'];
}

function getTrainIcon(bearing, route_id, route_type, zoom) {
    var arrow = {
        fillOpacity: 0.8,
        scale: 4.5,
        strokeOpacity: 0,
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        rotation: parseInt(bearing),
        fillColor: lookupRouteColor(route_id)
    };
    if (route_id == 'Orange') {
        arrow.strokeOpacity = 0.8;
        arrow.strokeColor = '#444';
        arrow.strokeWeight = 1;
    }
    if (route_type == BUS_ROUTE_TYPE) {
        arrow.strokeOpacity = 0.8;
        arrow.strokeColor = '#444';
        arrow.path = google.maps.SymbolPath.CIRCLE;
        arrow.strokeWeight = 1;
        arrow.scale = 7;
    }
    if (zoom < 13) {
        arrow.scale = arrow.scale * .75;
    }
    return arrow;
}

// wait till map is loaded, then draw marker
function drawTrainMarker(lat, lng, title, bearing, route_id, route_type) {
    var map_loader = $(document).data('MAP_P');
    map_loader.done(function() {
        var map = $(document).data('MAP');
        var zoom = map.getZoom();
        var m = new google.maps.Marker({
            position: { lat: lat, lng: lng },
            map: map,
            icon: getTrainIcon(bearing, route_id, route_type, zoom),
            title: title
        });
        m['route_info'] = {
            bearing: bearing,
            route_id: route_id,
            route_type: route_type
        };
        TRAIN_MARKERS.push(m);
        // If you click on a train marker, open an Info Window
        google.maps.event.addListener(m, 'click',
            function() {
                INFO_WINDOW.content.innerHTML = title;
                INFO_WINDOW.open(map, m);
            });
    });
}

function on_zoom(map) {
    var zoom = map.getZoom();
    for (var i in TRAIN_MARKERS) {
        var marker = TRAIN_MARKERS[i];
        var route_info = marker.route_info;
        var icon = getTrainIcon(route_info.bearing,
            route_info.route_id,
            route_info.route_type,
            zoom);
        marker.setIcon(icon);
    }
}

// Sets the map on all train markers.
function setAllMap(map) {
    for (var i in TRAIN_MARKERS) {
        TRAIN_MARKERS[i].setMap(map);
    }
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
    setAllMap(null);
    TRAIN_MARKERS = [];
}

//Modified Code begins here
function trainStopMarker(response) {
  for (e = 0; e < response.direction[0].stop.length; e++) {
      var lat = parseFloat(response.direction[0].stop[e].stop_lat);
      var lon = parseFloat(response.direction[0].stop[e].stop_lon)
      var title = response.direction[0].stop[e].parent_station;
      if(title != ""){drawStopMarker(lat, lon, title);}
      
  }
}


function drawStopMarker(lat, lng, title) {
    var map_loader = $(document).data('MAP_P');
    map_loader.done(function() {
      var map = $(document).data('MAP');
      var zoom = map.getZoom();
      var m = new google.maps.Marker({
          position: { lat: lat, lng: lng },
          map: map,
          title: title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            strokeWeight: 2,
            fillOpacity: 1
          }
        });
        TRAIN_MARKERS.push(m);
        google.maps.event.addListener(m, 'click',
        function() {
          INFO_WINDOW.content.innerHTML = ""
          renderArrival(title);
          INFO_WINDOW.open(map, m);
        });
    });
}
function renderArrival(stop){
  var endpoint = "http://realtime.mbta.com/developer/api/v2/predictionsbystop?api_key=dLQxHTh91UuZU7ks7OLwMQ&stop=" + stop;
    $.get(endpoint).done(function(predictions) {
    stopLoop(predictions);
    console.log(predictions.mode.length);
  }); 
}

function stopLoop(predictions){
  var titleString = stringFormatter(predictions.stop_name, true, true);
  for(var i in predictions.mode){
    if (predictions.mode[i].mode_name == 'Subway') {
      for(var j in predictions.mode[i].route){
        titleString += stringFormatter(predictions.mode[i].route[j].route_name, true, false)
        for(var f in predictions.mode[i].route[j].direction){
          titleString += stringFormatter(predictions.mode[i].route[j].direction[f].direction_name, false, false);
          var t = tripSorter(predictions.mode[i].route[j].direction[f].trip);
          titleString += stringFormatter(predictions.mode[i].route[j].direction[f].trip[t].trip_name, false, false);
          titleString += stringFormatter(timeConverter(predictions.mode[i].route[j].direction[f].trip[t].pre_away), false, true);
        }
      }  
    }  
  }
  INFO_WINDOW.content.innerHTML = titleString;
}

function stringFormatter(string, isBold, isRouteEnd){
  var resultString;
  if(isBold === true){
    resultString = "<b>" + string + "</b></br>"}
  else if(isRouteEnd === true){
    resultString = string + "</br></br>"}  
  else{
    resultString = string + "</br>"}
  return resultString;
}

function timeConverter(seconds){
  var minutes = 0;
  resultString = ""
  while(seconds >= 60){
    minutes++;
    seconds = seconds - 60;
  }
  resultString = "Arrives in " + minutes + " minute(s) and " + seconds + " second(s)."
  return resultString;
}
function tripSorter(trips){
  var fastestTrip = 0;
  var preAway = 9999;
  for(var i in trips){
    if (parseInt(trips[i].pre_away) < preAway){
      preAway = trips[i].pre_away;
      fastestTrip = i;
    }
  }
  return fastestTrip;
}
