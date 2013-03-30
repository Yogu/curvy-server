var http = require("http");
var url = require("url");
var io = require('socket.io');
var EventEmitter = require('events').EventEmitter;

io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

function start(port,controller) {
	var server = http.createServer(function(request, response) {
		console.log("Request received for " + request.url);
		response.write('Welcome to curvy server');
		response.end();
	})
	io = io.listen(server);
	server.listen(port);
	console.log('server started on port ' + port);
	
	io.on('connection', function(socket) {
		console.log('socket.io connection');
		controller.accept(socket);
	});
}

exports.start = start;
