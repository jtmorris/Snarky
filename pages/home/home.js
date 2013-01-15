(function () {
    "use strict";

    WinJS.UI.Pages.define("/pages/home/home.html", {
        // This function is called whenever a user navigates to this page. It
        // populates the page elements with the app's data.
        ready: function (element, options) {
            var self = this;
            var robotInstructionTimeout

            this.loadEntry(false);
            this.tryAutoUpdate();

            //  Setup click listener for robot click
            document.getElementById("robotPic").addEventListener("click", function (event) {
                //  Load a new entry
                self.loadEntry();

                //  Hide the instructions
                $("#robotPic > span.instruction").fadeOut();

                //  Setup some auto instruction fade-ins after some time has elapsed.
                if (robotInstructionTimeout) {
                    clearTimeout(robotInstructionTimeout);
                }
                robotInstructionTimeout = setTimeout(function () {
                    $("#robotPic > span.instruction").fadeIn();
                }, 45000)
            });

            //  Setup click listener for update appbar command
            document.getElementById("cmdUpdate").addEventListener("click", function (event) {
                self.asynchronousEntryRetrieval(true);
            });           
        },

        nextEntryEventHandler: function (event) {
            this.loadEntry();
        },

        loadEntry: function (animateClick) {
            var div = $("#entry");            

            //  Check if we have a saved set of entries in the session
            var session = WinJS.Application.sessionState;
            if (!session.sarcasmEntries) {
                //  Do we have any saved in a file?
                var localFolder = Windows.Storage.ApplicationData.current.localFolder;

                localFolder.getFileAsync("entries.txt").then(
                    function (file) {
                        return Windows.Storage.FileIO.readTextAsync(file);
                    }
                ).done(
                    function (contents) {
                        if (contents) {
                            //  Okay, we have the file.  Load the data and generate a comment!
                            session.sarcasmEntries = JSON.parse(contents);
                            putInDiv(session.sarcasmEntries);
                        }
                        else {
                            log("Empty file \"entry.txt\". Expected contents.", "error", "FileIO XHR");
                            log("Loading default entries included with app.", "info", "failsafe fallback");
                            //  Well... Load the included defaults I guess
                             putInDiv(sarcasmEntries);
                        }
                    },
                    function () {
                        //  Well... Load the included defaults I guess
                        log("No file \"entry.txt\". Haven't retrieved updates from server!", "info", "FileIO XHR");
                        log("Loading default entries included with app.", "info", "failsafe fallback");
                        putInDiv(sarcasmEntries);
                    }
                );
            }   //  end if(!session.sarcasmEntries)
            else {
                //  Well...  Load them!
                putInDiv(session.sarcasmEntries);
            }

            function putInDiv(arr) {
                var maxIndex = arr.length - 1;
                var ranNum = Math.floor(Math.random() * (maxIndex + 1));

                div.fadeOut(function () {
                    div.text(arr[ranNum].entry).fadeIn();
                });
            }
        },

        asynchronousEntryRetrieval: function (manual) {
            if (manual) {
                log("Manual update triggered.", "info", "user interaction");
            }

            var serverURL = "http://sarcasm.jtmorris.net/entry/jsarray/"
            var Promise = WinJS.xhr({ url: serverURL });

            Promise.then(
                //  Success
                function (request) {
                    if (request) {
                        var text = request.responseText;

                        if (text) { //  Yay! It worked. Okay, save it and move on.
                            //  Save it in the session
                            var session = WinJS.Application.sessionState;
                            session.sarcasmEntries = JSON.parse(text);

                            //  Cache it on the device in case there is no Internet
                            var localFolder = Windows.Storage.ApplicationData.current.localFolder;
                            //  Save the new entries
                            localFolder.createFileAsync("entries.txt", Windows.Storage.CreationCollisionOption.replaceExisting).then(
                                function (file) {
                                    return Windows.Storage.FileIO.writeTextAsync(file, text);                                    
                                }
                            ).done(
                                function () {
                                    log("Saved downloaded entries to file.", "info", "FileIO XHR asynchronousEntryRetrieval()")
                                }
                            );

                            //  Save the current date and time in the last update settings.
                            var roamingSettings = Windows.Storage.ApplicationData.current.roamingSettings.values;
                            roamingSettings["lastEntryUpdate"] = new Date();
                        }
                        else {
                            log("No content at " + serverURL + ".", "error", "XHR server asynchronousEntryRetrieval()");
                        }
                    }
                    else {
                        log("Failed XHR request to " + serverURL + ".  Request empty!", "error", "XHR server asynchronousEntryRetrieval()");
                    }
                },
                //  Error
                function (request) {
                    log("Failed XHR request to " + serverURL + ".  Errored response!", "error", "XHR server");
                    log("Response Status Code: " + request.status + " --- Response Status Text: " + request.statusText, "debug", "XHR server asynchronousEntryRetrieval()");
                }
            );
        },

        tryAutoUpdate: function () {
            //  First, let's only update every so often... Say every 2 days
            //  So check if it has been two days since the last update.
            var roamingSettings = Windows.Storage.ApplicationData.current.roamingSettings.values;
            var last = roamingSettings["lastEntryUpdate"];

            //  If there is a last, check if it's been 2 days.  Otherwise, update.
            if (last) {
                var cur = new Date();
                var nextCheck = new Date();
                nextCheck.setDate(last.getDate() + 2);
                if (cur < nextCheck) {  //  No need to check
                    log("Skipping auto-update. It was run within the past 2 days.", "info", "update tryAutoUpdate()");
                    log("Last Update: " + last.toDateString() + " --- Calculated Next Update: " + nextCheck.toDateString(), "debug", "update tryAutoUpdate()");
                    return false;
                }
            }

            
            //  Okay, so we need to update.  But what's the status of the Internet?
            var connectivity = Windows.Networking.Connectivity;
            var connectionLevel = connectivity.NetworkConnectivityLevel;
            var connectionType = connectivity.NetworkCostType;
            var connectionCost = connectivity.ConnectionCost;            
            var goodNow;

            //  Check if we have Internet access first of all
            if (connectionLevel.internetAccess) {    //  Connected to Internet without issue
                //  Okay, now let's make sure we aren't on any kind of data limit
                if (connectionType.unrestricted) { //  Sweet, unrestricted Internet access, query away
                    log("Unrestricted internet access.", "debug", "connectivity tryAutoUpdate()");
                    goodNow = true;
                }
                else if (connectionType.fixed) { //   Eew! Data limits!
                    //  Well, do we have plenty of data available?
                    if (connectionCost.approachingDataLimit ||
                        connectionCost.overDataLimit ||
                        connectionCost.roaming) {   //  You just don't want to have any fun! Well, better not query.
                        log("Internet access with fixed data limit.  Approaching data limit.", "debug", "connectivity tryAutoUpdate()");
                        goodNow = false;
                    }
                }
                else {  //  Well, we either do not know, or have Internet costs that vary based on data.  Better not auto query.
                    log("Metered internet access or unknown cost of connection.", "debug", "connectivity tryAutoUpdate()");
                    goodNow = false;
                }
            }
            else {  //  No internet or limited internet.  Better not query.
                log("No internet access.", "debug", "connectivity tryAutoUpdate()");
                goodNow = false;
            }

            //  If we are good now, then auto update already!
            if (goodNow) {
                this.asynchronousEntryRetrieval();
                return true;
            }

            //  If we are not goodNow, then let's listen for a connection change, and try again.
            var session = WinJS.Application.sessionState;

            //  Let's only do this if we don't already have a listener active
            if (!session.networkChangeListener) {
                connectivity.addEventListener("networkstatuschanged", this.tryAutoUpdate());
            }

            log("Skipping auto-update. Internet access restricted or not available.", "info", "connectivity tryAutoUpdate()");
            return false;
        }
    });
})();
