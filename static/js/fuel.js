var updateGasPrices = function(trace) {
    var gasDistance = 5;
    var apiKey = "rfej9napna";
    var position = [trace.latitude[0].value, trace.longitude[0].value];
    $.ajax({
        url: "http://devapi.mygasfeed.com/stations/radius/" +
            position[0] + "/" + position[1] + "/" + gasDistance +
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

var calculateFuelConsumedGallons = function(trace) {
    var fuelConsumed = trace["fuel_consumed_since_restart"];
    var fuelConsumedLiters = _.last(fuelConsumed).value - _.first(fuelConsumed).value;
    return fuelConsumedLiters * .264172;
}

var updateFuelCost = function(trace) {
    $("#total-fuel-consumed").text(calculateFuelConsumedGallons(trace).toFixed(2));
    updateGasPrices(trace);
}
