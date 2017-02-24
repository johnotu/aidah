"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var greet = require("../utils/greeting.js");
var sms = require("../utils/smsService.js");
var places = require("../utils/placesDb.json");
var movies = require("../utils/moviesDB.json");
var dresses = require("../utils/dressesDb.json");

var useEmulator = (process.env.NODE_ENV == 'development');

var connector = useEmulator ? new builder.ChatConnector() : new botbuilder_azure.BotServiceConnector({
    appId: process.env['MicrosoftAppId'],
    appPassword: process.env['MicrosoftAppPassword'],
    stateEndpoint: process.env['BotStateEndpoint'],
    openIdMetadata: process.env['BotOpenIdMetadata']
});

var bot = new builder.UniversalBot(connector);

var luisAppId = process.env.LuisAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'api.projectoxford.ai';

const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey;


var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('None', (session, args) => {
    session.send('Hi! This is the None intent handler. You said: \'%s\'.', session.message.text);
})*/
.matches('Bye', (session) => {
    session.send(greet.greeting.farewell(session.userData.name));
})

.matches('Greet', (session) => {
    session.send(greet.greeting.welcome(session.userData.name));
//    session.send(session.message.user.id); or id which can be used to get other data.
})

.matches('ChangeName', [
    (session, args, next) => {
        session.send('So you want to change your name? Let\'s do this ...');
        next();
    },
    (session) => {
        builder.Prompts.text(session, 'What\'s your new name?');
    },
    (session, results) => {
        session.userData.name = results.response;
        session.send('OK ... I\'ll be calling you %s from now on', session.userData.name);
        session.endDialog();
    }
])
.matches('HowAreYou', (session) => {
    session.send('I\'m very well. Thanks.');
})
.matches('GetNameAidah', (session) => {
    session.send('I am Aidah');
})
.matches('SayPurposeAidah', (session) => {
    session.send('I can help you order or shop for anything but for now, I\'ll just help you find places for anything');
})
.matches('GetMovies', [
    (session, args) => {
        var movieEntity = builder.EntityRecognizer.findEntity(args.entities, 'movie');
        if(movieEntity){
            session.dialogData.movie = 'movie';
            session.beginDialog('/getMovies');
        }
    }
])
.matches('GetService', [
    function(session, args, next){
        var pizzaEntity = builder.EntityRecognizer.findEntity(args.entities, 'pizza');
        var burgerEntity = builder.EntityRecognizer.findEntity(args.entities, 'burger');
        var coffeeEntity = builder.EntityRecognizer.findEntity(args.entities, 'coffee');
        
        if(pizzaEntity){
            session.dialogData.mealType = 'pizza';
            next({ response: pizzaEntity.entity });
        } else if(burgerEntity){
            session.dialogData.mealType = 'burger';
            next({ response: burgerEntity.entity });
        } else if(coffeeEntity){
            session.dialogData.mealType = 'coffee';
            next({ response: coffeeEntity.entity });
        } else {
            session.send('Hey %s, I can only point you to a few great food/movie places for now', session.userData.name);
        }
    },
    function(session){
        var storeNames = [];
        for(var i=0; i<places[session.dialogData.mealType].length; i++){
            storeNames.push(places[session.dialogData.mealType][i][0]);
        }
        builder.Prompts.choice(session, 'Which of these places is your favourite?', storeNames, {
            maxRetries: 2,
            retryPrompt: 'Oops, I can only show you these places for now, please pick one of them'
        });
    },
    function(session, results){
        var choicePlace = results.response.entity;
        var choicePlaceId = 0;
        for(var i=0; i<places[session.dialogData.mealType].length; i++){
            if(places[session.dialogData.mealType][i][0] === choicePlace){
                choicePlaceId = i;
            } //TODO add else to pick a random store.
        }
        var card = new builder.HeroCard(session)
            .title(places[session.dialogData.mealType][choicePlaceId][0])
            .subtitle(places[session.dialogData.mealType][choicePlaceId][1])
            .text(places[session.dialogData.mealType][choicePlaceId][3])
            .images([
                builder.CardImage.create(session, places[session.dialogData.mealType][choicePlaceId][6])
            ]);
/*            .buttons([
                builder.CardAction.call(session, '+233264537375', 'Call')
            ]);*/
        var msg = new builder.Message(session).addAttachment(card);
        session.send(msg);
    }
])
.matches('GetDress', [
	function(session, args, next){
		var dressEntity = builder.EntityRecognizer.findEntity(args.entities, 'dress');
		var colorEntity = builder.EntityRecognizer.findEntity(args.entities, 'color');
		if(dressEntity){
			if(colorEntity){
				session.userData.favColor = colorEntity;
				session.beginDialog('/getDress');
			} else{
				builder.Prompts.text(session, 'What color of dress would you like?');
			}
		}
	},
	function(session, results){
		if(results.response){
			session.userData.favColor = results.response.entity;
			session.beginDialog('/getDress');
		}
	}
])
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'. Can you say something else?', session.message.text);
});

