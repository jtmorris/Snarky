﻿// For an introduction to the Navigation template, see the following documentation:
// http://go.microsoft.com/fwlink/?LinkId=232506
(function () {
    "use strict";

    WinJS.Binding.optimizeBindingReferences = true;

    var app = WinJS.Application;
    var activation = Windows.ApplicationModel.Activation;
    var nav = WinJS.Navigation;

    app.addEventListener("activated", function (args) {
        if (args.detail.kind === activation.ActivationKind.launch) {
            if (args.detail.previousExecutionState !== activation.ApplicationExecutionState.terminated) {
                // TODO: This application has been newly launched. Initialize
                // your application here.

                //  Populate settings pane
                WinJS.Application.onsettings = null;
                WinJS.Application.onsettings = function (e) {
                    e.detail.applicationcommands = {
                        "privacyPolicy": {
                            title: "Privacy Policy",
                            href: "/html/settingsFlyouts/privacypolicy.html"
                        },
                        //"emailDev": {
                        //    title: "Contact Developer(s)",
                        //    href: "mailto:support.snarky@jtmorris.net"
                        //}
                    }
                    WinJS.UI.SettingsFlyout.populateSettings(e);
                };
            } else {
                // TODO: This application has been reactivated from suspension.
                // Restore application state here.
            }

            if (app.sessionState.history) {
                nav.history = app.sessionState.history;
            }
            args.setPromise(WinJS.UI.processAll().then(function () {
                if (nav.location) {
                    nav.history.current.initialPlaceholder = true;
                    return nav.navigate(nav.location, nav.state);
                } else {
                    return nav.navigate(Application.navigator.home);
                }
            }));
        }
    });

    app.oncheckpoint = function (args) {
        // TODO: This application is about to be suspended. Save any state
        // that needs to persist across suspensions here. If you need to 
        // complete an asynchronous operation before your application is 
        // suspended, call args.setPromise().
        app.sessionState.history = nav.history;

        //  Save updated entry list.
        var session = WinJS.Application.sessionState;
        var folder = Windows.Storage.ApplicationData.current.roamingFolder;

        var str = JSON.stringify(session.sarcasmEntries);

        //  Save the new entries
        args.setPromise(
            folder.createFileAsync("entries.txt", Windows.Storage.CreationCollisionOption.replaceExisting).then(
                function (file) {
                    return Windows.Storage.FileIO.writeTextAsync(file, str);
                }
            ).then(
                function () {
                    log("Saved downloaded entries to file.", "info", "FileIO XHR asynchronousEntryRetrieval()")
                }
            )
        );
    };

    app.start();
})();
