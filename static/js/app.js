var map;
var graphs = {};
var traces = {};
var mapLayerGroups = {};

var initDimensions = function(elementId) {
    // automatically size to the container using JQuery to get width/height
    width = $(elementId).width();
    height = $(elementId).height();

    // make sure to use offset() and not position() as we want it relative to
    // the document, not its parent
    xOffset = $(elementId).offset().left;
    yOffset = $(elementId).offset().top;
    return {width: width, height: height, xOffset: xOffset, yOffset: yOffset};
}


function drawTimeseries(elementId, dataX, dataY) {
    // create an SVG element inside the element that fills 100% of the div
    var graph = d3.select(elementId).append("svg:svg").attr("width", "100%")
            .attr("height", "100%");
            hoverContainer = $(elementId + " svg");

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

    $(hoverContainer).mouseleave(function(event) {
        handleMouseOutGraph(event);
    });

    $(hoverContainer).mousemove(function(event) {
        handleMouseOverGraph(event, dimensions);
    });

    // display the line by appending an svg:path element with the data line we created above
    graph.append("svg:path").attr("d", line(_.zip(dataX, dataY)));
    return {graph: graph, hoverLine: hoverLine, dimensions: dimensions};
}

var handleMouseOutGraph = function(event, hoverLine) {
    _.each(_.pluck(graphs, "hoverLine"), function(hoverLine, i) {
        hoverLine.classed("hide", true);
    });
    // TODO hide the labels setValueLabelsToLatest();
}

var handleMouseOverGraph = function(event, dimensions) {
    var mouseX = event.pageX - dimensions.xOffset;
    var mouseY = event.pageY - dimensions.yOffset;

    if(mouseX >= 0 && mouseX <= dimensions.width && mouseY >= 0 && mouseY <= dimensions.height) {
        _.each(_.pluck(graphs, "hoverLine"), function(hoverLine, i) {
            hoverLine.classed("hide", false);

            // set position of hoverLine
            hoverLine.attr("x1", mouseX).attr("x2", mouseX)
            // TODO displayValueLabelsForPositionX(mouseX)
        });
    } else {
        handleMouseOutGraph(event);
    }
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

        var start = L.marker(_.last(path.getLatLngs()), {title: "Start"});
        var end = L.marker(_.last(path.getLatLngs()), {title: "End"});
        activeLayer = mapLayerGroups[traceName] = L.featureGroup([path, start, end]);
    }

    map.addLayer(activeLayer);
    map.fitBounds(activeLayer.getBounds());
    updateGasPrices(traceName, map.getCenter());
}

function updateGasPrices(traceName, position) {
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
                        calculateFuelConsumedGallons(traceName)).toFixed(2));
                $("#average-fuel-cost").text(averagePrice.toFixed(2));
            }
        }
    });
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
                graphs[key] = drawTimeseries("#" + key,
                    _.pluck(data, "timestamp"), _.pluck(data, "value"));
            });

            renderGpsTrace(selectedTrace);

            var fuelConsumed = traces[selectedTrace]["fuel_consumed_since_restart"];
            var fuelConsumedLiters = _.last(fuelConsumed).value - _.first(fuelConsumed).value;
            var fuelConsumedGallons = fuelConsumedLiters * .264172;
            $("#total-fuel-consumed").text(calculateFuelConsumedGallons(selectedTrace).toFixed(2));
        },
        dataType: "text"
    });
}

function calculateFuelConsumedGallons(traceName) {
    var fuelConsumed = traces[traceName]["fuel_consumed_since_restart"];
    var fuelConsumedLiters = _.last(fuelConsumed).value - _.first(fuelConsumed).value;
    return fuelConsumedLiters * .264172;
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
