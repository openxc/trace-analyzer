var map;
var mapLayerGroups = {};
var activeMapLayer = undefined;
var hoverMapMarker;

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

var renderGpsTrace = function(trace) {
    _.each(mapLayerGroups, function(layer, layerName) {
        if(layerName === trace.url) {
            activeMapLayer = map.addLayer(layer);
        } else {
            map.removeLayer(layer);
        }
    });

    if(!_.has(mapLayerGroups, trace.url)) {
        var path = L.polyline([], {color: 'green', width: 20});
        var lastPosition = undefined;
        _.each(trace.records, function(record) {
            var position = [record.latitude, record.longitude];
            if(position[0] && position[1] &&
                    (!lastPosition || lastPosition != position)) {
                path.addLatLng(position);
                lastPosition = position;
            }
        });

        var start = new L.CircleMarker(_.first(path.getLatLngs()),
                {color: "blue"});
        var end = new L.CircleMarker(_.last(path.getLatLngs()),
                {color: "green"});
        activeMapLayer = mapLayerGroups[trace.url] = L.featureGroup(
                [path, start, end]);
    }

    map.addLayer(activeMapLayer);
    map.fitBounds(activeMapLayer.getBounds());
}
