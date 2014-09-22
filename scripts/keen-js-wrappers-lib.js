/** Keen JS wrappers **/
/** Scope the variables (it's a bad idea to pollute the global namespace **/
(function($, w) {
    /** This function checks if a function has already been defined **/
    if (!$.fnExists || (typeof($.fnExists) !== typeof(Function))) {
        $.fnExists = function (fn) {
            return (typeof(fn) === typeof(Function));
        }
    }

    /** Fetch dependencies over CDNs if they are not defined yet **/
    var src = {
        // keen: '//d26b395fwzu5fz.cloudfront.net/latest/keen.min.js', // Keen.IO
        keen: './scripts/keen.min.js', // Keen.IO JS SDK is served locally, as for some odd reason, I can't load the library over AWS CDN
        // TODO: Find an alternative Keen JS SDK CDN
        moment: '//cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.2/moment.min.js', // moment
        geoIP: '//freegeoip.net/json/' //geoIP
    };

    $.when(
        (function () {
            $.fnExists(w.Keen) || $.getScript(src.keen) // Keen.IO library
        }()),
        (function () {
            $.fnExists(w.moment) || $.getScript(src.moment) // Date wrangler
        }()),
        w.geoIP || $.ajax({
            url: src.geoIP, // Locational data
            type: 'POST',
            dataType: 'jsonp',
            success: function (obj) {
                w.geoIP = obj;
            }
        })
    )
        .done(function () {
            /** Declare/define up variables/objects **/
            var location = geoIP;
            var url = $.url();
            var timestamp = function () {
                return moment().zone('-05:00').format('YYYY-MM-DD h:mm:ss');
            };

            /** Instance defaults **/
            var defaults = {
                cookiePrefix: 'keen_tracking_',
                send: true,
                debug: false,
                debugPrefix: 'debug_'
            };

            $.keenTracker = function(keys, settings) {
                this.keen = new Keen({
                    projectId: keys.projectId,
                    writeKey: keys.writeKey,
                    readKey: keys.readKey
                });

                this.settings = $.fn.extend(defaults, settings);
            };

            $.keenTracker.prototype.send = function(collection, data) {
                /** Add a prefix to the collection value if on debug mode **/
                collection = this.settings.debug ? this.settings.debugPrefix + collection : collection;

                /** Set up data object **/
                var defaults = {
                    location: location,
                    time: timestamp()
                };

                /** Finalize data object **/
                data = $.fn.extend(defaults, data);

                /** Log data on debug mode **/
                if (this.settings.debug) {
                    var logObject = {};
                    logObject[collection] = data;
                    console.log(logObject);
                }

                if (this.settings.send) {
                    /** Send data to Keen.IO **/
                    this.keen.addEvent(collection, data);
                    /** Log data on debug mode **/
                    if (this.settings.debug) {
                        console.log("Data sent to collection [" + collection + "]");
                    }
                }
            };

            /** Track a single data object **/
            $.keenTracker.prototype.track = function(data, collection, callback) {
                data = $.fn.extend({
                    data: typeof data === typeof (Object) ? {} : null
                }, {
                    data: data
                });

                collection = collection ? collection : 'data_single';

                /** Log Keen data **/
                this.send(collection, data);

                /** Callback **/
                if (typeof callback === typeof Function) {
                    callback();
                }
            };

            /** Trigger the event (because we're using $.when) **/
            $(window).trigger('keenReady');
        });
}(jQuery, window));