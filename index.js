var express = require("express");
var app = express();
var bodyParser = require('body-parser')
var urlencodedParser = bodyParser.urlencoded({extended: false})

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", "./views");
app.listen(3000);

var Topic = 'mqtt/test_3'; //subscribe to all topics
var Broker_URL = 'mqtt://13.75.111.201:1883';
var Database_URL = 'localhost';

// MQTT
var options = {
	clientId: 'MyMQTT',
	port: 1883,
	//username: 'mqtt_user',
	//password: 'mqtt_password',	
	keepalive : 0
};


var mqtt = require('mqtt')
var client  = mqtt.connect(Broker_URL, options); //mqtt://13.75.111.201:1883
client.on('connect', mqtt_connect);
client.on('reconnect', mqtt_reconnect);
client.on('error', mqtt_error);
client.on('message', mqtt_messsageReceived);
client.on('close', mqtt_close);

function mqtt_connect() {
    console.log("Connecting MQTT");
    client.subscribe(Topic, mqtt_subscribe);
};

function mqtt_subscribe(err, granted) {
    console.log("Subscribed to " + Topic);
    if (err) {console.log(err);}
};

function mqtt_reconnect(err) {
    console.log("Reconnect MQTT");
    if (err) {console.log(err);}
	client  = mqtt.connect(Broker_URL, options);
};

function mqtt_error(err) {
    console.log("Error!");
	if (err) {console.log(err);}
};

function after_publish() {
	//do nothing
};

//receive a message from MQTT broker
function mqtt_messsageReceived(topic, message, packet) {
	var value_mes = JSON.parse( message.toString());
	// console.log(value_mes);
	// console.log(topic);
	// for (var i = 0; i < value_mes.length; i++) {
	// 	var device_id = value_mes[i]['device_id'];
	// 	console.log(device_id);
	// }
	insert_message(topic, value_mes, packet);


};

function mqtt_close() {
	console.log("Close MQTT");
};

//----------MYSQL------------
var mysql = require('mysql');
var pool = mysql.createPool({
	connectionLimit : 10,
    host:'localhost',
    user:'root',
    password:'123123123',
    database:'web_test'
})

pool.getConnection(function(err, connection){
    console.log('Database connected!')
})


function insert_message(topic, value_mes, packet) {
	pool.getConnection(function(err, connection){
		// console.log('Database connected!')
		for (var i = 0; i < value_mes.length; i++) {
			var sql = "INSERT INTO ?? (??,??,??,??) VALUES (?,?,?,?)";
			var device_id = value_mes[i]['device_id'];

			var value_1, value_2;
			value_1 = value_mes[i]['value'][0];
			value_2 = value_mes[i]['value'][1];

			// var value;
			// if (value_mes[i].value.length > 1)
			// {
			// 	value = value_mes[i]['value'][0] + "-" + value_mes[i]['value'][1];
			// }
			// else
			// {
			// 	value = value_mes[i]['value'];
			// }


			// console.log(value_mes[i]['value'][0]);
			// console.log(device_id);
			// console.log(value);
			var params = ['MQTT', 'device_id', 'temp', 'topic', 'humid', device_id, value_1, topic, value_2];
			sql = mysql.format(sql, params);
			connection.query(sql, function (error, results) {
				if (error) throw error;
				console.log("Message added: ");
			}); 
		}
	})
};	


app.get("/", function(req, res){
    res.render("main");
})

app.get("/list", function(req, res){
    pool.getConnection(function(err, connection) {
        if (err) throw err; // not connected!
      
        // Use the connection
        connection.query('SELECT * FROM web_test.MQTT ORDER BY id ASC', function (error, results, fields) {
          // When done with the connection, release it.
            connection.release();
      
          // Handle error after the release.
            if (error) {
                res.end();
                throw error;
            }
      
          // Don't use the connection here, it has been returned to the pool.
            //console.log(results[1].device_id);
            res.render("list.ejs", {danhsach: results});
        });
    });
});


app.get("/public", function(req, res){
    // show form
    res.render("public.ejs")
});

app.post("/public", urlencodedParser, function(req, res){
    var device_id = req.body.txtID.toString();
	var value_1 = req.body.txtValue_1 ;	
	var value_2 = req.body.txtValue_2	
	var topic = req.body.txtTopic;

	var str = [{device_id: device_id.toString() ,value: [value_1.toString(), value_2.toString()]}];
	// console.log(str);
	var message = JSON.stringify(str);
	console.log(message);

	if (client.connected == true){
		client.publish(topic, message);
		// console.log("sent");
	}
});