bot.dialog('/', [
    (session, next) => {
        session.userData.name = session.message.user.name.split(' ')[0];
        session.send('Hello %s! My name is Aidah. I can help you find places for anything', session.userData.name);
        session.beginDialog('/intents');
    }   
]);
/* Location dialog @TODO check why it has errors
bot.dialog('/getlocation', [
    function(session){
        var options = {
            prompt: 'I need to know your location so I can serve you better',
            useNativeControl: true,
            reverseGeocode: true,
            requiredFields:
                locationDialog.LocationRequiredFields.streetAddress |
                locationDialog.LocationRequiredFields.region |
                locationDialog.LocationRequiredFields.country
        };
        locationDialog.getLocation(session, options);
    },
    function(session, results){
        if(results.response){
            session.userData.location = results.response;
        }
    }
]);
*/
bot.dialog('/getMovies', [
   function(session){
       session.send('These are the movies currently showing at Silverbird Cinema, Accra Mall ...');
       session.sendTyping();
       var cards = [];
       var selectionArr = [];
       for(var i=0; i<movies.movie.length; i++){
           cards.push(
                new builder.ThumbnailCard(session)
                    .title(movies.movie[i][0])
                    .subtitle(movies.movie[i][1])
                    
                    .text(movies.movie[i][2])
                    
                    .images([
                        builder.CardImage.create(session, movies.movie[i][5])
                            .tap(builder.CardAction.showImage(session, movies.movie[i][5])),
                    ])
                    .buttons([
                        builder.CardAction.imBack(session, movies.movie[i][0], "Select")
                    ])
            );
            selectionArr.push(movies.movie[i][0]);
        }

        var movieCarousel = new builder.Message(session)
            .attachmentLayout(builder.AttachmentLayout.carousel)
            .attachments(cards);
        
        builder.Prompts.choice(session, movieCarousel, selectionArr);
   },
   function(session, results){
       session.dialogData.movie = results.response.entity;
       var choiceMovieId = 0;
       for(var i=0; i<movies.movie.length; i++){
           if(movies.movie[i][0] === session.dialogData.movie){
               choiceMovieId = i;
           }
       }
       builder.Prompts.choice(session, 'Please select a screen time for your movie ...', movies.movie[choiceMovieId][7]);
   },
   function(session, results){
       session.dialogData.movieTime = results.response.entity;
       var msg = 'Please confirm you want to see ' + session.dialogData.movie + 'on ' + session.dialogData.movieTime;
       builder.Prompts.choice(session, msg, "Yes|No");
   },
   function(session, results){
       if(results.response){
           var answer = results.response.entity;
           if(answer === "Yes"){
               session.endDialog("Thank you, your ticket is on the way");
           } else {
               session.endDialog("Oh snap! Maybe I can help you with something else");
           }
       }
   }
]);

bot.dialog('/getDress', [
	function(session){
		session.sendTyping();
		session.send("Oh nice! I'm sure you'll look good in a %s dress", session.userData.favColor);
		session.send("I have some suggesstions but...");
		builder.Prompts.choice(session, 'How much would you like to spend on it?', ["GHC50 - GHC100", "GHC101 - GHC200", "GHC201 - GHC500"]);
	},
	function(session, results){
		session.sendTyping();
		session.send("Kindly select from these fine options ...");
		session.sendTyping();
		var choicePriceRange = results.response.entity;
		var color = session.userData.favColor;
		var selectDresses = [];
		var selectionArr = [];
		if(color in dresses){
			for(var i=0; i<dresses.color.length; i++){
				if(dresses.color[i][3] === choicePriceRange){
					selectDresses.push(
						new builder.HeroCard(session)
							.title(dresses.color[i][0])
							.subtitle(dresses.color[i][2] + " | " + dresses.color[i][1])
							.images([
								builder.CardImage.create(session, dresses.color[i][4])
									.tap(builder.CardAction.showImage(session, dresses.color[i][4])),
							])
							.buttons([
								builder.CardAction.imBack(session, dresses.color[i][0], "Select")
							])
					);
					selectionArr.push(dresses.color.[i][0]);
				}
				var dressCarousel = new builder.Message(session)
					.attachmentLayout(builder.AttachmentLayout.carousel)
					.attachments(selectDresses);

				builder.Prompts.choice(session, dressCarousel, selectionArr);
			}
		} else {
			session.endDialog("So sorry %s, John hasn't taught me %s colored dresses yet", session.userData.name, session.userData.favColor);
		}
	},
	function(session, results){
		var dressName = results.response.entity;
		var color = session.userData.favColor;
		var dressId = 0;
		for(var i=0; i<dresses.color.length; i++){
			if(dresses.color[i][0] === dressName){
				dressId = i;
			}
		}
		session.userData.orderName = dressName;
		session.userData.orderPrice = dresses.color[dressId][2];
		session.beginDialog('/processOrder');
	}
]);

