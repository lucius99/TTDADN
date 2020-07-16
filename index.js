var express = require("express");
var app = express()
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({ extended: true })
var path = require('path');
let morgan = require('morgan');//--------------------------------------
let nodeXlsx = require('node-xlsx');//--------------------------------------
let fs = require('fs');
//app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
app.use('/public', express.static(path.join(__dirname, 'assets')));

app.use(morgan('dev')); // hien thi log cung morgan

// app.use('/static', express.static('./img'));
// app.use('/css', express.static('./css'));
// sua cho nay---------------------------------------------------------
var server = require("http").Server(app);
var io = require("socket.io")(server);
server.listen(3000);
var latestData;
var minTemp, maxTemp;
// sua cho nay---------------------------------------------------------

var topic_light = "Topic/LightD";
var Topic = 'mqttbox/temp';
var Topic_2 = 'mqttbox/light'; //subscribe to all topics
var Broker_URL = 'mqtt://13.75.111.201:1883';
var light_id = "LightD";
var Database_URL = 'localhost';

// MQTT
var options = {
	clientId: 'MyMQTT',
	port: 1883,
	//username: 'mqtt_user',
	//password: 'mqtt_password',	
	keepalive: 0
};


var mqtt = require('mqtt')
var client = mqtt.connect(Broker_URL, options); //mqtt://13.75.111.201:1883
client.on('connect', mqtt_connect);
client.on('reconnect', mqtt_reconnect);
client.on('error', mqtt_error);
client.on('message', mqtt_messsageReceived);
client.on('close', mqtt_close);

function mqtt_connect() {
	console.log("Connecting MQTT");
	client.subscribe(Topic, mqtt_subscribe);
	client.subscribe(Topic_2, mqtt_subscribe_2);
};

function mqtt_subscribe(err, granted) {
	console.log("Subscribed to " + Topic);
	if (err) { console.log(err); }
};

function mqtt_subscribe_2(err, granted) {
	console.log("Subscribed to " + Topic_2);
	if (err) { console.log(err); }
};

function mqtt_reconnect(err) {
	console.log("Reconnect MQTT");
	if (err) { console.log(err); }
	client = mqtt.connect(Broker_URL, options);
};

function mqtt_error(err) {
	console.log("Error!");
	if (err) { console.log(err); }
};

function after_publish() {
	//do nothing
};

var minTemp = 10;
var maxTemp = 20;
function mqtt_messsageReceived(topic, message, packet) {
	var value_mes = JSON.parse(message.toString());
	console.log(value_mes);
	latestData = value_mes;
	insert_message(topic, value_mes, packet);
	check_message(topic, value_mes, packet);
};

io.on('connection', function (socket) {
	socket.emit('data', latestData);
})

setInterval(function () {
	io.emit('data', latestData);
	console.log('Last updated: ' + latestData);
}, 3000);

function mqtt_close() {
	console.log("Close MQTT");
};

//----------MYSQL------------
var mysql = require('mysql');
var pool = mysql.createPool({
	connectionLimit: 10,
	host: 'localhost',
	user: 'root',
	password: '123123123',
	database: 'web_test'
})

pool.getConnection(function (err, connection) {
	console.log('Database connected!')
})

function insert_message(topic, value_mes, packet) {
	pool.getConnection(function (err, connection) {
		// console.log('Database connected!')
		//console.log(value_mes);
		var sql, value_1, value_2, params, device_id;
		device_id = value_mes[0]['device_id'];
		sql = "INSERT INTO ?? (??,??,??,??) VALUES (?,?,?,?)";
		value_1 = value_mes[0]['values'][0];
		value_2 = value_mes[0]['values'][1];
		params = ['mqtt', 'device_id', 'temp', 'topic', 'humid', device_id, value_1, topic, value_2];
		// else if (value_mes[i]['values'].length == 1) {
		// 	sql = "INSERT INTO ?? (??,??,??) VALUES (?,?,?)";
		// 	value_1 = value_mes[i]['values'][0];
		// 	params = ['mqtt_light', 'device_id', 'color', 'topic', device_id, value_1, topic];
		// }
		sql = mysql.format(sql, params);
		connection.query(sql, function (error, results) {
			if (error) throw error;
			console.log("Message added: ");
		});

	})
};

