var drawSpeedBoxplot = function(trace) {
    var chart = d3.box()
        .whiskers(iqr(1.5))
        .width(400)
        .height(300);

    var data = {0: [1,2,3,4,5,10,20,2,3,4]};
    chart.domain([_.min(data), _.max(data)]);

    var graph = d3.select("#speed-box").append("svg:svg").attr("width", "100%")
            .attr("height", "100%");
    graph.data(data)
        .enter().append("svg")
        .attr("class", "box")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", "translate(0, 0)")
        .call(chart);
}

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
