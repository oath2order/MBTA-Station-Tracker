MBTA_API_KEY = 'dLQxHTh91UuZU7ks7OLwMQ';
MBTA_API_URL = 'https://realtime.mbta.com/developer/api/v2/';

DEFAULT_ROUTE = 'All';

ERRORS_SEEN = {};

// sequence for select menu
ROUTE_ORDER = ['All', 'Red', 'Orange', 'Blue',
	       'Green-B', 'Green-C', 'Green-D', 'Green-E',
	       701, 747,
	       66, 741, 742];

// map key onto properties
ROUTES = { 'All': {name: 'All'},
	   'Green-B': {name:'Green-B', color:'green'},
	   'Green-C': {name:'Green-C', color:'green'},
	   'Green-D': {name:'Green-D', color:'green'},
	   'Green-E': {name:'Green-E', color:'green'},
	   'Red':  {name:'Red', color:'red'},
	   'Orange': {name:'Orange', color:'orange'},
	   'Blue':{name:'Blue', color:'blue'},
	   '66':{name:'66', color:'#BBB'},
	   '701':{name:'CT1', color:'#BBB'},
	   '747':{name:'CT2', color:'#BBB'},
	   '741': {name: 'Silver SL1', color: '#BBB'},
	   '742': {name: 'Silver SL2', color: '#BBB'}
	 };

// MAP_P is a promise that waits for the map to be loaded.
// When map is loaded, store it in document.MAP
MAP_P = $.Deferred().done(init_map);
$(document).data('MAP_P', MAP_P);

$(document).ready(function(){
		    init_routes();
		    $('button#refresh').click(plot_mbta);
		    $('#routes').change(plot_mbta);
		    plot_mbta();});

function init_map(map){
  $(document).data('MAP', map);
}

function change_route(){
  var val = null;
  vv = this;
  if (this == window){
    val = DEFAULT_ROUTE;
  } else {
    val = $(this).attr('value');
  }
  $('#routes').attr('value', val);
  $('#routes a.routename').text(val);
}

// reset menu of available routes
function init_routes(){
  $('li#routes ul li').remove();
  for (var i in ROUTE_ORDER){
    var key = ROUTE_ORDER[i];
    var val = ROUTES[key]['name'];
    var option = $('<option/>', {value:key}).html(val);
    if (DEFAULT_ROUTE == key){
	  option.attr('selected', true);
    }
    $('#routes').append(option);
  }
}

function plot_mbta() {
  deleteMarkers();
  update_my_position(); // refresh 'you are here' marker position
  var route = $('#routes').val();
  if (route == 'All'){
     for (var i in ROUTE_ORDER){
       var r = ROUTE_ORDER[i];
       if (r == 'All'){
	 continue;
       }
       plot_one_route(r);
     }
  } else {
    plot_one_route(route);
  }
}

function plot_one_route(route){
  var params = { route: route,
		 api_key: MBTA_API_KEY,
		 jsonpcallback: 'handle_callback',
		 format: 'jsonp'
	       };
  var url = get_mbta_api_url('predictionsbyroute', params);
  $.getJSON(url).always(handle_api);
  //modification of code to add stations
  var url = get_mbta_api_url('stopsbyroute', params);
  $.getJSON(url).always(handle_api);
}

// fcn = 'predictionsbyroute'
// params is an object
function get_mbta_api_url(fcn, params){
  return MBTA_API_URL + fcn + '?' + $.param( params );
}

function handle_api(data){
  if (data.status == 200){
    var msg = data.responseText;
    eval(msg);
  } else {
    var status_code = data.status;
    var err = find_err_msg(data.responseText);
    if (err == null){
      err = HtmlEncode(data.responseText);
    }
    err = "MBTA API error (" + status_code + "): " + err;
    show_alert_if_unseen(err, err);
  }
}

function find_err_msg(msg){
  var rx = /\<message\>(.*)\<\/message\>/;
  var found = rx.exec(msg);
  if (found != null){
    return found[1];
  }
}

function handle_callback (data){
  MAP_P.done(function() {
    if (data.route_id != undefined){
      plot_data(data);}
    else{console.log(data)
      trainStopMarker(data)}
  });
}

function plot_data(data){
  var route_name = data.route_name;
  var route_type = data.route_type;
  var mode_name = data.mode_name;
  var directions = data.direction;
  for (var dir_i in directions){
    var dir = directions[dir_i];
    var direction_name = dir.direction_name;
    var trips = dir.trip;
    for (var trip_i in trips){
      var trip = trips[trip_i];
      var trip_headsign = trip.trip_headsign;
      var vehicle = trip.vehicle;
      if (vehicle == undefined){
	continue;
      }
      var route_id = data.route_id;
      var bearing = vehicle.vehicle_bearing;
      var id = vehicle.vehicle_id;
      var lat = parseFloat(vehicle.vehicle_lat);
      var lng = parseFloat(vehicle.vehicle_lon);
      var timestamp = vehicle.vehicle_timestamp;
      var title = trip_headsign + ' (' + direction_name + ')<br/>'
	+ route_name + '<br/>'
	+ '#' +  id  + ' (' + mode_name.toLowerCase() + ')';
      drawTrainMarker(lat, lng, title, bearing, route_id, route_type);
      }
    }
}

// Logs msgs (using key) to avoid repeating it once seen.
function show_alert_if_unseen(msg, key){
  var seen = ERRORS_SEEN[key];
  if (seen != true){
    show_alert(msg);
    ERRORS_SEEN[key] = true;
  }
}

function show_alert(msg){
  var alert = $('<div/>', {role: 'alert'}).addClass('alert alert-warning alert-dismissable');
  var button = $('<button/>', {type: 'button', 'data-dismiss':'alert', 'aria-label':'close'}).addClass('close');
  var span = $('<span/>', {'aria-hidden':true}).html('&times;');
  alert.append(button.append(span), msg);
  $('nav').after(alert);
}

function HtmlEncode(s){
  var el = document.createElement("div");
  el.innerText = el.textContent = s;
  s = el.innerHTML;
  return s;
}
