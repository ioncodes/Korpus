var qrCode = require('qrcode-npm')
var randomstring = require('randomstring')
var request = require('request')
var io = require('socket.io-client')
var wintools = require('wintools')
var os = require('os')
var fs = require('fs')
var token = ''
if (fs.existsSync(__dirname + '/token.json')) {
    token = JSON.parse(fs.readFileSync(__dirname + '/token.json', 'utf8')).token
}
var socket = io.connect('http://185.44.106.202:3000', {
    reconnect: true
})
socket.on('command', function(cmd) {
    if (cmd.command === 'shutdown') {
        wintools.shutdown.poweroff()
    } else if(cmd.command === 'sleep') {
        var exec = require('child_process').exec
        var cmd = 'rundll32.exe user32.dll,LockWorkStation'
        exec(cmd, function(error, stdout, stderr) {})
    }
})
socket.on('setdevice', function() {
    qrWrapper.showDevicePaired = true
    qrWrapper.showQr = false
    qrWrapper.showCode = false
    qrWrapper.instruction = ''
})

var qrWrapper = new Vue({
    el: '#pair-wrapper',
    data: {
        showIntro: true,
        showQr: false,
        showDevices: false,
        showDevicePaired: false,
        rawHtml: '',
        code: '',
        showCode: false,
        instruction: '',
        appendNextDevice: false
    },
    methods: {
        makeQrCode: function() {
            var code = randomstring.generate(5).toUpperCase()
            var qr = qrCode.qrcode(6, 'M')
            qr.addData(code)
            qr.make()
            this.rawHtml = qr.createImgTag(6)
            this.showCode = true
            this.code = code
            this.instruction = 'Scan the QR-Code with your mobile.'
            if(this.appendNextDevice) {
                appendDevice(code)
            } else {
                addDevice(code)
            }
        },
        next: function() {
            this.showIntro = false
            this.showQr = true
        },
        pairedOk: function() {
            loadDevices()
            this.showDevicePaired = false
            this.showDevices = true
            this.appendNextDevice = false
        },
        addNewDevice: function() {
            this.showDevices = false
            this.showQr = true
            this.appendNextDevice = true
        }
    }
})

if(token !== '') {
    loadDevices()
    qrWrapper.showIntro = false
    qrWrapper.showDevices = true
}

function loadDevices() {
    console.log('dsd')
    getControllers(function(json) {
        var devicesDiv = document.getElementById('devices-wrapper')
        var devices = document.createElement('div')
        devices.id = 'devices-wrapper'
        for(let i = 0; i < json.length; i++) {
            var device = document.createElement('div')
            device.className = 'device'
            var icon = document.createElement('i')
            icon.className = 'fa fa-laptop'
            icon.setAttribute('aria-hidden', 'true')
            var name = document.createElement('p')
            name.className = 'device-name'
            name.textContent = json[i].name2
            device.appendChild(icon)
            device.appendChild(name)
            devices.appendChild(device)
        }
        devicesDiv.innerHTML = devices.innerHTML;
        devices.parentNode.appendChild(devicesDiv);
        devices.parentNode.removeChild(devices);
    })
}

function addDevice(code) {
    request('http://185.44.106.202:2448/api/addDevice?key=' + code + '&name=' + os.hostname(), function(error, response, body) {
        var json = JSON.parse(body)
        if (json.status === 'ok') {
            var token = json.token
            fs.writeFile(__dirname + '/token.json', JSON.stringify({
                token: token
            }), function(err) {
                console.log("The file was saved!")
            })
        }
    })
}

function appendDevice(code) {
    request('http://185.44.106.202:2448/api/addDevice?key=' + code + '&name=' + os.hostname() + '&token=' + token, function(error, response, body) {
        console.log('appended')
    })
}

function getControllers(callback) {
    request('http://185.44.106.202:2448/api/getControllers?token=' + token, function(error, response, body) {
        var json = JSON.parse(body)
        callback(json)
    })
}
