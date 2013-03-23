function loadTrace(selectedTrace) {
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
            $("#download-progress").text("Trace download complete.");
            setTimeout(function() {
                $("#download-progress").hide();
            }, 8);

            _.each(data.split("\n"), function(line, i) {
                if(line) {
                    handleMessage(selectedTrace, JSON.parse(line));
                }
            });

            _.each(onTraceLoadCallbacks, function(callback) {
                callback(traces[selectedTrace]);
            });
        },
        dataType: "text"
    });
}

function updateTraceDownloadProgress(progress) {
    $($("#download-progress progress")).attr("value", progress);
    $($("#download-progress progress")).text(progress + "%");
}

function handleMessage(traceUrl, message) {
    if(!message) {
        return;
    }

    if(!_.has(traces, traceUrl)) {
        traces[traceUrl] = {url: traceUrl};
    }

    if(!_.has(traces[traceUrl], message.name)) {
        traces[traceUrl][message.name] = [];
    }

    traces[traceUrl][message.name].push(
            {timestamp: message.timestamp, value: message.value});
}

