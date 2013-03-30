var contacts = {};
var sockets = [];

function accept(socket) {
	var isLoggedIn = false;
	var contact = null;
	var user = null;
	
	socket.on('login', function(data) {
		if (isLoggedIn) {
			socket.emit('error', {message: 'already logged in'});
			socket.disconnect();
			return;
		}
		
		user = (data.user || "").trim();
		if (!user) {
			socket.emit('error', {message: 'specify user name'});
			socket.disconnect();
			return;
		}
		
		contact = addContact(user);
		if (!contact) {
			socket.emit('name_not_available');
			socket.disconnect();
			return;
		}
		
		socket.emit('accepted');
		socket.contact = contact;
		contact.socket = socket;
		sockets.push(socket);
		sendContacts(socket);
		console.log(contact.name + ' logged in');
		isLoggedIn = true;
	});
	
	var events = ['call', 'accept', 'reject', 'candidate', 'close', 'data', 'volatile'];
	
	for (var i = 0; i < events.length; i++) {
		(function(type) {
			socket.on(type, function(data) {
				if (!isLoggedIn) {
					socket.emit('error', {message: 'log in first'});
					return;
				}
				
				if (data.contact && data.contact in contacts) {
					var recipient = contacts[data.contact];
					var recipientSocket = recipient.socket;
					console.log(type + ' from ' + user + ' to ' + data.contact);
					data.contact = user; // was recipient, becomes sender in the answer
					if (type == 'volatlie')
						recipientSocket.volatile.emit(type, data);
					else
						recipientSocket.emit(type, data);
				} else
					console.log('invalid message: contact parameter missing (from ' + user + ')');
			});
		})(events[i]);
	}

	socket.on('disconnect', function() {
		var index = sockets.indexOf(socket);
		if (index >= 0)
			sockets.slice(index, 1);
		if (contact != null) {
			removeContact(contact);
			console.log(contact.name + ' logged out');
		}	
	});
};

function sendContacts(socket) {
	socket.emit('contacts', Object.keys(contacts));
}

function sendContactsToAllSockets() {
	for (var i = 0; i < sockets.length; i++) {
		sendContacts(sockets[i]);
	}
}

function addContact(name) {
	if (name in contacts)
		return false;
	else {
		var contact = {name: name};
		contacts[name] = contact;
		sendContactsToAllSockets();
		return contact;
	}
}

function removeContact(contact) {
	if (contact.name in contacts) {
		delete contacts[contact.name];
		sendContactsToAllSockets();
	}
}

exports.accept = accept;