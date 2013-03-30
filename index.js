var server = require('./server.js');
var controller = require('./controller.js');
var port = process.env.PORT || 8888;

server.start(port, controller);
