'use strict';
const AssistantV2 = require('ibm-watson/assistant/v2'); // watson sdk
const { IamAuthenticator, BearerTokenAuthenticator } = require('ibm-watson/auth');
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { IamTokenManager } = require('ibm-watson/auth');
const express = require('express'); // app server
const bodyParser = require('body-parser'); // parser for post requests

const app = express();

const mongoose = require('mongoose');
const {
    updateDb,
    userList
} = require('./routes/user');

mongoose.connect('mongodb://localhost/chat-bot', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then(() => console.log('Now connected to MongoDB!'))
    .catch(err => console.error('Something went wrong', err));

app.use(express.static('./public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


let authenticator;
if (process.env.ASSISTANT_IAM_APIKEY) {
    authenticator = new IamAuthenticator({
        apikey: process.env.ASSISTANT_IAM_APIKEY
    });
} else if (process.env.BEARER_TOKEN) {
    authenticator = new BearerTokenAuthenticator({
        bearerToken: process.env.BEARER_TOKEN
    });
}

const textToSpeech = new TextToSpeechV1({
    authenticator: new IamAuthenticator({
        apikey: process.env.TEXT_TO_SPEECH_APIKEY,
    }),
    serviceUrl: process.env.TEXT_TO_SPEECH_URL,
});

const speechToText = new SpeechToTextV1({
    authenticator: new IamAuthenticator({
        apikey: process.env.SPEECH_TO_TEXT_APIKEY,
    }),
    serviceUrl: process.env.SPEECH_TO_TEXT_URL,
});


const assistant = new AssistantV2({
    version: '2019-02-28',
    authenticator: authenticator,
    url: process.env.ASSISTANT_URL,
    disableSslVerification: process.env.DISABLE_SSL_VERIFICATION === 'true' ? true : false
});

const params = {
    objectMode: true,
    contentType: 'audio/flac',
    model: 'en-US_BroadbandModel',
    keywords: ['colorado', 'tornado', 'tornadoes'],
    keywordsThreshold: 0.5,
    maxAlternatives: 3,
};

// Create the stream.
const recognizeStream = speechToText.recognizeUsingWebSocket({
    contentType: 'audio/l16; rate=44100 channels=2',
    interimResults: true
});

recognizeStream.on('data', function(event) { onEvent('Data:', event); });
recognizeStream.on('error', function(event) { onEvent('Error:', event); });
recognizeStream.on('close', function(event) { onEvent('Close:', event); });


function onEvent(name, event) {
    console.log(name, JSON.stringify(event, null, 2));
};

app.use('/api/speech-to-text/token', async(req, res) => {
    try {
        const tokenManager = new IamTokenManager({
            apikey: process.env.SPEECH_TO_TEXT_APIKEY,
        });
        const accessToken = await tokenManager.getToken({
            url: process.env.SPEECH_TO_TEXT_URL
        });
        return res.send(accessToken);
    } catch (err) {
        console.log('errr--', err);
        const status = err.code !== undefined && err.code > 0 ? err.code : 500;
        return res.status(status).json(err);
    }
});

app.get('/api/users', async function(req, res) {
    let result = await userList();
    return res.json(result);
})

app.post('/api/text-to-speech', async function(req, res) {

    const data = JSON.stringify(req.body)
    const synthesizeParams = {
        text: req.body.text.toString(),
        accept: 'audio/wav',
        voice: 'en-US_AllisonV3Voice',
    };

    textToSpeech.synthesize(synthesizeParams)
        .then(response => {
            return textToSpeech.repairWavHeaderStream(response.result);
        })
        .then(buffer => {
            return res.send(buffer);
        })
        .catch(err => {
            console.log('error:', err);
        });

})


app.post('/api/speech-to-text', async function(req, res) {
    let base64Image = req.body.data.split(';base64,').pop();

    fs.writeFileSync('file.wav', Buffer.from(req.body.data.replace('data:audio/wav;base64,', ''), 'base64'));

    var BASE64_MARKER = ';base64,';
    var base64Index = req.body.data.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = req.body.data.substring(base64Index);
    var raw = atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for (let i = 0; i < rawLength; i++) {
        array[i] = raw.charCodeAt(i);
    }

    var z = new Float32Array(array, 0, 4);
    var binary = z; //array;
    var blob = new Blob([binary], { type: 'audio/wav' });

    const recognizeParams = {
        audio: binary,
        contentType: 'audio/wav',
        wordAlternativesThreshold: 0.9,
        keywords: ['colorado', 'tornado', 'tornadoes'],
        keywordsThreshold: 0.5,
    };

    speechToText.recognize(recognizeParams)
        .then(speechRecognitionResults => {
            let text = '';
            for (const result of speechRecognitionResults.result.results) {
                console.log('data--', result.alternatives[0].transcript)
                text = text + result.alternatives[0].transcript;
            }
            return res.json(text);
        })
        .catch(err => {
            const status = err.code !== undefined && err.code > 0 ? err.code : 500;
            console.log('error:', err);
            return res.status(status).json(err);
        });
})

app.post('/api/message', function(req, res) {
    let assistantId = process.env.ASSISTANT_ID || '<assistant-id>';
    if (!assistantId || assistantId === '<assistant-id>') {
        return res.json({
            output: {
                text: 'The app has not been configured with a <b>ASSISTANT_ID</b> environment variable. Please refer to the ' +
                    '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' +
                    'Once a workspace has been defined the intents may be imported from ' +
                    '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.',
            },
        });
    }

    let textIn = '';

    if (req.body.input) {
        textIn = req.body.input.text;
    }

    const payload = {
        assistantId: assistantId,
        sessionId: req.body.session_id,
        input: {
            message_type: 'text',
            text: textIn,
        },
    };

    assistant.message(payload, async function(err, data) {
        if (err) {
            const status = err.code !== undefined && err.code > 0 ? err.code : 500;
            return res.status(status).json(err);
        }
        let text = '';

        for (const t of data.result.output.generic) {

            if (t.response_type == 'option') {
                text = text + t.title
            } else {
                text = text + t.text
            }
        }
        await updateDb(req.body.session_id, text, textIn);
        return res.json(data);
    });
});

app.get('/api/session', function(req, res) {
    assistant.createSession({
            assistantId: process.env.ASSISTANT_ID || '{assistant_id}',
        },
        function(error, response) {
            if (error) {
                console.log('error----', error)
                return res.send(error.body);
            } else {
                return res.send(response);
            }
        }
    );
});

module.exports = app;