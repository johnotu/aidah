"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var greet = require("../utils/greeting.js");
var sms = require("../utils/smsService.js");
var places = require("../utils/placesDb.json");
var movies = require("../utils/moviesDB.json");
var dresses = require("../utils/dressesDb.json");
var shoes = require("../utils/shoesDb.json");
var request = require("request");

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
const mKey = process.env.MazzumaKey;

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
            session.beginDialog('/getPizza');
            //next({ response: pizzaEntity.entity });
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
        builder.Prompts.choice(session, 'Oh you must be hungry. Which of these places is your favourite?', storeNames, {
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
				session.userData.favColor = colorEntity.entity;
				session.beginDialog('/getDress');
			} else{
				builder.Prompts.text(session, 'Sorry I didn\'t quite get the color. What color of dress would you like?');
			}
		}
	},
	function(session, results){
		if(results.response){
			session.userData.favColor = results.response;
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
        //session.userData.name = "Nancy";
        session.userData.location = "20 Aluguntugui Street, East Legon, Accra";
        session.userData.shoeSize = 42;
        session.userData.phoneNumber = "+233264737357";
        session.userData.pizzaType = "Margherita";
        session.userData.pizzaSize = "10";
        session.userData.pizzaPlace = "Papa's Pizza, East Legon";
        //session.send('Hello %s! My name is Aidah. I can help you order and shop for things in Accra', session.userData.name);
        session.beginDialog('/intents');
    }   
]);

const movieTicketCost = 1;

bot.dialog('/getMovies', [
   function(session){
       session.send('These are the movies currently showing at Silverbird Cinema, Accra Mall ...');
       session.sendTyping();
       var cards = [];
       var selectionArr = [];
       for(var i=0; i<movies.movie.length; i++){
           cards.push(
                new builder.HeroCard(session)
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
       //var choiceMovieId = 0; Should it be declared initially???
       for(var i=0; i<movies.movie.length; i++){
           if(movies.movie[i][0] === session.dialogData.movie){
               session.dialogData.choiceMovieId = i;
           }
       }
       session.sendTyping();
       session.send(movies.movie[session.dialogData.choiceMovieId][3]);
       session.sendTyping();
       var msg = 'When do you want to see ' + session.dialogData.movie;
       builder.Prompts.choice(session, msg, movies.movie[session.dialogData.choiceMovieId][7]);
   },
   function(session, results){
       session.dialogData.movieDay = results.response.entity;
       session.sendTyping();
       var msg = 'Please select a screen time for ' + session.dialogData.movie + ' on ' + session.dialogData.movieDay;
       builder.Prompts.choice(session, msg, movies.movie[session.dialogData.choiceMovieId][8]);
   },
   function(session, results){
       session.dialogData.movieTime = results.response.entity;
       builder.Prompts.choice(session, 'How many tickets do you want to purchase?', ['1', '2', '3', '4', '5', '6', 'More']);
   },
   function(session, results){
       session.dialogData.orderQty = results.response.entity;
       session.dialogData.orderTotal = movieTicketCost * parseInt(session.dialogData.orderQty);
       var msg = 'Please confirm you want to see ' + session.dialogData.movie + ' on ' + session.dialogData.movieDay + ' by ' + session.dialogData.movieTime;
       builder.Prompts.choice(session, msg, "Yes|No|Cancel");
   },
   function(session, results){
       
       if(results.response){
           var answer = results.response.entity;
           if(answer === "Yes"){
               session.userData.orderNumber = sms.sms.getCode();

               request({
                    uri: 'https://client.teamcyst.com/app.php',
                    method: 'POST',
                    json: {
                      price: session.dialogData.orderTotal,
                      orderID: session.userData.orderNumber,
                      success_url: 'http://m.me/aidahbot',
                      apikey: mKey
                    }
                
                  }, function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        var payUrl = body;
                        var mesg = new builder.Message(session).sourceEvent({
                            facebook: {
                                notification_type: "REGULAR",
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "generic",
                                        elements: [{
                                            title: session.dialogData.movie + ' - ' + session.dialogData.orderQty + ' - GH₵' + session.dialogData.orderTotal,
                                            image_url: movies.movie[session.dialogData.choiceMovieId][5],
                                            subtitle: session.dialogData.movieDay + ' ' + session.dialogData.movieTime,
                                            buttons: [{
                                                type: "web_url",
                                                title: "Pay",
                                                url: payUrl,
                                                webview_height_ratio: "tall"
                                            }]
                                        }]
                                    }
                                }
                            }
                        });
                        session.send(mesg);
                      //console.log('body:', body);
                      //console.log('type of body: ', typeof body);
                    } else {
                      console.error("payment failed", response.statusCode, response.statusMessage, body.error);
                    }
                  });
               
               
               
               // const msg = new builder.Message(session).sourceEvent({
                //     facebook: {
                //         notification_type: "REGULAR",
                //         attachment: {
                //             type: "template",
                //             payload: {
                //                 template_type: "generic",
                //                 elements: [{
                //                     title: 'Ticket: ' + session.dialogData.movie,
                //                     image_url: "https://s20.postimg.org/ghgh3n5dp/code.png",
                //                     subtitle: session.dialogData.movieDay + ' ' + session.dialogData.movieTime,
                //                     buttons: [{
                //                         type: "web_url",
                //                         title: "Silverbird Accra Mall",
                //                         url: "http://silverbirdcinemas.com/accra/"
                //                     }]
                //                 }]
                //             }
                //         }
                //     }
                // });
                
               // session.send('Kindly present your ticket fr entry into the studios. Thank you for using Aidah');
               //var payLink = payment(session.dialogData.orderTotal, session.userData.orderNumber);
               //session.send('Please tap the link below to complete payment');
               //session.send(payLink);
               //sms.sms.sendCode(session.userData.phoneNumber, session.userData.orderNumber);
               //session.send('Congratulations %s. Your ticket (#%s) has been reserved and confirmation sent in an SMS to your phone.', session.userData.name, session.userData.orderNumber);
               session.beginDialog('/intents');
               //session.endDialog("Thank you, your ticket is on the way");
           } else {
               session.endDialog("Oh snap! Maybe I can help you with something else");
               session.beginDialog('/intents');
           }
       }
   }
]);

