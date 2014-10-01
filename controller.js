var players = {};
var sockets = [];

function accept(socket) {
	var isLoggedIn = false;
	var player = null;
	var user = null;
	
	socket.on('login', function(data) {
		if (isLoggedIn) {
			socket.emit('err', {message: 'already logged in'});
			socket.disconnect();
			return;
		}
		
		user = (data.user || "").trim();
		if (!user) {
			socket.emit('err', {message: 'specify user name'});
			socket.disconnect();
			return;
		}
		
		player = addPlayer(user);
		if (!player) {
			socket.emit('name_not_available');
			socket.disconnect();
			return;
		}
		
		socket.emit('accepted');
		socket.player = player;
		player.socket = socket;
		sockets.push(socket);
		sendPlayers(socket);
		console.log(player.name + ' logged in');
		isLoggedIn = true;
	});
	
	var events = ['call', 'hangup', 'reject', 'connection', 'data', 'volatile', 'chat'];
	
	for (var i = 0; i < events.length; i++) {
		(function(type) {
			socket.on(type, function(data) {
				var sendType = type;
				
				if (!isLoggedIn) {
					socket.emit('err', {message: 'log in first'});
					return;
				}

				var recipientPlayer = null;
				if (data && data.recipient) {
					var recipient = data.recipient.trim();
					recipientPlayer = (recipient in players) ? players[data.recipient] : null;
				}
				
				switch (type) {
				case 'hangup':
					console.log('hangup from ' + user);
					hangupMaybe(player);
					setPlayerState(player, 'idle');
					break;
					
				case 'chat':
					if (!data || (typeof data.message != 'string') || !data.message.trim())
						break;
					var message = data.message.trim();
					console.log('CHAT: ' + user + ': ' + message);
					socket.broadcast.emit('chat', { message: message, sender: user });
					break;
				
				case 'call':
				case 'connection':
				case 'data':
				case 'volatile':
				case 'reject':
					if (recipientPlayer) {
						if (type == 'call') {
							// if both players are calling each other, establish the call
							if (recipientPlayer.peer == player) {
								setPlayerState(player, 'busy', recipientPlayer);
								setPlayerState(recipientPlayer, 'busy', player);
								sendType = 'accept';
								data.isCaller = true;
								// confirm accept
								player.socket.emit('accept', {sender: recipientPlayer.name, isCaller: false});
							} else {
								// otherwise, hang up a call if existing and call the recipient
								hangupMaybe(player);
								setPlayerState(player, 'calling', recipientPlayer);
							}
						} else if (type == 'reject') {
							if (recipientPlayer.state == 'calling' && recipientPlayer.peer == player) {
								setPlayerState(recipientPlayer, 'idle');
							} else
								break; // do not transmit invalid reject messages
						}
						
						// volatile messages are sent 10 times a frame - per player
						if (type != 'volatile')
							console.log(type + ' from ' + user + ' to ' + recipientPlayer.name);
						data.sender = user;
						if (sendType == 'volatile')
							recipientPlayer.socket.volatile.emit('data', data);
						else
							recipientPlayer.socket.emit(sendType, data);
					} else
						socket.emit('err', {message:
							'invalid ' + type + ' message: recipient parameter missing (from ' + user + ')'});
					break;
				}
			});
		})(events[i]);
	}
	
	socket.on('ping', function(data) {
		socket.emit('pingback', data);
	});

	socket.on('disconnect', function() {
		var index = sockets.indexOf(socket);
		if (index >= 0)
			sockets.slice(index, 1);
		if (player != null) {
			removePlayer(player);
			console.log(player.name + ' logged out');
		}	
	});
};

function sendPlayers(socket) {
	var playerArr = [];
	for (var name in players) {
		var player = players[name];
		playerArr.push({
			name: player.name, 				
			state: player.state, 
			peer: (player.peer ? player.peer.name : null)
		});
	}
	socket.emit('players', playerArr);
}

function sendPlayersToAllSockets() {
	for (var i = 0; i < sockets.length; i++) {
		sendPlayers(sockets[i]);
	}
}

function addPlayer(name) {
	if (name in players)
		return false;
	else {
		var player = {name: name, state: 'idle', peer: null};
		players[name] = player;
		sendPlayersToAllSockets();
		return player;
	}
}

function removePlayer(player) {
	if (player.name in players) {
		hangupMaybe(player);
		delete players[player.name];
		sendPlayersToAllSockets();
	}
}

function setPlayerState(player, state, peer) {
	if (player.state != state || player.peer || peer) {
		player.state = state;
		player.peer = peer || null;
		sendPlayersToAllSockets();
	}
}

function hangupMaybe(player) {
	if (player.state == 'busy' && player.peer) {
		console.log('hanging up ' + player.peer.name);
		player.peer.socket.emit('hangup');
		setPlayerState(player.peer, 'idle');
	}
}

exports.accept = accept;