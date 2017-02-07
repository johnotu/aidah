var config = {}

config.endpoint = "https://aidahstore.documents.azure.com:443/";
config.primaryKey = "jUpwxtDT0jIubJGtOR1gZWvHzc3zYdy94nSEDqSi90N3JFRvLl8jg3czv5wRZL6dgu621aEQRdAnfuz1K4RkTw==";

config.database = {
	"id": "AidahDB"
};
config.collection = {
	"id": "UserStore"
};
config.documents = {
	"UserPhone": {
		"id": 1,
		"firstName": "userFirstName",
		"lastName": "userLastName",
		"activities": [{
			"userMessage": "message",
			"userMessageTimeStamp": "time",
			"aidahReply": "message",
			"aidahReplyTimeStamp": "time" 
		}]
	}
};

module.exports = config;