function payment(amount, orderId){
  request({
    uri: 'https://client.teamcyst.com/app.php',
    method: 'POST',
    json: {
      price: amount,
      orderID: orderId,
      success_url: 'https://www.messenger.com/t/1250352005079651',
      apikey: mKey
    }

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log('payment call initiated ',body);
      return body;
    } else {
      console.error("paymnt failed", response.statusCode, response.statusMessage, body.error);
    }
  });
};

bot.dialog('/getDress', [
	function(session){
		session.sendTyping();
		session.send("Oh great! I have seen some nice %s dresses but...", session.userData.favColor);
        session.sendTyping();
		builder.Prompts.choice(session, 'How much would you like to spend on it?', ["GHC50 - GHC100", "GHC101 - GHC200", "GHC201 - GHC500"]);
	},
	function(session, results){
		session.sendTyping();
		session.send('Kindly select from these fine options ...');
		session.sendTyping();
		var choicePriceRange = results.response.entity;
		var color = session.userData.favColor;
		var selectDresses = [];
		var selectionArr = [];
		if(color in dresses){
			for(var i=0; i<dresses[color].length; i++){
				if(dresses[color][i][3] === choicePriceRange){
                    var sub = dresses[color][i][2] + " | " + dresses[color][i][1];
					selectDresses.push(
						new builder.HeroCard(session)
							.title(dresses[color][i][0])
							.subtitle(sub)
							.images([
								builder.CardImage.create(session, dresses[color][i][4])
									.tap(builder.CardAction.showImage(session, dresses[color][i][4])),
							])
							.buttons([
								builder.CardAction.imBack(session, dresses[color][i][0], 'Select')
							])
					);
					selectionArr.push(dresses[color][i][0]);
				}
			}
            var dressCarousel = new builder.Message(session)
					.attachmentLayout(builder.AttachmentLayout.carousel)
					.attachments(selectDresses);

			builder.Prompts.choice(session, dressCarousel, selectionArr);
		} else {
			session.endDialog('So sorry %s, I don\'t yet have %s dresses in my store. They\'s coming soon though', session.userData.name, session.userData.favColor);
		}
	},
	function(session, results, next){
		var dressName = results.response.entity;
		var color = session.userData.favColor;
		var dressId = 0;
		for(var i=0; i<dresses[color].length; i++){
			if(dresses[color][i][0] === dressName){
				dressId = i;
			}
		}
		session.userData.orderName = dressName;
		session.userData.orderPrice = dresses[color][dressId][2];
        session.userData.orderStore = dresses[color][dressId][1];
        session.userData.orderCategory = 'dress';
        next();
		
	},
    function(session){
        if(session.userData.location){
            var msg = 'I suppose you want the order delivered to ' + session.userData.location + '?';
            builder.Prompts.choice(session, msg, "Yes|No|Cancel");
        }
    },
    function(session, results){
        var answer = results.response.entity;
        if(answer === "Yes"){
            session.userData.orderDeliveryAddress = session.userData.location;
            session.beginDialog('/confirmOrder');
        } else if(answer === "No"){
            session.beginDialog('/getAddress');
        } else{
            session.beginDialog('/intents');
        }
    },
    function(session, results){
        session.userData.orderDeliveryAddress = results.response;
        session.beginDialog('/confirmOrder');
    }
]);


