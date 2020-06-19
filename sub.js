var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://13.75.111.201:1883')
var topic = 'mqtt/test'

client.on('message', (topic, message)=>{
    message = message.toString()
    console.log(message)
})

client.on('connect', ()=>{
    client.subscribe(topic)
})