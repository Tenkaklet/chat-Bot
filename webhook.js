const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const request = require('request');
const PAGE_ACCESS_TOKEN = 'EAAa0tqmG2vEBAM90MSS9wurpH2hlrhbnZBNo2pWEQYwH0ZCjMyq9G5bygSZA4koSs2J5zIVJALPkLxsUIfnK5UkCZApDkkBG9Wj9IvkYttOq53vQJ73t2l4LMaSUPRiWAdf6XNCELRv2MYwnWiFZBFrHdOZBd8Mc7RaikDd02iMwZDZD';
const apiaiApp = require('apiai')('b990890981b8449fbdf52666697b4500');

// this is a test
// hey

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({
    extended: true
}));

const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


app.use(function(req,res,next){
    var _send = res.send;
    var sent = false;
    res.send = function(data){
        if(sent) return;
        _send.bind(res)(data);
        sent = true;
    };
    next();
});

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
    
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'torsten_max') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});
/* Handling all messenges */
app.post('/webhook', (req, res) => {
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {          
        if (event.message.text === 'kabusa') {
            sendGenericMessage(event);            
            // event.message.text is what is written in Facebook by user
          
       } else if (event.message.text != 'kabusa') {
         sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

app.post('/ai', (req,res, next) => {

    console.log('ACCESSING AI MAX BOT');
    
    if(req.body.result.action === 'weather') {
        let city = req.body.result.parameters['geo-city'];
        let restUrl = 'https://api.apixu.com/v1/current.json?key=2b0e6614fcb44bb0ac4184902160707&q=' + city;
        
        request.get(restUrl, (err, response, body) => {
            if (!err && response.statusCode === 200) {
                let json = JSON.parse(body);
                let msg = 'The weather in ' + json.location.name + ' is ' + json.current.condition.text + ' and the temperature is ' + json.current.temp_c + ' celcius';
                return res.json({
                    speech: msg,
                    displayText: msg,
                    source: 'weather'
                })
            } else {
                return res.status(400).json({
                    status: {
                        code: 400,
                        errorType: " I was not able to find a city"
                    }
                });
            }
        });
    }

    if(req.body.result.action === 'news') {
        let source = req.body.result.parameters['any'];
        let newsApi = 'https://newsapi.org/v1/articles?source=' + source + '&apiKey=e52ac532f5764bebab21059964519cbc';
        request.get(newsApi, (err, response, body) => {
            if(!err && response.statusCode === 200) {
                let json = JSON.parse(body);
                var obj = json.articles;
                Object.keys(obj).forEach((key) => {                    
                    const item = obj[key];
                    const article = item.title + '\n'  + item.description + '\n' + item.url;
                    return res.json({
                        speech: article,
                        displayText: article,
                        source: 'news'
                    });
                })
            } else {
                return res.status(400).json({
                    status: {
                        code: 400,
                        errorType: "I coulnd't find what you were looking for"
                    }
                });
            }             
        });
    }
});



function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;

  let apiai = apiaiApp.textRequest(text, {
      sessionId: 'torsten_max'
  });


  apiai.on('response', (response) => {
      // aiText is what the bot sends back.
      let aiText = response.result.fulfillment.speech;
      // getting response api.ai, POST to FB
    //   console.log(response.result);
    let intent = response.result.metadata.intentName; 
    console.log('the intent is: ', intent);
            // undefined is general chat messages
            if (intent === undefined) {
          request({
              url: 'https://graph.facebook.com/v2.6/me/messages',
              qs: {
                  access_token: PAGE_ACCESS_TOKEN
              },
              method: 'POST',
              json: {
                  recipient: {
                      id: sender
                  },
                  message: {
                      text: aiText
                  }
              }
          }, function (error, response) {
              if (error) {
                  console.log('Error sending message: ', error);
              } else if (response.body.error) {
                  console.log('Error: ', response.body.error);
              }
          });
      } else if (intent === 'weather.city') {
          message(sender, aiText);
      } else if (intent === 'news.new') {     
        message(sender, aiText);
          
      } else if (intent === 'llc') {
          message(sender, aiText);
      } 
      else if (intent === 'Image') {
          sendImage(sender, 'https://placehold.it/400');
      }
  });

  apiai.on('error', (error) => {
      console.log(error);
  });

  apiai.end();
}

function message(sender, aiText) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: {
                text: aiText
            }
        }
    }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

// sends an Image
function sendImage(sender, imageUrl) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: {
                attachment: {
                    type: 'image',
                    payload: {
                        url: imageUrl
                    }
                }
            }
        }
    }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function message(sender, aiText) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: {
                text: aiText
            }
        }
    }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

function sendGenericMessage(event) {
    let sender = event.sender.id;
    let text = event.message.text;
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {
            access_token: PAGE_ACCESS_TOKEN
        },
        method: 'POST',
        json: {
            recipient: {
                id: sender
            },
            message: messageData
        }
    }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }
    });
}

const messageData = {
	    attachment: {
		    type: "template",
		    payload: {
				"template_type": "generic",
			    "elements": [{
					"title": "First card",
				    "subtitle": "Element #1 of an hscroll",
				    "image_url": "http://lorempixel.com/520/200/people",
				    "buttons": [{
					    "type": "web_url",
					    "url": "https://kiswa-mcarlquist.c9users.io/",
					    "title": "Check it!"
				    }, {
					    "type": "phone_number",
					    "title": "Call me!",
					    "payload": "+46709284213",
				    }],
			    }, {
				    "title": "Second card",
				    "subtitle": "Element #2 of an hscroll",
				    "image_url": "https://unsplash.it/200/300",
				    "buttons": [{
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for second element in a generic bubble",
				    }],
			    }]
		    }
	    }
    }