bot.dialog('/confirmOrder', [
	function(session){
		var msg = 'Please confirm that I should pay ' + session.userData.orderPrice + ' for ' + session.userData.orderName + ' from ' + session.userData.orderStore + " to be delivered to " + session.userData.orderDeliveryAddress;
		builder.Prompts.choice(session, msg, "Yes|No|Cancel");
	},
	function(session, results){
		var answer = results.response.entity;
		if(answer === "Yes"){
            session.userData.orderNumber = sms.sms.getCode();
            //enable to go live
            sms.sms.sendCode(session.userData.phoneNumber, session.userData.orderNumber);
			session.send('Congratulations %s. Your %s order (#%s) has been processed and confirmation sent in an SMS to your phone. You can expect to receive your order within 48hrs.', session.userData.name, session.userData.orderName, session.userData.orderNumber);
            if(session.userData.orderCategory === 'dress'){
                session.beginDialog('/recommend');
            }else{
                session.beginDialog('/intents');
            }
            
            //session.beginDialog('/intents');
		} else{
			session.send("Oh OK. Maybe I can help you get some other thing");
            session.beginDialog('/intents');
		}
	}
]);

bot.dialog('/getAddress', [
	function(session){
		session.sendTyping();
		builder.Prompts.text(session, "Please enter your current address");
	},
	function(session, results){
        session.endDialogWithResult(results);
	}
]);

bot.dialog('/recommend', [
    function(session){
        session.sendTyping();
        if(session.userData.orderCategory === 'dress'){
            var msg = 'Would you like a shoe to go with your ' + session.userData.favColor + ' dress?';
            builder.Prompts.choice(session, msg, "Yes|No");
        } else {
            session.beginDialog('/intents');
        }
    },
    function(session, results){
        var answer = results.response.entity;
        if(answer === "Yes"){
            session.beginDialog('/getShoes');
        } else if(answer == "No"){
            session.send("Ok %s, maybe I can help you with something else", session.userData.name);
            session.beginDialog('/intents');
        }
    }
]);

bot.dialog('/getShoes', [
    function(session){
        switch(session.userData.favColor){
            case 'blue':
                session.dialogData.shoeColor = 'black';
                break;
            case 'black':
                session.dialogData.shoeColor = 'white';
                break;
            case 'red':
                session.dialogData.shoeColor = 'blue';
                break;
            case 'white':
                session.dialogData.shoeColor = 'blue';
                break;
            default:
                session.dialogData.shoeColor = 'black';
        }
        builder.Prompts.choice(session, 'Like how much would you want to spend on a shoe?', ["GHC50 - GHC100", "GHC101 - GHC200", "GHC201 - GHC500"]);
    },
    function(session, results){
        var choicePriceRange = results.response.entity;
        session.sendTyping();
		session.send('Select the one you like best ...');
		session.sendTyping();
		var color = session.dialogData.shoeColor;
		var selectShoes = [];
		var selectionArr = [];
		if(color in shoes){
			for(var i=0; i<shoes[color].length; i++){
				if(shoes[color][i][3] === choicePriceRange){
                    var sub = shoes[color][i][2] + " | " + shoes[color][i][1];
					selectShoes.push(
						new builder.HeroCard(session)
							.title(shoes[color][i][0])
							.subtitle(sub)
							.images([
								builder.CardImage.create(session, shoes[color][i][4])
									.tap(builder.CardAction.showImage(session, shoes[color][i][4])),
							])
							.buttons([
								builder.CardAction.imBack(session, shoes[color][i][0], 'Select')
							])
					);
					selectionArr.push(shoes[color][i][0]);
				}
			}
            var shoesCarousel = new builder.Message(session)
					.attachmentLayout(builder.AttachmentLayout.carousel)
					.attachments(selectShoes);

			builder.Prompts.choice(session, shoesCarousel, selectionArr);
		} else {
			session.endDialog('So sorry %s, I don\'t yet have %s shoes in my store. They\'s coming soon though', session.userData.name, session.dialogData.shoeColor);
		}
	},
	function(session, results, next){
		var shoeName = results.response.entity;
		var color = session.dialogData.shoeColor;
		var shoeId = 0;
		for(var i=0; i<shoes[color].length; i++){
			if(shoes[color][i][0] === shoeName){
				shoeId = i;
			}
		}
		session.userData.orderName = shoeName;
		session.userData.orderPrice = shoes[color][shoeId][2];
        session.userData.orderStore = shoes[color][shoeId][1];
        session.userData.orderCategory = 'shoe';
        next();
		
	},
    function(session){
        if(session.userData.location){
            var msg = 'I suppose you want the order delivered to ' + session.userData.location + '?';
            builder.Prompts.choice(session, msg, "Yes|No|Cancel");
        }
    },
    function(session, results){
        var answer = results.response.entity;
        if(answer === "Yes"){
            session.userData.orderDeliveryAddress = session.userData.location;
            session.beginDialog('/confirmOrder');
        } else if(answer === "No"){
            session.beginDialog('/getAddress');
        } else{
            session.beginDialog('/intents');
        }
    },
    function(session, results){
        session.userData.orderDeliveryAddress = results.response;
        session.beginDialog('/confirmOrder');
    }
]);


