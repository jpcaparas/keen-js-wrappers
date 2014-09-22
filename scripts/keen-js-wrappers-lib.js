/** Keen JS wrappers **/
/** Scope the variables (it's a bad idea to pollute the global namespace **/
(function($, w, d) {
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
        cookie: '//cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js', // jquery-cookie
        purl: '//cdnjs.cloudflare.com/ajax/libs/jquery-url-parser/2.3.1/purl.min.js', // pURL
        moment: '//cdnjs.cloudflare.com/ajax/libs/moment.js/2.8.2/moment.min.js', // moment
        geoIP: '//freegeoip.net/json/' //geoIP
    };

    $.when(
        (function () {
            $.fnExists(w.Keen) || $.getScript(src.keen) // Keen.IO library
        }()),
        (function () {
            $.fnExists($.cookie) || $.getScript(src.cookie) // Cookie
        }()),
        (function () {
            $.fnExists($.url) || $.getScript(src.purl) // URL parser
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
                this.client = new Keen({
                    projectId: keys.projectId,
                    writeKey: keys.writeKey,
                    readKey: keys.readKey
                });

                this.settings = $.fn.extend(defaults, settings);
            };

            $.keenTracker.prototype.send = function(collection, data) {
                collection = this.settings.debug ? this.settings.debugPrefix + collection : collection;

                /** Build data **/
                var defaults = {
                    location: location,
                    time: timestamp()
                };

                data = $.fn.extend(defaults, data);

                /** Log data **/
                if (this.settings.debug) {
                    var logObject = {};
                    logObject[collection] = data;
                    console.log(logObject);
                }


                /** Send data to Keen.IO **/
                if (this.settings.send) {
                    this.client.addEvent(collection, data);
                    if (this.settings.debug) {
                        console.log("Data sent to collection [" + collection + "]");
                    }
                }
            };

            /** Track registrations **/
            $.keenTracker.prototype.registration = function(data, collection) {
                /** Set up defaults **/
                var defaults = {
                    email: 'n/a',
                    source: url.param('utm_source') || url.attr('host'),
                    source_referrer: d.referrer || 'n/a',
                    landing_page: url.attr('host') + url.attr('path') || 'n/a',
                    landing_page_variant: url.param('landing_page_variant') || 'default',
                    campaign: url.param('utm_campaign') || 'n/a',
                    medium: url.param('utm_medium') || 'website',
                    content: url.param('utm_content') || 'n/a'
                };

                /** Merge defaults with user params **/
                data = $.fn.extend(defaults, data);

                collection = collection ? collection : 'registration';

                /** Log Keen data **/
                this.send(collection, data);
            };

            /** Track form submission problems **/
            $.keenTracker.prototype.form_problems = function(data, collection) {
                /** Set up defaults **/
                var defaults = {
                    problem_fields: data
                };

                data = $.fn.extend(defaults, {
                    problem_fields: data
                });

                collection = collection ? collection : 'form_success';

                /** Log Keen data **/
                this.send(collection, data);
            };

            /** Track first field focus **/
            $.keenTracker.prototype.field_focus = function(data, collection) {
                /** Set up defaults **/
                var defaults = {
                    field_focus: data
                };

                data = $.fn.extend(defaults, {
                    field_focus: data
                });

                collection = collection ? collection : 'field_focus';

                /** Log Keen data **/
                this.send(collection, data);
            };

            /** Trigger the event (because we're using $.when) **/
            $(window).trigger('keenReady');
        });
}(jQuery, window, document));