bot.dialog('/processOrder', [
	function(session){
		session.sendTyping();
		if(session.userData.location){
			var msg = "Would you want the order delivered to " + session.userData.location + "?";
			builder.Prompts.choice(session, msg, "Yes|No");
		} else{
			session.send("Looks like I don't have your address on record. Can you say where the order should be delivered?");
			session.beginDialog('/getLocation');
			var msg = "Would you want the order delivered to " + session.userData.location + "?";
			builder.Prompts.choice(session, msg, "Yes|No");
		}
	},
	function(session, results, next){
		if(results.response){
			var answer = results.response.entity;
			if(answer === "Yes"){
				session.userData.orderDeliveryLocation = session.userData.location;
				next();
			} else{
				session.beginDialog('/getLocation');
				session.userData.orderDeliveryLocation = session.userData.location;
				next();
			}
		}
	},
	// Confirm payment for order name, price and delivery address
	function(session){
		var msg = "Please confirm that I should pay for " + session.userData.orderName + " for " + session.userData.orderPrice + " to be delivered to " + session.userData.orderDeliveryLocation;
		builder.Prompts.choice(session, msg, "Yes|No");
	},
	function(session, results){
		if(results.response){
			var answer = results.response.entity;
			if(answer === "Yes"){
				session.send("Great. Your %s order has been paid for and will be sent shortly");
			} else{
				session.endDialog("Oh OK. Maybe I can help you get some other thing");
			}
		}
	}
]);

bot.dialog('/getLocation', [
	function(session){
		session.sendTyping();
		builder.Prompts.text(session, "Please enter your current address");
	},
	function(session, results){
		if(response.results){
			session.userData.location = results.response.entity;
			session.endDialog("Thank you");
		}
	}
]);

bot.dialog('/profile', [
    (session, args, next) => {
        session.send('My name is Aida. I can help you find places for anything');
        session.send('Let\'s get to know each other...');
        next();
    },
    (session) => {
        builder.Prompts.text(session, 'What\'s your name?');
    },
    (session, results, next) => {
        session.userData.name = results.response;
        next();
    },
    (session) => {
        builder.Prompts.text(session, 'How about your phone number? Please Begin with \'+233...\'')
    },
    (session, results, next) => {
        session.userData.inputphone = results.response;
        session.userData.code = sms.sms.getCode();
        sms.sms.sendCode(session.userData.inputphone, session.userData.code);
        next();  
    },
    (session) => {
        builder.Prompts.text(session, 'Kindly enter the 6-digit code I just sent to your phone via SMS');
    },
    (session, results) => {
        if(session.userData.code == results.response){
            session.userData.phone = session.userData.inputphone;
            session.endDialog();
        } else {
            session.send('You have entered an incorrect code. Please check your inbox for another sms and be careful to enter the exact code that was sent');
            session.beginDialog('/smserror');
        }
    }
]);

bot.dialog('/smserror', [
    (session) => {
        builder.Prompts.text(session, 'Enter your phone number? \'+233...\'')
    },
    (session, results, next) => {
        var phone = '+233' + results.response;
        session.userData.code = sms.sms.getCode();
        sms.sms.sendCode(phone, code);
        next();  
    },
    (session) => {
        builder.Prompts.text(session, 'Kindly enter the 6-digit code I just sent to your phone via SMS');
    },
    (session, results) => {
        if(session.userData.code == results.response){
            session.endDialog();
        } else {
            session.send('You have entered an incorrect code. Please check your inbox for another sms and be careful to enter the exact code that was sent');
            session.beginDialog('/smserror');
        }
    }
]);

bot.dialog('/chooseplace', [
    function(session){
        var nameArray = [], len = places[session.userData.ent].length;
        for(var i=0; i<len; i++){
            nameArray.push(places[session.userData.ent][i][0]);
        }
        builder.prompts.choice(session, 'Choose one of these places', newArray);
    },
    function(session, results){
        if(results.response){
            var len = places[session.userData.ent].length, id;
            for(var i=0; i<len; i++){
                if(places[session.userData.ent][i][0] === results.response){
                    id = i;
                }
            }
            session.send(places[session.userData.ent][id][0]);
            session.send(places[session.userData.ent][id][0]);
        }
    }
])

bot.dialog('/intents', intents);

if (useEmulator) {
    var restify = require('restify');
    var server = restify.createServer();
    server.listen(3978, function() {
        console.log('test bot endpont at http://localhost:3978/api/messages');
    });
    server.post('/api/messages', connector.listen());    
} else {
    module.exports = { default: connector.listen() }
}

