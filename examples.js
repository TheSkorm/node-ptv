var ptv = require('./index');
var util = require('util');

var pt = ptv.createClient(
  {devId: 111111, key: ''});

// performs the healthcheck on the API
pt.healthcheck(function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns 30 train, tram, and bus stops near the supplied coordinates
pt.stopsNearby('-37.82392124423254', '144.9462017431463', function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns 10 tram and bus stops within the supplied coordinates.
pt.transportPOIsByMap('1, 2', -37, 145, -37.5, 145.5, 3, 10, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns tram stops and lines within the suburb of Malvern.
pt.search('tram malvern', function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns next departures at stop 1104 for amy line and direction.
pt.broadNextDepartures(ptv.mode.train, 1104, 1, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns next train departures for line 8 at stop 1104 in direction 0.
pt.specificNextDepartures(ptv.mode.train, 8, 1104, 1, 0, null, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns details of run 21173 (a service on the Frankston line).
// the stop paramter (1180) does not appear to have an effect contrary to
// PTV documentation.
pt.stoppingPattern(ptv.mode.train, 21173, 1180, null, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns the stops on bus line 7531.
pt.stopsOnALine(ptv.mode.bus, 7531, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns all train lines. Replace null with a string to filter lines.
pt.linesByMode(ptv.mode.train, null, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns all facilities at train stop 1104.
pt.stopFacilities(1104, ptv.mode.train, null, null, null, function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});

// returns all metro train disruptions.
pt.disruptions('metro-train', function (error, result) {
  if (error) console.log('ERROR: ' + error);
  else console.log(util.inspect(result, false, null));
});
