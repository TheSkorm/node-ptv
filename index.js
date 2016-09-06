var urlFormat = require('url').format;
var crypto = require('crypto');
var util = require('util');
var request = require('request');

var endpoint = "http://timetableapi.ptv.vic.gov.au";

/** Returns an HMAC SHA1 signature from the request beginning at /v2 (inclusive)
*  and ending at devid=xxxxx (inclusive).
* @param {String} key your API key as provided by PTV.
* @param {String} url the url of the request from /v2 (inclusive) to the beginning
*                     of any query parameters.
* @param {Object} args the names and values of the query parameters.
*/
function createSignature(key, url, args) {
  return crypto.createHmac('sha1', key)
    .update(urlFormat({pathname: '/v2' + url, query: args}))
    .digest('hex').toUpperCase();
}


module.exports = PTV;
module.exports.createClient = function (opts) {
  return new PTV(opts);
};

/** Initialises the object with a devId and API key.
* @param {Objects} opts an object key/value pair containing:
*                       devId: your dev ID as provided by PTV
*                       key: your API key as provided by PTV.
*/
function PTV(opts) {
  this.devId = opts.devId;
  this.key = opts.key;
  this._activeReqs = 0;
}

// definition of transport modes.
PTV.mode = {
  train: 0,
  tram: 1,
  bus: 2,
  vline: 3,
  nightbus: 4
};
PTV.modeName = ['train', 'tram', 'bus', 'vline', 'nightbus'];

// definition of transport POIs.
PTV.poi = {
  train: 0,
  tram: 1,
  bus: 2,
  vline: 3,
  nightbus: 4,
  ticketoutlet: 100
};

// definition of disruption modes.
PTV.disruptionModes = {
  general: 'general',
  metro_bus: 'metro-bus',
  metro_train: 'metro-train',
  metro_tram: 'metro-tram',
  regional_bus: 'regional-bus',
  regional_coach: 'regional-coach',
  regional_train: 'regional-train'
};

/** Calls the API with the supplied URL and query parameters, and executes
* the supplied callback when finished.
* @param {String} url the request URL starting after /v2 and ending before
                      any query parameters.
* @param {Object} params an object containing key/value pairs for any
*                        query paramters to be included in the call.
* @param {Function} cb the callback function to execute once the results
*                      have been returned from the API call.
*/
PTV.prototype._callAPI = function (url, params, cb) {
  var result;
  var query = {};
  if (params) {
    for (var prop in params) {
      query[prop] = params[prop];
    }
  }
  query.devid = this.devId;
  var signature = createSignature(this.key, url, query);
  query.signature = signature;
  this._activeReqs++;
  var ptv = this;
  request({
    url: endpoint + '/v2' + url,
    qs: query
  }, function (error, response, body) {
    ptv._activeReqs--;
    if (!error && response.statusCode == 200) {
      try {
        result = JSON.parse(body);
      } catch(e) {
        return cb(e);
      }
      cb(null, result);
    } else {
      if (error)
        return cb(error);
      cb(response.statusCode);
    }
  });
};

