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

var drawTimeseries = function(trace, elementId, dataX, dataY) {
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

    // create a line object that represents the SVG line we're creating
    var line = d3.svg.line()
    .x(function(d,i) {
        return x(d[0]);
    })
    .y(function(d) {
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

var timeseriesHoverHandler = {
    on: function(timestamp, trace, mouseX, mouseY) {
        _.each(graphs, function(otherGraph, i) {
            otherGraph.hoverLine.classed("hide", false);

            // set position of hoverLine
            otherGraph.hoverLine.attr("x1", mouseX).attr("x2", mouseX)

            var hoveredValue = findClosestToX(timestamp,
                otherGraph.dataX, otherGraph.dataY)[1];
            $("#current_" + otherGraph.elementId).text(hoveredValue.toFixed(2)).parent().show();
        });
    },
    off: function() {
        _.each(graphs, function(graph, i) {
            graph.hoverLine.classed("hide", true);
            $("#current_" + graph.elementId).parent().hide();
        });
    }
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

