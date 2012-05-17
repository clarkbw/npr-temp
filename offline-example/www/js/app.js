// Main app file.

// To load an app-specific module, place it in an app/ directory that is a
// sibling to this file. See app/uiNetworks.js and app/uiAppCache.js for
// examples.

// For any third party dependencies, like jQuery, place them in the same
// directory as this file. This avoids having to do module path configuration,
// and keeps the third party libraries out of your app/ directory.

/*global window */

define(function (require) {
    'use strict';

    var $ = require('jquery'),
        Backbone = require("backbone"),
        Store = require("backbone-idb"),
        moment = require("moment"),
        _ = require("underscore"),
        network = require('network');

    // Dependencies that do not have an export of their own, just attach
    // to other objects, like jQuery. These are just used in the example
    // bootstrap modal, not directly in the UI for the network and appCache
    // displays.

    require('bootstrap/button');
    require('bootstrap/transition');
    require('bootstrap/collapse');

    // Wait for the DOM to be ready before showing the network and appCache
    // state.
    $(function () {

        _.mixin({
          ago : function ago(date) { return moment(date).fromNow(); }
        });

        // Enable the UI bindings for the network and appCache displays
        require('app/uiAppCache')();
        require('app/uiWebAppInstall')();

        // fix sub nav on scroll
        var $win = $(window)
          , $nav = $('.subnav')
          , navTop = $('.subnav').length && $('.subnav').offset().top - 40
          , isFixed = 0

        function processScroll() {
          var i, scrollTop = $win.scrollTop()
          if (scrollTop >= navTop && !isFixed) {
            isFixed = 1
            $nav.addClass('subnav-fixed')
          } else if (scrollTop <= navTop && isFixed) {
            isFixed = 0
            $nav.removeClass('subnav-fixed')
          }
        }

        processScroll()

        // hack sad times - holdover until rewrite for 2.1
        $nav.on('click', function () {
          if (!isFixed) setTimeout(function () {  $win.scrollTop($win.scrollTop() - 47) }, 10)
        })

        $win.on('scroll', processScroll);

        window.Story = Backbone.Model.extend({
          idAttribute : "id"
        });
/*
            Stories.sync = Backbone.remotesync;
            Stories.fetch({
              success : function(collection, response) {
                console.log("Stories.fetch", collection, response);
                _.each(collection.models, function(story) {
                    console.log("story", story);
                    var view = new StoryView({model: story});
                    view.model.save();
                    $("#story-list").append(view.render().el);
                });
              },
              error : function(collection, response) {
                console.log("error", collection, response);
              }
            });
            Stories.sync = Backbone.sync;
*/
        window.StoriesStore = new Store("stories");

        window.StoryList = Backbone.Collection.extend({
          model : Story,
          fs: StoriesStore,
          comparator : function comparator(story) {
            return (Date.parse(story.get("pubDate").$text) * -1);
          },
          initialize : function () {
            this.fs.on("ready", this.load, this);
            this.fs.on("ready", this.pull, this);
          },
          load: function() {
            var options = { parse : true };
            var collection = this;
            options.success = function(resp) {
              var models = _.map(resp, function(obj) { return new Story(obj); } );
              collection.reset(models);
            };
            options.error = Backbone.wrapError(options.error, collection, options);
            return (this.sync || Backbone.sync).call(this, 'read', this, options);
          },
          pull: function() {
            var options =  { parse : true };
            var collection = this;
            options.success = function(resp, status, xhr) {
              collection['reset'](collection.parse(resp, xhr), options);
              try {
                _.each(collection.models, function(story) {
                    story.save();
                });
              } catch (e) { console.log("error saving", e); }
            };
            options.error = Backbone.wrapError(options.error, collection, options);
            return (this.sync || Backbone.sync).call(this, 'pull', this, options);
          },
          url : 'http://localhost:8080/stories',
          parse: function(response) {
            if (response && response.list && response.list.story) {
                return response.list.story;
            }
            return null;
          }
        });

        window.Stories = new StoryList;

        window.StoryListView = Backbone.View.extend({
          tagName:  "ul",
          className: "stories unstyled",
          initialize : function () {
            this.model.bind("reset", this.render, this);
          },
          render : function (eventName) {
            //$(this.el).empty();
            _.each(this.model.models, function (story) {
              if ($("#story-" + story.id, this.el).length <= 0) {
                $(this.el).append(new StoryListItemView({model:story}).render().el);
              }
            }, this);
            //PlayListItems.load();
            return this;
          }
        });

        window.StoryListItemView = Backbone.View.extend({
          tagName : "li",
          className : "story-item",
          template: _.template($('#story-li-template').html()),
          initialize : function() {
            this.model.bind("change", this.render, this);
            //this.model.bind("reset", this.render, this);
          },
          render : function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
          }/*,
          image : function image() {
            console.log("IMAGE");
            var img = new Image(),
                canvas = document.createElement("canvas"),  
                ctx = canvas.getContext('2d'),
                base64 = "";

            function onload() {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage( img, 0, 0 );
              base64 = canvas.toDataURL( "image/png" );
              console.log(base64);
              this.model.set({ thumbnail : { medium : { $text : base64 } } } );
            }

            img.onload = onload;

            img.src = $('img', this.el).attr("src");

            // catch an onload that might have already happened
            if (img.complete) {
              onload();
            }

          }*/
        });

        window.PlayListStore = new Store("playlist");

        window.PlayList = Backbone.Collection.extend({
          model : Story,
          fs: PlayListStore,
          initialize : function() {
            //StoriesStore.on("ready", this.load, this);
            this.bind("add", this.post, this);
            StoriesStore.on("ready", this.both, this);
            //this.fs.on("ready", this.pull, this);
          },
          sync : Backbone.remotesync,
          both : function both() {
            if (this.fs.ready) {
              console.log("both");
              var self = this;
              window.setTimeout(function(e) { self.load(); }, 3 * 1000);
              window.setInterval(function(e) { self.pull(); }, 3 * 1000);
            } else {
              console.log("one");
              this.fs.on("ready", this.load, this);
            }
          },
          //load : function load() {
          //  console.log("load");
          //  var options =  { parse : true };
          //  var collection = this;
          //  options.success = function(resp, status, xhr) {
          //    var map = [];
          //    for(var i = 0; resp && i < resp.length; i++) {
          //      var story = window.Stories.get(resp[i]);
          //      console.log(story);
          //      if (!story) { return; }
          //      map.push(new Story(story.toJSON()));
          //    }
          //    //_.map(resp, function(id) { return new Story(window.Stories.get(id).toJSON()); });
          //    console.log("load success", resp, status, xhr, map);
          //    collection['reset'](map, options);
          //  };
          //  options.error = Backbone.wrapError(options.error, collection, options);
          //  (this.sync || Backbone.sync).call(this, 'read', this, options);
          //},
          load: function() {
            var options = { parse : true };
            var collection = this;
            options.success = function(resp) {
              var map = [];
              for(var i = 0; resp && i < resp.length; i++) {
                var story = window.Stories.get(resp[i]);
                console.log(story);
                if (!story) { console.log("no story"); return; }
                map.push(new Story(story.toJSON()));
              }
              //var models = _.map(resp, function(id) { return new Story(window.Stories.get(id).toJSON()); } );
              collection.reset(map);
              collection.pull.call(collection);
            };
            options.error = Backbone.wrapError(options.error, collection, options);
            return (this.sync || Backbone.sync).call(this, 'read', this, options);
          },
          pull: function() {
            var options =  { parse : true };
            var collection = this;
            options.success = function(resp, status, xhr) {
              for(var i = 0; resp && i < resp.length; i++) {
                var story = window.Stories.get(resp[i]), obj;
                console.log(story);
                if (!story) { console.log("no story"); return; }
                obj = new Story(story.toJSON());
                collection.reset(obj);
                obj.save();
              }

            };
            console.log("pulling");
            options.error = Backbone.wrapError(options.error, collection, options);
            (Backbone.sync).call(this, 'pull', this, options);
          },
          post : function post(e) {
            console.log("post", e);
            var options =  { parse : true };
            var collection = this;
            //e.collection = collection;
            options.success = function(resp, status, xhr) {
              //collection['reset'](collection.parse(resp, xhr), options);
              console.log("success", resp, status, xhr)
            };
            options.error = Backbone.wrapError(options.error, collection, options);
            (this.sync || Backbone.sync).call(this, 'create', e, options);
          },
          url : 'http://localhost:8080/playlist'
        });

        window.PlayListItems = new PlayList;

        window.PlayListItemView = Backbone.View.extend({
          tagName : "li",
          className : "playlist-item",
          template: _.template($('#playlist-li-template').html()),
          initialize : function() {
            this.model.bind("change", this.render, this);
          },
          render : function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
          }
        });

        window.PlayListView = Backbone.View.extend({
          template: _.template($('#playlist-ul-template').html()),
          initialize : function () {
            this.model.bind("reset", this.render, this);
            this.model.bind("add", this.render, this);
          },
          render : function (eventName) {
            //console.log("render", eventName);
            if (typeof(eventName) == "undefined") {
              $(this.el).html(this.template());
            }
            _.each(this.model.models, function (story) {
                if ($("#play-" + story.id, this.el).length <= 0) {
                  $("ul.nav", this.el).append(new PlayListItemView({model:story}).render().el);
                }
            }, this);
            return this;
          }
        });

        window.StoryView = Backbone.View.extend({
          tagName:  "div",
          className: "story",
          template: _.template($('#story-template').html()),
          events: {
            "click button.add" : "addToPlaylist"
          },
          addToPlaylist : function(e) {
            //console.log(e);
            //console.log(this);
            window.PlayListItems.add(new Story(this.model.toJSON()));
          },
          render : function() {
            $(this.el).html(this.template(this.model.toJSON()));
            return this;
          }
        });

        // Router
        var AppRouter = Backbone.Router.extend({
            scrollPosition : null,
            routes : {
                "":"list",
                "story/:id":"getStory"
            },
            initialize : function () {
              //window.setTimeout(function(e) { Stories.pull() }, 10 * 1000);
              this.StoryListView = new window.StoryListView({model:window.Stories});
              this.PlayListView = new window.PlayListView({model:window.PlayListItems});
              require('app/uiNetwork')($('#pl').html(this.PlayListView.render().el));
            },
            list : function () {
              if ($("ul.stories").length <= 0) {
                $('#content').append(this.StoryListView.render().el);
              }
              $("div.story").hide();

              var self = this;
              $("ul.stories").fadeIn("fast", function() { $win.scrollTop((this.scrollPosition)? $(this.scrollPosition).offset().top : 0 ); });
            },
            getStory : function (id) {
              // TODO: remember scroll position
              $("ul.stories").hide();
              this.scrollPosition = "#story-" + id;
              var story = window.Stories.get(id);
              if (story == null) {
                console.log("story == null");
                StoriesStore.on("ready",
                              function waitfordb() {
                                console.log("story == null");
                                StoriesStore.off("ready", waitfordb, this);
                                app.getStory(id);
                                console.log("story == null");
                              },
                              this);
                return;
              }
              //console.log(id, window.Stories, story);
              var view = new window.StoryView({model:story});

              if ($("div.story").length <= 0) {
                $('#content').append(view.render().el);
              } else {
                $("div.story").html(view.render().el)
              }
              $("div.story").fadeIn("fast", function() { $win.scrollTop(0); });
              
            }
        });

        var app = new AppRouter();
        Backbone.history.start();

        network.on("online", function() {
            Stories.pull();
        });

    });
});
