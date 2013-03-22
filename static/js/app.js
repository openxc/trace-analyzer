var path;
var pathHead;
var map;
var speedTimestamps = [];
var speedValues = [];

var odoTimestamps = [];
var odoValues = [];

var graphs = {};;

var traces = {};

function drawSparkline(elementId, width, height, dataX, dataY) {
    // create an SVG element inside the element that fills 100% of the div
    var graph = d3.select(elementId).append("svg:svg").attr("width",
        "100%").attr("height", "100%");

    // X scale will fit values from 0-10 within range of pixels
    var x = d3.scale.linear().domain([_.min(dataX), _.max(dataX)]).range([0, width]);
    // Y scale will fit values from 0-10 within pixels 0-100
    var y = d3.scale.linear().domain([_.min(dataY), _.max(dataY)]).range([height, 0]);

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

function renderGpsTrace(traceName) {
    var latitudes = traces[traceName].latitude;
    var longitudes = traces[traceName].longitude;

    for(var i = 0; i < latitudes.length, i < longitudes.length; i++) {
        path.addLatLng([latitudes[i].value, longitudes[i].value]);
    }

    pathHead.setLatLng(path.getLatLngs()[path.getLatLngs().length - 1]);
    map.fitBounds(path.getBounds());
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

            $.each(data.split("\n"), function(i, line) {
                if(line) {
                    handleMessage(selectedTrace, JSON.parse(line));
                }
            });

            renderGpsTrace(selectedTrace);
            var speeds = traces[selectedTrace].vehicle_speed;
            graphs.speed = drawSparkline("#speed", 200, 50,
                _.pluck(speeds, "timestamp"), _.pluck(speeds, "value"));
        },
        dataType: "text"
    });
}

$(document).ready(function() {
    var startingPosition = new L.LatLng(39.970806, -119.387054);
    map = L.map('map').setView(startingPosition, 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 16
    }).addTo(map);


    // create a red polyline from an arrays of LatLng points
    path = L.polyline([], {color: 'red', width: 20}).addTo(map);
    pathHead = L.circle(startingPosition, 25).addTo(map);

    var selectedTrace = $("#traces .active").attr("href");
    loadTrace(selectedTrace);
});
