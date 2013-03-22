var path;
var pathHead;
var map;
var speedTimestamps = [];
var speedValues = [];

var odoTimestamps = [];
var odoValues = [];

var graphs = {};

var traces = {};

var mapLayerGroups = {};

function drawSparkline(elementId, dataX, dataY) {
    // create an SVG element inside the element that fills 100% of the div
    var graph = d3.select(elementId).append("svg:svg").attr("width",
        "100%").attr("height", "100%");

    // X scale will fit values from 0-10 within range of pixels
    var x = d3.scale.linear().domain([_.min(dataX), _.max(dataX)]).range(
            [0, $(elementId).width()]);
    // Y scale will fit values from 0-10 within pixels 0-100
    var y = d3.scale.linear().domain([_.min(dataY), _.max(dataY)]).range(
            [$(elementId).height(), 0]);

    // create a line object that represents the SVN line we're creating
    var line = d3.svg.line()
    .x(function(d,i) {
        // console.log('Plotting X value for data point: ' + d + ' using index: ' + i + ' to be at: ' + x(i) + ' using our xScale.');
        return x(d[0]);
    })
    .y(function(d) {
        // console.log('Plotting Y value for data point: ' + d + ' to be at: ' + y(d) + " using our yScale.");
        return y(d[1]);
    })

    // display the line by appending an svg:path element with the data line we created above
    graph.append("svg:path").attr("d", line(_.zip(dataX, dataY)));
    return graph;
}

function handleMessage(traceName, message) {
    if(!message) {
        return;
    }

    if(!_.has(traces, traceName)) {
        traces[traceName] = {};
    }

    if(!_.has(traces[traceName], message.name)) {
        traces[traceName][message.name] = [];
    }

    traces[traceName][message.name].push(
            {timestamp: message.timestamp, value: message.value});
}

function updateTraceDownloadProgress(progress) {
    $($("#download-progress progress")).attr("value", progress);
    $($("#download-progress progress")).text(progress + "%");
}
// TODO show renering progress if it takes a while

function renderGpsTrace(traceName) {
    var activeLayer = undefined;
    _.each(mapLayerGroups, function(layer, layerName) {
        if(layerName === traceName) {
            activeLayer = map.addLayer(layer);
        } else {
            map.removeLayer(layer);
        }
    });

    if(!_.has(mapLayerGroups, traceName)) {
        var latitudes = traces[traceName].latitude;
        var longitudes = traces[traceName].longitude;

        var path = L.polyline([], {color: 'green', width: 20});
        for(var i = 0; i < latitudes.length, i < longitudes.length; i++) {
            path.addLatLng([latitudes[i].value, longitudes[i].value]);
        }

        var start = L.marker(path.getLatLngs()[0], {title: "Start"});
        var end = L.marker(path.getLatLngs()[path.getLatLngs().length - 1],
                {title: "End"});
        activeLayer = mapLayerGroups[traceName] = L.featureGroup([path, start, end]);
    }

    map.addLayer(activeLayer);
    map.fitBounds(activeLayer.getBounds());
}

function loadTrace(selectedTrace) {
    $.ajax({
        xhr: function() {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener("progress", function(evt){
                if(evt.lengthComputable) {
                    var percentComplete = evt.loaded / evt.total;
                    updateTraceDownloadProgress(percentComplete * 100);
                }
            }, false);
            return xhr;
        },
        url: selectedTrace,
        success: function(data) {
            $("#download-progress").text("Trace download complete.");
            setTimeout(function() {
                $("#download-progress").hide();
            }, 8);

            _.each(data.split("\n"), function(line, i) {
                if(line) {
                    handleMessage(selectedTrace, JSON.parse(line));
                }
            });


            _.each(["vehicle_speed", "engine_speed", "odometer",
                    "torque_at_transmission", "accelerator_pedal_position",
                    "fuel_consumed_since_restart"], function(key, i) {
                var data = traces[selectedTrace][key];
                graphs[key] = drawSparkline("#" + key,
                    _.pluck(data, "timestamp"), _.pluck(data, "value"));
            });

            renderGpsTrace(selectedTrace);
        },
        dataType: "text"
    });
}

$(document).ready(function() {
    map = L.map('map', {zoom: 10});
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 16
    }).addTo(map);

    var selectedTrace = $("#traces .active").attr("href");
    loadTrace(selectedTrace);
});
