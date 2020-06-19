var mqtt = require('mqtt')
var client = mqtt.connect('mqtt://13.75.111.201:1883')
var topic = 'mqtt/test_2'

var message = JSON.stringify( [{device_id: "id1",value: ["1"]},{device_id: "id3",value: ["3.24"]}]);

client.on('connect', ()=>{
    client.publish(topic, message)
    console.log('Message sent!', message)
})

// client.on('connect', ()=>{
//     setInterval(()=>{
//         client.publish(topic, message)
//         console.log('Message sent!', message)
//     }, 5000)
// })