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

                $("#total-fuel-cost").text(averagePrice *
                    trace.fuelConsumedGallons.toFixed(2)).parent().show();
                $("#average-fuel-cost").text(averagePrice.toFixed(2)).parent().show();
            }
        }
    });
}

var fuelConsumedGallons = function(a, b) {
    var fuelConsumedLiters = b.fuel_consumed_since_restart -
            a.fuel_consumed_since_restart;
    return fuelConsumedLiters * .264172;
}

var calculateFuelConsumedGallons = function(trace) {
    return fuelConsumedGallons(_.first(trace.records), _.last(trace.records));
}

var updateFuelEfficiency = function(trace) {
    trace.overallFuelEfficiency = distanceKm(_.first(trace.records),
            _.last(trace.records)) / trace.fuelConsumedGallons;
    $("#fuel-efficiency").text(trace.overallFuelEfficiency.toFixed(2)).parent().show();
}

var updateFuelSummary = function(trace) {
    trace.fuelConsumedGallons = calculateFuelConsumedGallons(trace);
    $("#total-fuel-consumed").text(trace.fuelConsumedGallons.toFixed(2)).parent().show();
    updateGasPrices(trace);
    updateFuelEfficiency(trace);
}

var calculateCumulativeFuelEfficiency = function(trace) {
    _.each(trace.records, function(record) {
        record.cumulativeFuelEfficiency = distanceKm(_.first(trace.records), record) /
                fuelConsumedGallons(_.first(trace.records), record);
    });

    var key = "cumulativeFuelEfficiency";
    graphs[key] = drawTimeseries(trace, key,
        _.pluck(trace.records, "timestamp"), _.pluck(trace.records, key),
        true, true);
}
