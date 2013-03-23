var map;
var graphs = {};
var traces = {};
var mapLayerGroups = {};
var activeMapLayer = undefined;
var hoverMapMarker;

var onTraceLoadCallbacks = [];

var initDimensions = function(elementId) {
    // automatically size to the container using JQuery to get width/height
    width = $("#" + elementId).width();
    height = $("#" + elementId).height();

    // make sure to use offset() and not position() as we want it relative to
    // the document, not its parent
    xOffset = $("#" + elementId).offset().left;
    yOffset = $("#" + elementId).offset().top;
    return {width: width, height: height, xOffset: xOffset, yOffset: yOffset};
}


function drawTimeseries(trace, elementId, dataX, dataY) {
    // create an SVG element inside the element that fills 100% of the div
    var graph = d3.select("#" + elementId).append("svg:svg").attr("width", "100%")
            .attr("height", "100%");
            hoverContainer = $("#" + elementId + " svg");

    var dimensions = initDimensions(elementId);

    // X scale will fit values from 0-10 within range of pixels
    var x = d3.scale.linear().domain([_.min(dataX), _.max(dataX)]).range(
            [0, dimensions.width]);
    // Y scale will fit values from 0-10 within pixels 0-100
    var y = d3.scale.linear().domain([_.min(dataY), _.max(dataY)]).range(
            [dimensions.height, 0]);

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

    var hoverLineGroup = graph.append("svg:svg").attr("class", "hover-line");
    var hoverLine = hoverLineGroup.append("svg:line")
        .attr("x1", 10).attr("x2", 10)
        .attr("y1", 0).attr("y2", dimensions.height);
    hoverLine.classed("hide", true);

    // display the line by appending an svg:path element with the data line we created above
    graph.append("svg:path").attr("d", line(_.zip(dataX, dataY)));

    var graphHolder = {elementId: elementId, graph: graph, x: x, y: y,
            hoverLine: hoverLine, dimensions: dimensions, dataX: dataX,
            dataY: dataY};

    $(hoverContainer).mouseleave(function(event) {
        handleMouseOutGraph(event);
    });

    $(hoverContainer).mousemove(function(event) {
        handleMouseOverGraph(event, trace, graphHolder);
    });

    return graphHolder;
}

var handleMouseOutGraph = function(event) {
    _.each(graphs, function(graph, i) {
        graph.hoverLine.classed("hide", true);
        $("#current_" + graph.elementId).parent().hide();
    });
    map.removeLayer(hoverMapMarker);
    // TODO hide the labels setValueLabelsToLatest();
}

// TODO no steady step in the graphs, so we can ball park it or brute force
// TODO is this zipped data available through the graph?
var findClosestToX = function(targetX, dataX, dataY) {
    return _.find(_.zip(dataX, dataY), function(element) {
        return element[0] > targetX - 1 && element[0] < targetX + 1;
    });
}

var handleMouseOverGraph = function(event, trace, graph) {
    var mouseX = event.pageX - graph.dimensions.xOffset;
    var mouseY = event.pageY - graph.dimensions.yOffset;

    if(mouseX >= 0 && mouseX <= graph.dimensions.width && mouseY >= 0 &&
            mouseY <= graph.dimensions.height) {
        var hoveredTimestamp = graph.x.invert(mouseX);

        _.each(graphs, function(otherGraph, i) {
            otherGraph.hoverLine.classed("hide", false);

            // set position of hoverLine
            otherGraph.hoverLine.attr("x1", mouseX).attr("x2", mouseX)

            var hoveredValue = findClosestToX(hoveredTimestamp,
                    otherGraph.dataX, otherGraph.dataY)[1];
                $("#current_" + otherGraph.elementId).text(hoveredValue.toFixed(2)).parent().show();
        });

        // TODO find closest timestamp in trace
        var latitudes = trace.latitude;
        var longitudes = trace.longitude;
        var closestPosition = findClosestToX(hoveredTimestamp,
            _.pluck(latitudes, "timestamp"), _.zip(latitudes, longitudes))[1];

        if(!hoverMapMarker) {
            hoverMapMarker = L.marker([0, 0]);
        }
        hoverMapMarker.setLatLng([closestPosition[0].value,
                closestPosition[1].value]).addTo(map);
    } else {
        handleMouseOutGraph(event);
    }
}

function handleMessage(traceUrl, message) {
    if(!message) {
        return;
    }

    if(!_.has(traces, traceUrl)) {
        traces[traceUrl] = {url: traceUrl};
    }

    if(!_.has(traces[traceUrl], message.name)) {
        traces[traceUrl][message.name] = [];
    }

    traces[traceUrl][message.name].push(
            {timestamp: message.timestamp, value: message.value});
}

function updateTraceDownloadProgress(progress) {
    $($("#download-progress progress")).attr("value", progress);
    $($("#download-progress progress")).text(progress + "%");
}
// TODO show renering progress if it takes a while

function renderGpsTrace(trace) {
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
    updateGasPrices(trace, map.getCenter());
}

function updateGasPrices(trace, position) {
    var gasDistance = 5;
    var apiKey = "rfej9napna";
    $.ajax({
        url: "http://devapi.mygasfeed.com/stations/radius/" +
            position.lat + "/" + position.lng + "/" + gasDistance +
            "/reg/price/" + apiKey + ".json",
        dataType: "jsonp",
        success: function(data) {
            var stations = data["stations"];
            if(stations && stations.length > 0) {
                var stationsWithPrice = _.filter(stations, function(station) {
                    return station.price != "N/A";
                });

                var averagePrice = _.reduce(stationsWithPrice,
                        function(memo, station) {
                            return memo + parseInt(station.price);
                        }, 0) / stationsWithPrice.length;

                $("#total-fuel-cost").text((averagePrice *
                        calculateFuelConsumedGallons(trace)).toFixed(2));
                $("#average-fuel-cost").text(averagePrice.toFixed(2));
            }
        }
    });
}

var drawTimeseriesGraphs = function(trace) {
    _.each(["vehicle_speed", "engine_speed", "odometer",
            "torque_at_transmission", "accelerator_pedal_position",
            "fuel_consumed_since_restart"], function(key, i) {
        var data = trace[key];
        graphs[key] = drawTimeseries(trace, key, _.pluck(data, "timestamp"),
                _.pluck(data, "value"));
    });
}

var updateFuelCost = function(trace) {
    var fuelConsumed = trace["fuel_consumed_since_restart"];
    var fuelConsumedLiters = _.last(fuelConsumed).value - _.first(fuelConsumed).value;
    var fuelConsumedGallons = fuelConsumedLiters * .264172;
    $("#total-fuel-consumed").text(calculateFuelConsumedGallons(trace).toFixed(2));
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

            _.each(onTraceLoadCallbacks, function(callback) {
                callback(traces[selectedTrace]);
            });
        },
        dataType: "text"
    });
}

function calculateFuelConsumedGallons(trace) {
    var fuelConsumed = trace["fuel_consumed_since_restart"];
    var fuelConsumedLiters = _.last(fuelConsumed).value - _.first(fuelConsumed).value;
    return fuelConsumedLiters * .264172;
}

$(document).ready(function() {
    map = L.map('map', {zoom: 10});
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 16
    }).addTo(map);

    onTraceLoadCallbacks.push(drawTimeseriesGraphs);
    onTraceLoadCallbacks.push(renderGpsTrace);
    onTraceLoadCallbacks.push(updateFuelCost);
    onTraceLoadCallbacks.push(drawGearHistogram);
    loadTrace($("#traces .active").attr("href"));
});
