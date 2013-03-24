var traces = {};
var dynamics = {};

var finishProgress = function(type) {
    $("#" + type + "-progress").text("Trace " + type + " complete.");
    setTimeout(function() {
        $("#" + type + "-progress").hide();
    }, 8);
}

var updateProgress = function(element, progress) {
    $(element).show();
    $(element).attr("value", progress);
    $(element).text(progress + "%");
}

var processTrace = function(selectedTrace, data) {
    var count = 0;
    var lastLoggedProgress = 0;
    var progressElement = $("#analysis-progress progress");
    _.each(data.split("\n"), function(line, i) {
        if(line) {
            handleMessage(selectedTrace, JSON.parse(line));
            count += line.length;
            var progress = count / data.length * 100;
            if(progress >= lastLoggedProgress + 1) {
                updateProgress(progressElement, progress);
                lastLoggedProgress = progress;
            }
        }
    });

    _.each(onTraceLoadCallbacks, function(callback) {
        callback(traces[selectedTrace]);
    });

    finishProgress("analysis");
}

var loadTrace = function(selectedTrace) {
    $.ajax({
        xhr: function() {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener("progress", function(evt){
                if(evt.lengthComputable) {
                    var percentComplete = evt.loaded / evt.total;
                    updateProgress($("#download-progress progress"), percentComplete * 100);
                }
            }, false);
            return xhr;
        },
        url: selectedTrace,
        success: function(data) {
            finishProgress("download");
            processTrace(selectedTrace, data);
        },
        dataType: "text"
    });
}

var handleMessage = function(traceUrl, message) {
    if(!message) {
        return;
    }

    if(!_.has(traces, traceUrl)) {
        traces[traceUrl] = {url: traceUrl, records: []};
    }

    // TODO this assumes we never get the exact same timestamp 2 messages in a
    // row, which I think is a safe assumption because the precision of the
    // timestamps is very high right now
    dynamics.timestamp = message.timestamp;
    dynamics[message.name] = message.value;

    var records = traces[traceUrl].records;
    var dynamicsCopy = $.extend({}, dynamics);
    if(records.length > 0 && dynamics.timestamp - _.last(records).timestamp  < 1) {
        dynamicsCopy.timestamp = _.last(records).timestamp;
        traces[traceUrl].records[records.length - 1] = dynamicsCopy;
    } else {
        traces[traceUrl].records.push(dynamicsCopy);
    }
}