bot.dialog('/getPizza', [
    function(session){
        session.sendTyping();
        session.send('Pizzaaaa yay ^_^ !');
        session.sendTyping();
        var msg = 'Should I pick your regular type ' + session.userData.pizzaType + ' and size ' + session.userData.pizzaSize + ' inches from your favourite place ' + session.userData.pizzaPlace + '?';
        builder.Prompts.choice(session, msg, "Yes|No|Cancel");
    },
    function(session, results){
        var answer = results.response.entity;
        if(answer === "Yes"){
            //session.userData.pizzaChoiceId = places.pizza[7].indexOf(session.userData.pizzaType);
            session.userData.orderStore = session.userData.pizzaPlace;
            session.userData.orderPrice = "GHC25";
            session.beginDialog('/pizzaDelivery');
        } else if(answer === "No"){
            session.beginDialog('/choosePizzaPlace');
        } else{
            session.send('Sorry, hope I can help you with something else');
            session.beginDialog('/intents');
        }
    },
    function(session, results){
        session.userData.pizzaPlace = results.response.entity;
        session.beginDialog('/choosePizzaType');
    },
    function(session, results){
        session.userData.pizzaType = results.response.entity;
        session.beginDialog('/choosePizzaSize');
    },
    function(session, results){
        session.userData.pizzaSize = results.response.entity;
        session.beginDialog('/pizzaDelivery');
    }
]);

bot.dialog('/pizzaDelivery', [
    function(session){
        session.userData.orderName = session.userData.pizzaType + ' ' + session.userData.pizzaSize + ' inches';
        if(session.userData.location){
            var msg = 'I\'m going to deliver your pizza to ' + session.userData.location + '. Is that OK?';
            builder.Prompts.choice(session, msg, "Yes|No");
        }
    },
    function(session, results){
        var answer = results.response.entity;
        if(answer === "Yes"){
            session.userData.orderDeliveryAddress = session.userData.location;
            session.beginDialog('/confirmOrder');
        } else{
            session.beginDialog('/getAddress');
        }
    },
    function(session, results){
        session.userData.orderDeliveryAddress = results.response;
        session.userData.orderCategory = 'pizza';
        session.beginDialog('/confirmOrder');
    }
]);

bot.dialog('/choosePizzaPlace', [
    function(session){
        session.sendTyping();
        var pizzaPlaces = [];
        for(var i=0; i<places.pizza.length; i++){
            pizzaPlaces.push(places.pizza[i][0]);
        }
        builder.Prompts.choice(session, 'Choose a pizza place to order from ...', pizzaPlaces);
    },
    function(session, results){
        var answer = results.response.entity;
        session.userData.pizzaPlace = answer;
        for(var i=0; i<places.pizza.length; i++){
            if(answer === places.pizza[i][0]){
                session.userData.pizzaChoiceId = i;
            }
        }
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/choosePizzaType', [
    function(session){
        session.sendTyping();
        builder.Prompts.choice(session, 'Which pizza type would you like?', places.pizza[session.userData.pizzaChoiceId][7]);
    },
    function(session, results){
        session.endDialogWithResult(results);
    }
]);

bot.dialog('/choosePizzaSize', [
    function(session){
        session.sendTyping();
        builder.Prompts.choice(session, 'What size are we having this time?', places.pizza[session.userData.pizzaChoiceId][8]);
    },
    function(session, results){
        session.endDialogWithResult(results);
    }
]);

/*
bot.dialog('/orderFromPapas', [
    function(session){
        sendTyping();
        builder.Prompts.Choice(session, 'What would like to order from Papas?', [Pizza, Food]);
    }
])
*/

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
        //sms.sms.sendCode(session.userData.inputphone, session.userData.code);
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
]);

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