//receive a message from MQTT broker
function check_message(topic, value_mes, packet) {
	var value_1, value_2, device_id;
	device_id = light_id;
	value_2 = 1;
	var color;
	value_1 = value_mes[0]['values'][0];
	//value_2 = value_mes[i]['values'][1];
	
	if (value_1 <= minTemp) {
		console.log(minTemp);
		color = 222;
	}
	else if (value_1 > minTemp && value_1 <= maxTemp) {
		color = 166;
		console.log(maxTemp);
	}
	else{
		console.log(value_1);
		color = 77;
	}
		
	var str = [{ device_id: device_id.toString(), values: [value_2.toString(), color.toString()] }];
	var message = JSON.stringify(str);
	if (client.connected == true) {
		client.publish(topic_light, message);
	}
};
var message;
app.get("/home", function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) throw err;
		connection.query('SELECT * FROM web_test.mqtt ORDER BY id ASC', function (error, results, fields) {
			connection.release();
			if (error) {
				res.end();
				throw error;
			}
			var len = results.length - 1;
			var temp = results[len].temp;
			var humid = results[len].humid;
			var device_id = results[len].device_id;
			var str = [{ device_id: device_id.toString(), values: [temp.toString(), humid.toString()] }];
			message = JSON.stringify(str);

			if (client.connected == true) {
				client.publish(Topic, message);
			}
			res.render('home.ejs', { danhsach: results });
		})
	})
});

app.get("/list", function (req, res) {
	pool.getConnection(function (err, connection) {
		if (err) throw err; // not connected!

		// Use the connection
		connection.query('SELECT * FROM web_test.mqtt ORDER BY id ASC', function (error, results, fields) {
			// When done with the connection, release it.
			connection.release();

			// Handle error after the release.
			if (error) {
				res.end();
				throw error;
			}

			// Don't use the connection here, it has been returned to the pool.
			//console.log(results[1].device_id);
			res.render("list.ejs", { danhsach: results });
		});
	});
});

app.get("/public", function (req, res) {
	// show form
	res.render("public.ejs")
});

app.post("/public", urlencodedParser, function (req, res) {
	var device_id = req.body.txtID.toString();
	var value_1 = req.body.txtValue_1;
	var value_2 = req.body.txtValue_2
	var topic = req.body.txtTopic;

	var str = [{ device_id: device_id.toString(), values: [value_1.toString(), value_2.toString()] }];
	// console.log(str);
	var message = JSON.stringify(str);
	console.log(message);

	if (client.connected == true) {
		client.publish(topic, message);
		// console.log("sent");
	}
});

app.get("/export-download", function (req, res) {
	let dataExcel = [];
	pool.getConnection(function (err, connection) {
		if (err) throw err; // not connected!

		connection.query('SELECT * FROM web_test.mqtt ORDER BY id ASC', function (error, results, fields) {
			// When done with the connection, release it.
			connection.release();

			// Handle error after the release.
			if (error) {
				res.end();
				throw error;
			}
			let arrHeaderTitle = [];
			fields.forEach(field => {
				arrHeaderTitle.push(field.name)
			});
			dataExcel.push(arrHeaderTitle);

			results.forEach(row => {
				let rowItemValue = [];
				// rowItemValue.push(row.id);
				// rowItemValue.push(row.device_id);
				// rowItemValue.push(row.temp);
				// rowItemValue.push(row.humid);
				// rowItemValue.push(row.topic);
				// rowItemValue.push(row.date);
				Object.keys(row).forEach(key => {
					//console.log(row[key]);
					rowItemValue.push(row[key]);
				});

				dataExcel.push(rowItemValue);
				console.log(dataExcel);
			});
			let buffer = nodeXlsx.build([{ name: "Data", data: dataExcel }]);
			res.attachment('users.xlsx');
			res.send(buffer);
		});
	});
});

app.post("/home", urlencodedParser, function (req, res) {
	minTemp = req.body.txtMinTemp;
	//console.log(minTemp);
	maxTemp = req.body.txtMaxTemp;
	//console.log(maxTemp);
});

