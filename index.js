const args = process.argv.slice(2)
let url = 'http://live.local'

if ( args.length !== 1 ) {
	console.error('Missing argument!')
	return
}
else url = args[0]

let app = require('express')
let server = require('http').Server(app)
let io = require('socket.io')(server, {
	allowEIO3: true,
	cors: {
		origin: url,
		methods: ['GET', 'POST'],
		credentials: true
	}
})
let axios = require('axios')

// Log
let fs = require('fs')
let util = require('util')
let log_file = fs.createWriteStream(__dirname + '/debug.log', {flags: 'a'})
let log_stdout = process.stdout

console.log = d => {
	log_file.write(util.format(d) + '\n')
	log_stdout.write(util.format(d) + '\n')
}

server.listen(6003)
io.sockets.setMaxListeners(0)

// Counter of attendees
let connectedUsers = new Map()

// Connect main
io.on('connection', socket => {
	// console.log('[' + getCurrentDate() + '] Socket already connected: ' + socket.id)
	socket.on('room', ({user, pageId, pageSlug}) => {
		let room = pageSlug
		try {
			console.log('[' + getCurrentDate() + '] Join room: ' + room + ', socket: ' + socket.id + ', user: ' + user)
			postQuery(user, 1, socket.id, room)
			socket.join(room)
			if ( !connectedUsers.has(room) ) connectedUsers.set(room, [])
			connectedUsers.get(room).push(user)
			console.log('[' + getCurrentDate() + '] Users: ' + connectedUsers.get(room).length)

			socket.on('disconnect', () => {
				console.log('[' + getCurrentDate() + '] Leave room: ' + room + ', socket: ' + socket.id + ', user: ' + user)
				postQuery(user, 0, socket.id, room)
				let users = connectedUsers.get(room)
				users = users.filter(u => u !== user)
				connectedUsers.set(room, users)
				console.log('[' + getCurrentDate() + '] Users: ' + connectedUsers.get(room).length)
			})
		} catch(e) {
			console.error('[' + getCurrentDate() + '] Error', e)
		}
	})
})

function getCurrentDate() {
	let date = new Date()
	date = date.setHours(date.getHours() + 2)
	return new Date(date).toISOString().replace(/T/, ' ').replace(/\..+/, '')
}

function postQuery(user, online, socket, pageSlug) {
	try {
		let endpoint = url + '/api/pages/{page}/presences/status'.replace('{page}', pageSlug)

		axios.post(endpoint, {
			user: user,
			online: online,
			socket: socket
		}).then(response => {
			console.log('[' + getCurrentDate() + '][QUERY] Log created: ' + response.data)
		}).catch(error => {
			console.error('[' + getCurrentDate() + '][QUERY] Error query', error)
		})
	} catch(e) {
		console.error('[' + getCurrentDate() + '][QUERY] Error', e)
	}
}