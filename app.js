var server = require('./server.js');
var controller = require('./controller.js');

server.start(process.env.PORT||8888, controller);