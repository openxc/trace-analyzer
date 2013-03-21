var path;
var pathHead;
var map;
var ourPathHead;

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
});
