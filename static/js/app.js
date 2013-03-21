var path;
var pathHead;
var map;
var ourPathHead;

function drawSparkline(elementId, width, height, dataX, domainX, dataY, domainY) {
    // create an SVG element inside the element that fills 100% of the div
    var graph = d3.select(elementId).append("svg:svg").attr("width",
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

$(document).ready(function() {
    var startingPosition = new L.LatLng(39.970806, -119.387054);
    map = L.map('map').setView(startingPosition, 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 14
    }).addTo(map);

    ourPath = L.polyline([], {color: 'blue'}).addTo(map);
    ourPathHead = L.marker(startingPosition).addTo(map);
    // create a red polyline from an arrays of LatLng points
    path = L.polyline([], {color: 'red'}).addTo(map);
    pathHead = L.circle(startingPosition, 100).addTo(map);

    drawSparkline("#speed", 200, 50, _.range(200), [0, 10],
            _.range(200), [0, 10]);

    drawSparkline("#odometer", 200, 50, _.range(200), [0, 10],
            _.range(200), [0, 10]);
});
