var gearHistogramHoverHandler = {
    on: function(timestamp, trace) {
        var gear;
        if(timestamp < trace["gear_timeseries"][0].start) {
            gear = trace["gear_timeseries"][0];
        } else if(timestamp > _.last(trace["gear_timeseries"]).end) {
            gear = _.last(trace["gear_timeseries"]);
        } else {
            gear = _.find(trace["gear_timeseries"], function(gearPeriod) {
                return timestamp >= gearPeriod.start && timestamp <= gearPeriod.end;
            });
        }

        if(gear) {
            $("#current_gear_position").text(gear.gear).parent().show();
        }
    },
    off: function() {
        $("#current_gear_position").parent().hide();
    }
}

var drawGearHistogram = function(trace) {
    var context = $("#gear-histogram").get(0).getContext("2d");

    var gearDuration = {first: 0, second: 0, third: 0, fourth: 0, fifth: 0, sixth: 0};
    var gearTimeseries = [];
    var lastGearChange = undefined;
    _.each(trace["transmission_gear_position"], function(record) {
        if(!_.has(gearDuration, record.value)) {
            gearDuration[record.value] = 0;
        }

        lastGearChange = lastGearChange || record;

        gearDuration[lastGearChange.value] += (record.timestamp - lastGearChange.timestamp);
        gearTimeseries.push({
                start: lastGearChange.timestamp,
                end: record.timestamp,
                gear: lastGearChange.value});
        lastGearChange = record;
    });

    trace["gear_timeseries"] = gearTimeseries;
    // TODO this is problematic because transmission gear position is only
    // recorded when it changes, so if the trace starts in the middle of a drive
    // we could not a message for a long time, so the starting timestamp may be
    // a significant duration into the trip
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
