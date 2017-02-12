var accountSid = process.env.TwilioSID;
var authToken = process.env.TwilioAuthToken;

var client = require('twilio')(accountSid, authToken);


exports.sms = {
	getCode: function(){
		var code = '';
		for(var i=0; i<6; i++){
			code += Math.floor(Math.random()*9)+1;
		}
		return code;
	},
	sendCode: function(phone, code){
		client.messages.create({
			to: phone,
			from: '+16466634289',
			body: 'Hi, your Aidah verification code is '+ code
		}, function(err, message){
			console.log(message.sid);
		});
	}
}