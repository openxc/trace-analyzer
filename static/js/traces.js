var traces = {};
var dynamics = {};

var finishTraceDownload = function() {
    $("#download-progress").text("Trace download complete.");
    setTimeout(function() {
        $("#download-progress").hide();
    }, 8);
}

var processTrace = function(selectedTrace, data) {
    _.each(data.split("\n"), function(line, i) {
        if(line) {
            handleMessage(selectedTrace, JSON.parse(line));
        }
    });

    _.each(onTraceLoadCallbacks, function(callback) {
        callback(traces[selectedTrace]);
    });
}

var loadTrace = function(selectedTrace) {
    $.ajax({
        xhr: function() {
            var xhr = new window.XMLHttpRequest();
            xhr.addEventListener("progress", function(evt){
                if(evt.lengthComputable) {
                    var percentComplete = evt.loaded / evt.total;
                    updateTraceDownloadProgress(percentComplete * 100);
                }
            }, false);
            return xhr;
        },
        url: selectedTrace,
        success: function(data) {
            finishTraceDownload();
            processTrace(selectedTrace, data);
        },
        dataType: "text"
    });
}

var updateTraceDownloadProgress = function(progress) {
    $($("#download-progress progress")).attr("value", progress);
    $($("#download-progress progress")).text(progress + "%");
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
    var dynamicsCopy = $.extend(true, {}, dynamics);
    if(records.length > 0 && dynamics.timestamp - _.last(records).timestamp  < 1) {
        dynamicsCopy.timestamp = _.last(records).timestamp;
        traces[traceUrl].records[records.length - 1] = dynamicsCopy;
    } else {
        traces[traceUrl].records.push(dynamicsCopy);
    }
}
