var path;
var pathHead;
var map;
var speedTimestamps = [];
var speedValues = [];

var odoTimestamps = [];
var odoValues = [];

var graph;

var traces = {};

function drawSparkline(elementId, width, height, dataX, domainX, dataY,
        domainY) {
    // create an SVG element inside the element that fills 100% of the div
    graph = d3.select(elementId).append("svg:svg").attr("width",
        "100%").attr("height", "100%");

    // X scale will fit values from 0-10 within range of pixels
    var x = d3.scale.linear().domain(domainX).range([0, width]);
    // Y scale will fit values from 0-10 within pixels 0-100
    var y = d3.scale.linear().domain(domainY).range([0, height]);

    // create a line object that represents the SVN line we're creating
    var line = d3.svg.line()
    // assign the X function to plot our line as we wish
    .x(function(d,i) {
        // return the X coordinate where we want to plot this datapoint
        return x(i);
    })
    .y(function(d) {
        // return the Y coordinate where we want to plot this datapoint
        return y(d);
    })

    // display the line by appending an svg:path element with the data line we created above
    graph.append("svg:path").attr("d", line(dataX));
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

function loadTrace() {
    var selectedTrace = $("#traces .active").attr("href");
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

    loadTrace();
    drawSparkline("#speed", 200, 50, _.range(200), [0, 10],
            _.range(200), [0, 10]);

    drawSparkline("#odometer", 200, 50, _.range(200), [0, 10],
            _.range(200), [0, 10]);
});
