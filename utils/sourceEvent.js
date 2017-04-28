const msg = new builder.Message(session).sourceEvent({
    facebook: {
        notification_type: "REGULAR",
        attachment: {
            type: "template",
            payload: {
                template_type: "generic",
                elements: [{
                    title: "Some Title",
                    image_url: "http://docs.botframework.com/images/demo_bot_image.png",
                    subtitle: "Some amazing subtitle",
                    buttons: [{
                        type: "postback",
                        title: "GO",
                        payload: "demo"
                    }]
                }]
            }
        }
    }
});