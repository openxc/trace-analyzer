var boxPlotHandler = {
    onLoad: function(trace) {

        var margin = {top: 10, right: 25, bottom: 20, left: 25},
        width = 70 - margin.left - margin.right,
        height = 170 - margin.top - margin.bottom;

        
        var chart = d3.box()
            .whiskers(iqr(1.5))
            .width(width)
            .height(height)
            ;

        var vehicleSpeedData = [];

        var vehicleSpeeds = _.map(_.pluck(trace.records, 'vehicle_speed'), function(num){ return Math.round(num); });        
        vehicleSpeedData[0] = vehicleSpeeds;

        chart.domain([_.min(vehicleSpeeds), _.max(vehicleSpeeds)]);

        var svg = d3.select("#speed_box_plot")
            .data(vehicleSpeedData)
            .append("svg:svg")
            .attr("class", "box")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.bottom + margin.top)
            .call(chart);

       
        // Returns a function to compute the interquartile range.
        function iqr(k) {
          return function(d, i) {
            var q1 = d.quartiles[0],
                q3 = d.quartiles[2],
                iqr = (q3 - q1) * k,
                i = -1,
                j = d.length;
            while (d[++i] < q1 - iqr);
            while (d[--j] > q3 + iqr);
            return [i, j];
          };
        }


    },
    onUnload: function(trace) {
        // TODO could make this faster by caching the graphs instead of forcing
        // re-render, but there really isn't much delay in recalculating right
        // now
        d3.selectAll(".graph svg").remove();
    }
};