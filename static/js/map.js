var map;
var activeMapLayer = undefined;
var hoverMapMarker;

// TODO hard coded for NYC demo, but could look this up dynamically in the
// future
var SPEED_LIMIT_KPH = 48.28;
var MEAN_RADIUS_EARTH_KM = 6373;

var mapHoverHandler = {
    on: function(timestamp, trace) {
        var latitudes = trace.latitude;
        var longitudes = trace.longitude;
        // TODO binary search for speed since this is sorted by timestamp
        var closestPosition = _.find(trace.records, function(record) {
            return record.latitude && record.longitude &&
                    record.timestamp > timestamp - 1 &&
                    record.timestamp < timestamp + 1;
        });

        if(!hoverMapMarker) {
            hoverMapMarker = L.marker([0, 0]);
        }
        hoverMapMarker.setLatLng([closestPosition.latitude,
                closestPosition.longitude]).addTo(map);
    },
    off: function() {
        map.removeLayer(hoverMapMarker);
    }
}

var recordsWithPosition =  function(records) {
    return _.filter(records, function(record) {
        return record.latitude && record.longitude;
    });
}

// TODO we could optimize this and only go over the path once, yielding
// positions to these functions each time and then calling a finish() method,
// but the trace is small now (~600) for a few minutes) so i'll not prematurely
// optimize.
var markLongestStops = function(trace) {
    if(!_.has(trace.mapLayerGroups, "longestStops")) {
        var longestStops = L.featureGroup();
        var stops = [];
        var stoppedAt = undefined;
        var records = recordsWithPosition(trace.records);
        var lastPosition = _.first(records);

        _.each(records, function(record) {
            if(record.vehicle_speed < 1 &&
                    recordedPositionEqual(record, lastPosition)){
                if(!stoppedAt) {
                    // TODO could just use odometer...
                    if(stops.length > 0 &&
                            distanceKm(_.last(stops).start, record) < .2) {
                        stoppedAt = stops.pop().start;
                    } else {
                        stoppedAt = record;
                    }
                }
            } else if(stoppedAt) {
                stops.push({start: stoppedAt, end: record});
                stoppedAt = undefined;
            }
            lastPosition = record;
        });

        if(stoppedAt) {
            stops.push({start: stoppedAt, end: lastPosition});
        }

        var nonTrivialStops = _.filter(stops, function(stop) {
            return stop.end.timestamp - stop.start.timestamp > 5;
        });

        _.each(_.pluck(nonTrivialStops, "start"), function(stop) {
            var marker = new L.CircleMarker(
                [stop.latitude, stop.longitude], {radius: 8, color: "red"});
            longestStops.addLayer(marker);
        });

        trace.mapLayerGroups.longestStops = longestStops;
    }

    map.addLayer(trace.mapLayerGroups.longestStops);
}

var recordedPositionEqual = function(a, b) {
    return a.latitude && a.longitude && b.latitude && b.longitude &&
        a.latitude === b.latitude && a.longitude && b.longitude;
}

var highlightSlowSections = function(trace) {
    if(!_.has(trace.mapLayerGroups, "slowSections")) {
        var slowSections = L.multiPolyline([]);
        var lastPosition = _.first(trace.records);
        var options = {color: 'red', width: 25};
        var path = L.polyline([], options);

        _.each(trace.records, function(record) {
            var position = [record.latitude, record.longitude];
            if(!recordedPositionEqual(lastPosition, record) &&
                    record.vehicle_speed > 1 &&
                    record.vehicle_speed < SPEED_LIMIT_KPH) {
                path.addLatLng(position);
                lastPosition = record;
            } else if(path.getLatLngs().length > 0) {
                slowSections.addLayer(path);
                path = L.polyline([], options);
            }
        });

        if(path.getLatLngs().length > 0) {
            slowSections.addLayer(path);
        }
        trace.mapLayerGroups.slowSections = slowSections;
    }

    map.addLayer(trace.mapLayerGroups.slowSections);
}

var renderGpsTrace = function(trace) {
    _.each(traces, function(trace) {
        _.each(trace.mapLayerGroups, function(layer, layerName) {
            if(layerName != trace.url) {
                map.removeLayer(layer);
            }
        });
    });

    if(!_.has(trace, "mapLayerGroups")) {
        trace.mapLayerGroups = {};
    }

    if(!_.has(trace.mapLayerGroups, "base")) {
        var path = L.polyline([], {color: 'green', width: 20});
        var records = recordsWithPosition(trace.records);
        var lastPosition = _.first(records);
        _.each(records, function(record) {
            if(!recordedPositionEqual(lastPosition, record)) {
                path.addLatLng([record.latitude, record.longitude]);
                lastPosition = record;
            }
        });

        var start = new L.CircleMarker(_.first(path.getLatLngs()),
                {color: "blue"});
        var end = new L.CircleMarker(_.last(path.getLatLngs()),
                {color: "green"});
        trace.mapLayerGroups.base = L.featureGroup(
                [path, start, end]);
    }

    map.addLayer(trace.mapLayerGroups.base);
    map.fitBounds(trace.mapLayerGroups.base.getBounds());

    highlightSlowSections(trace);
    markLongestStops(trace);
}
