var drawGearHistogram = function(trace) {
    var context = $("#gear-histogram").get(0).getContext("2d");

    var gearDuration = {first: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0};
    var gearTimeseries = [];
    var lastGearChange = undefined;
    _.each(trace["transmission_gear_position"], function(record) {
        if(!_.has(gearDuration, record.value)) {
            gearDuration[record.value] = 0;
        }

        if(!lastGearChange) {
            lastGearChange = record;
        }

        gearDuration[lastGearChange.value] += (record.timestamp - lastGearChange.timestamp);
        gearTimeseries.push({
                start: lastGearChange.timestamp,
                end: record.timestamp,
                gear: record.value});
        lastGearChange = record;
    });

    trace["gear_timeseries"] = gearTimeseries;
    var totalDuration = _.last(trace["transmission_gear_position"]).timestamp -
            _.first(trace["transmission_gear_position"]).timestamp;
    var data = {
        labels: _.keys(gearDuration),
        datasets : [{data: _.map(gearDuration,
                function(value) {
                    return value / totalDuration * 100;
            })}]
    };

    var chart = new Chart(context).Bar(data, {scaleLabel : "<%=value%>%"});
}
