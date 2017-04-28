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
			body: 'Your order (# ' + code + ') has been processed and will reach you in a few hours. Thank you for using Aidah.'
		}, function(err, message){
			console.log(message.sid);
		});
	}
}