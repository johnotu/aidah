var request = require('request');

var headers = {
    'Content-Type': 'application/json',
    'MP-Master-Key': 'c44e1069-7eb3-458d-a3fe-80a4819d686d',
    'MP-Private-Key': 'test_private_yVsshFJEJX3ZUox_zUxWOoIlk0o',
    'MP-Token': '011db1d8de989708e223'
};

var dataString = '{ "customer_name" : "John, "customer_phone" : "0264537375", "customer_email" : "customer@domainname.com", "wallet_provider" : "Airtel", "merchant_name" : "Aidah", "amount" : "1" }';



exports.pay = {
    payment: function(){
        var options = {
            url: 'https://app.mpowerpayments.com/api/v1/direct-mobile/charge',
            method: 'POST',
            headers: headers,
            body: dataString
        };
        
        function callback(error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body);
            }
        }
        
        request(options, callback);
    }
}