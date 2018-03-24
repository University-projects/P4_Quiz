
var net = require('net');
var port = (process.argv[2] || 3030);

var server = net.createServer(function(socket) {
    socket.write("Bienvenido al servidor para la práctica 4.\n");

});

server.listen(port);

console.log("Servidor TCP creado en el puerto: " + port);