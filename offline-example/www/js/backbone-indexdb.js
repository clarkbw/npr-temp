//Wrapped in an outer function to preserve global this
(function (root) { define(['backbone'], function (Backbone) { (function () {

//var network = require("./network");

// A simple module to replace `Backbone.sync` with *indexDB*-based
// persistence. Models are given incrementing ids, and saved into a JSON
// object. Simple as that.

var indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB,
    IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction,
    dbVersion = 1.0;

// Our Store is represented by a single JS object in *indexDB*. Create it
// with a meaningful name, like the name you'd give a table.
root.Store = function(name) {
  this.name = name;
  this.db = null;

  this.request = indexedDB.open(this.name + "-file", dbVersion);

  this.request.onerror = function (event) {
    console.log("Error creating/accessing IndexedDB database");
  };

  this.request.onsuccess = function (event) {
    //console.log('event', event, event.result, event.target.result);
    this.db = event.target.result;

    this.db.onerror = function (event) {
      console.log("Error creating/accessing IndexedDB database", event);
    };

  }.bind(this);

  this.request.onupgradeneeded = function onupgradeneeded(event) {
    //console.log("onupgradeneeded", event);
    this.createObjectStore(event.target.result);
  }.bind(this);

};

_.extend(root.Store.prototype, {

  createObjectStore : function (db) {
    console.log("createObjectStore ", this.name);
    if (!db.objectStoreNames.contains(this.name)) {
      console.log("creating ", this.name);
      var store = db.createObjectStore(this.name,  { keyPath: 'id', autoIncrement: false });
      console.log("store", store);
    }
   },

  create: function(model, cb) {
    if (!model.id) { throw "no id exception!"; }
    console.log("create", model.id);
    var transaction = this.db.transaction([this.name], IDBTransaction.READ_WRITE);
    var request = trans.objectStore(this.name).put(model.toJSON());
    transaction.put(model.toJSON(), model.id);
    request.onsuccess = function (event) {
      var data = event.target.result;
      console.log("create : data ", data);
      cb.call(this, data);
    }
  },

  // Update a model by replacing its copy in `this.data`.
  update: function(model, cb) {
    if (!model.id) { throw "no id exception!"; }
    console.log("update", model.id);
    var transaction = this.db.transaction([this.name], IDBTransaction.READ_WRITE);
    var request = trans.objectStore(this.name).put(model.toJSON());
    transaction.put(model.toJSON(), model.id);
    request.onsuccess = function (event) {
      var data = event.target.result;
      console.log("update : data ", data);
      cb.call(this, data);
    }
  },

  // Retrieve a model from `this.data` by id.
  find: function(model, cb) {
    if (!model.id) { throw "no id exception!"; }
    console.log("find", model.id);
    var trans = this.db.transaction(this.name, IDBTransaction.READ_ONLY);
    var request = trans.objectStore(this.name).get(model.id);
    request.onsuccess = function (event) {
      var data = event.target.result;
      console.log("find : data ", data);
      cb.call(this, data);
    }.bind(this);

  },

  // Return the array of all models currently in storage.
  findAll: function(cb) {
    console.log("findall", this, this.db, this.request);
    var trans = this.db.transaction(this.name, IDBTransaction.READ_ONLY);
    trans.objectStore(this.name).openCursor().onsuccess = function (event) {
      var cursor = event.result,
          results = [];
      // If cursor is null then we've completed the enumeration.
      if (!cursor) {
        return;
      }
      while( cursor.continue() ) {
        results.push(cursor.value);
      }
      console.log("RESULTS", results);
      cb.call(this, results);
    }.bind(this);
  },

  // Delete a model from `this.data`, returning it.
  destroy: function(model, cb) {
    if (!model.id) { throw "no id exception!"; }
    console.log("destroy", model.id);
    var trans = this.db.transaction(this.name, IDBTransaction.READ_WRITE);
    var request = trans.objectStore(this.name).delete(model.id);
    request.onsuccess = function (event) {
      var data = event.target.result;
      console.log("destroy : data ", data);
      cb.call(this, data);
    }.bind(this);
  }

});

// Override `Backbone.sync` to use delegate to the model or collection's
// *localStorage* property, which should be an instance of `Store`.
Backbone.remotesync = Backbone.sync;
Backbone.sync = function(method, model, options) {

  console.log("sync");

  var store = model.indexdb || model.collection.indexdb;

  // this is a lame way to ensure we don't be the onsuccess call to
  if (store.db == null) {
    window.setTimeout(function() { Backbone.sync(method,model,options); }, 1 * 1000);
    return;
  }

  var cb = function(resp) {
    if (resp) {
      options.success(resp);
    } else {
      options.error("Record not found");
    }
  };

  //console.log("network", network);
  //if (network == "online") {
    //console.log("network.remotesync", network);
      //Backbone.remotesync.call(Backbone, method, model, options);
  //}

  switch (method) {
    case "read":
      if (model.id) {
        store.find(model, cb);
      } else {
        store.findAll(cb);
        // set a remote sync call in the background
        window.setTimeout(function() { Backbone.remotesync.call(Backbone, method, model, options); } , 100);
      }
    break;
    case "create":  store.create(model, cb);                            break;
    case "update":  store.update(model, cb);                            break;
    case "delete":  store.destroy(model, cb);                           break;
  }

};

}.call(root));

return Store;

}); }(this));
