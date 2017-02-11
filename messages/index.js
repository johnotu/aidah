"use strict";
var builder = require("botbuilder");
var botbuilder_azure = require("botbuilder-azure");
var greet = require("../resource/greeting.js");
var sms = require("../resource/smsService.js");

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

// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
/*
.matches('None', (session, args) => {
    session.send('Hi! This is the None intent handler. You said: \'%s\'.', session.message.text);
})*/
.matches('Bye', (session, args) => {
    session.send(greet.greeting.farewell(session.userData.name));
})

.matches('Greet', (session, args) => {
    session.send(greet.greeting.welcome(session.userData.name));
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
.onDefault((session) => {
    session.send('Sorry, I did not understand \'%s\'. Can you say something else?', session.message.text);
});

bot.dialog('/', [
    (session, args, next) => {
        if(!session.userData.name){
            session.send('Hello');
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    (session) => {
        session.send(greet.greeting.welcome(session.userData.name));
        session.beginDialog('/intents');
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

