var http = require("http");
var url = require("url");
var io = require('socket.io');
var EventEmitter = require('events').EventEmitter;

function start(port,controller) {
	var server = http.createServer(function(request, response) {
		console.log("Request received for " + request.url);
		response.write('Welcome to curvy server');
		response.end();
	})
	io = io.listen(server);

	io.configure(function () {
		io.set("polling duration", 10); 
		io.set("origin", "*:*");
		io.set('heartbeat timeout', 30);
		io.set('heartbeat interval', 15);
		io.set('log level', 2 /* info */)
	});
	
	server.listen(port);
	console.log('server started on port ' + port);
	
	io.on('connection', function(socket) {
		console.log('socket.io connection');
		controller.accept(socket);
	});
}

exports.start = start;
