This is a temp repo for putting together an example NPR web application using volo

There are two directories here each with a different demo.

The NPR appcache demo shows how to load the offline content for an app using a full screen splash we provide for apps
`appcache-example`

* Requires
** create a build using `volo appcache`
** run a dev webserver using `node tools/devserver.js docRoot=www-built`

The NPR offline demo shows offline data using indexdb.
`offline-example`

* Requires
** a local running redis-server
** running `node server.js` to pull the data down from NPR