/** Returns the output of the healthcheck.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.healthcheck = function (cb) {
  var queryParams = {
    timestamp: new Date().toUTCString()
  };
  this._callAPI(
    '/healthcheck',
    queryParams,
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res);
    }
  );
};

/** Returns up to 30 stops nearest to a specified coordinate.
* @param {number} latitude latitude expressed in decimal degrees.
* @param {number} longitude longitude expressed in decimal degrees.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.stopsNearby = function (latitude, longitude, cb) {
  this._callAPI(
    util.format('/nearme/latitude/%d/longitude/%d', latitude, longitude),
    null,
    function (err, res) {
      if (err) return cb(err);
      return cb(null, res.map(function (s) { return s.result; }));
    }
  );
};

/** Returns a set of locations consisting of stops and/or myki ticket outlets
* within the boundaries of the provided coordinates.
* @param {String} poi a comma separated list of numbers representing the types
*                     of POIs you want returned (defined in the PTV.poi object).
* @param {number} lat1 latitude in decimal degrees of the top left corner of
*                      the search region.
* @param {number} long1 longitude in decimal degrees of the top left corner of
*                       the search region.
* @param {number} lat2 latitude in decimal degrees of the bottom right corner of
*                      the search region.
* @param {number} long2 longitude in decimal degrees of the bottom right corner of
*                      the search region.
* @param {number} griddepth number of cell blocks per cluster.
* @param {number} limit minimum number of POIs required to create a cluster and
*                       the maximum number of POIs to return.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.transportPOIsByMap = function (poi, lat1, long1, lat2, long2,
  griddepth, limit, cb) {
  this._callAPI(
    util.format('/poi/%s/lat1/%d/long1/%d/lat2/%d/long2/%d/griddepth/%d/limit/%d',
      encodeURI(poi), lat1, long1, lat2, long2, griddepth, limit),
    null,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns all stops and lines that match the search terms.
* @param {String} what the search terms; can include suburb and mode.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.search = function (what, cb) {
  this._callAPI(
    '/search/' + encodeURI(what),
    null,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns the next departures at a given stop for any line and
* direction.
* @param {number} mode the route_type of the stop as defined in the PTV.mode
*                      object.
* @param {number} stop the stop_id of the stop.
* @param {number} limit the number of departures to return.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.broadNextDepartures = function (mode, stop, limit, cb) {
  this._callAPI(
    util.format('/mode/%d/stop/%d/departures/by-destination/limit/%d',
      mode, stop, limit),
    null,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res.values);
    }
  );
};

/** Returns the next departures as a given stop for a specified mode, line,
* and direction.
* @param {number} mode the route_type of the stop as defined in the PTV.mode
*                      object.
* @param {number} line the line_id of the service.
* @param {number} stop the stop_id of the stop.
* @param {number} directionid the direction_id of the requested service.
* @param {number} limit the number of departures to return.
* @param {Date} date the starting date/time for which to retuen departures.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.specificNextDepartures = function (mode, line, stop,
  directionid, limit, date, cb) {
  if (!date)
    date = new Date();
  var queryParams = {
    for_utc: date.toISOString()
  };
  this._callAPI(
    util.format('/mode/%d/line/%d/stop/%d/directionid/%d/departures/all/limit/%d',
      mode, line, stop, directionid, limit),
    queryParams,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns the stopping pattern (details of the service) for a given run and
* time. Supplying a stop appears to have no effect on the output.
* @param {number} mode the route_type of the stop as defined in the PTV.mode
*                      object.
* @param {number} run the run_id of the requested run.
* @param {number} stop the stop_id of the stop. Appears to have no effect on
*                      the output.
* @param {Date} date the starting date/time for which to retuen departures.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.stoppingPattern = function (mode, run, stop, date, cb) {
  if (!date)
    date = new Date();
  var queryParams = {
    for_utc: date.toISOString()
  };
  this._callAPI(
    util.format('/mode/%d/run/%d/stop/%d/stopping-pattern',
      mode, run, stop),
    queryParams,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns all stops on a given line of a transport mode.
* @param {number} mode the route_type of the stop as defined in the PTV.mode
*                      object.
* @param {number} line the line_id of the requested line.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.stopsOnALine = function (mode, line, cb) {
  this._callAPI(
    util.format('/mode/%d/line/%d/stops-for-line',
      mode, line),
    null,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns all lines for a given mode of transport.
* @param {number} mode the route_type of the stop as defined in the PTV.mode
*                      object.
* @param {String} name part of a line's name (optional).
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.linesByMode = function (mode, name, cb) {
  var queryParams = {
    name: name
  };
  this._callAPI(
    util.format('/lines/mode/%d',
      mode),
    queryParams,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns the facilities available at a given metro train or V/Line stop.
* @param {number} stop stop_id of the stop.
* @param {number} mode either 0 (metro train) or 3 (V/Line).
* @param {boolean} location include location information in output.
* @param {boolean} amenity include amenity information in output.
* @param {boolean} accessibility include accessibility information in output.
* NOTE: if any of the above boolean toggles are used, the remainder must also
* be specified, otherwise none of them will be returned.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.stopFacilities = function (stop, mode, location, amenity, accessibility, cb) {
  var queryParams = {
    stop_id: stop,
    route_type: mode,
    location: location,
    amenity: amenity,
    accessibility: accessibility
  };
  this._callAPI(
    '/stops',
    queryParams,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};

/** Returns planned and unplanned disruptions for given transport modes.
* @param {String} modes a comma separated list of transport modes as defined
*                       in PTV.disruptionModes.
* @param{Function} cb the callback function to execute once the results
*                     have been returned from the API call.
*/
PTV.prototype.disruptions = function (modes, cb) {
  this._callAPI(
    util.format('/disruptions/modes/%s',
      modes),
    null,
    function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    }
  );
};
