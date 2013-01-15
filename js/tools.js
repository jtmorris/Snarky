function log(message, type, tags) {
    /***
     * This function is called whenever some even needs to be logged by the app.
     *
     * PARAMETERS:
         * message:  A string explaining what the log entry is about, the time and date, and any relevant data.
         * type:  A string containing a description of what type of log entry.  (e.g. "error", "debug", "info", "performance", "warn")
         * tags:  *OPTIONAL* A string containing a space separated list of tags to help narrow down what the error is.
     * RETURNS:  
     ***/

    //  Get date and time as a string.
    var now = new Date();
    var month = now.getMonth() + 1;
    var day = now.getDate()
    var year = now.getFullYear();

    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();

    var date = month + "/" + day + "/" + "/" + year + " " + hour + ":" + minute + ":" + second;

    //  Let's create a single, organized string with the provided data.
    var string;

    //  Define some delimiters
    var brace = "||"
    var separator = " | - | - | - | - |"

    string = brace + " TIME: " + date + " " + brace + separator;

    if (type) {
        string += brace + " TYPE:  " + type + " " + brace + separator;
    }

    string += brace + " MESSAGE: " + message + " " + brace + separator;

    if (tags) {
        string += brace + " TAGS: " + tags + " " + brace + separator;
    }

    //  Now use that to do something
    //  Save it to a log file
    var localFolder = Windows.Storage.ApplicationData.current.localFolder;
    //  If the log file is over 1MB in size, delete it and start over.
    //  Otherwise, just append the message to the existing log file.
    localFolder.createFileAsync("log.txt", Windows.Storage.CreationCollisionOption.openIfExists).then(
        function (file) {
            file.getBasicPropertiesAsync().done(
                function (prop) {
                    var size = prop.size;                    
                    if (size > 1048576) { //   1048576 = 1MB in bytes
                        Windows.Storage.FileIO.writeTextAsync(file, string + "\r\n");    //  Will overwrite existing file contents
                    }
                    else {
                        Windows.Storage.FileIO.appendTextAsync(file, string + "\r\n");   //  Will append to existing file contents
                    }
                }
            );
        }
    );
}