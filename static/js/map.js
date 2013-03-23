var map;
var mapLayerGroups = {};
var activeMapLayer = undefined;
var hoverMapMarker;

var mapHoverHandler = {
    on: function(timestamp, trace) {
        var latitudes = trace.latitude;
        var longitudes = trace.longitude;
        var closestPosition = findClosestToX(timestamp,
            _.pluck(latitudes, "timestamp"), _.zip(latitudes, longitudes))[1];

        if(!hoverMapMarker) {
            hoverMapMarker = L.marker([0, 0]);
        }
        hoverMapMarker.setLatLng([closestPosition[0].value,
                closestPosition[1].value]).addTo(map);
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
        var latitudes = trace.latitude;
        var longitudes = trace.longitude;

        var path = L.polyline([], {color: 'green', width: 20});
        for(var i = 0; i < latitudes.length, i < longitudes.length; i++) {
            path.addLatLng([latitudes[i].value, longitudes[i].value]);
        }

        var start = new L.CircleMarker(_.first(path.getLatLngs()),
                {color: "blue"});
        var end = new L.CircleMarker(_.last(path.getLatLngs()),
                {color: "green"});
        activeMapLayer = mapLayerGroups[trace.url] = L.featureGroup([path, start, end]);
    }

    map.addLayer(activeMapLayer);
    map.fitBounds(activeMapLayer.getBounds());
}
