var updateGasPrices = function(trace) {
    var gasDistance = 5;
    var apiKey = "rfej9napna";
    var recordWithPosition = _.find(trace.records, function(record) {
        return record.latitude && record.longitude;
    });
    $.ajax({
        url: "http://devapi.mygasfeed.com/stations/radius/" +
            recordWithPosition.latitude + "/" + recordWithPosition.longitude +
            "/" + gasDistance + "/reg/price/" + apiKey + ".json",
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
    var fuelConsumedLiters = _.last(trace.records).fuel_consumed_since_restart -
            _.first(trace.records).fuel_consumed_since_restart;
    return fuelConsumedLiters * .264172;
}

var updateFuelCost = function(trace) {
    $("#total-fuel-consumed").text(calculateFuelConsumedGallons(trace).toFixed(2));
    updateGasPrices(trace);
}
