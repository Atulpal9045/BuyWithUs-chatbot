context = new AudioContext();

let device = navigator.mediaDevices.getUserMedia({
    audio: true
})

device.then(stream => {
        let recorder = new MediaRecorder(stream)
        let start = document.getElementById('start');
        let stop = document.getElementById('stop');
        let chunks = [];
        start.addEventListener('click', (ev) => {
            stop.style.display = "block";
            start.style.display = "none";
            recorder.start();

        })

        stop.addEventListener('click', (ev) => {
            start.style.display = "block";
            stop.style.display = "none";
            recorder.stop();
            console.log('stopping---', recorder.state)
        })

        recorder.ondataavailable = (e) => {
            chunks.push(e.data);
        }

        recorder.onstop = () => {
            var payload = {
                data: null
            };
            if (recorder.state == 'inactive') {
                let blob = new Blob(chunks, { 'type': 'audio/l16;rate=16000' });
                chunks = [];
                var audio = document.getElementById('audio');
                var mainaudio = document.createElement('audio');
                mainaudio.setAttribute('controls', 'controls');
                audio.appendChild(mainaudio);
                mainaudio.innerHTML = '<source src="' + URL.createObjectURL(blob) + '"type="video/webm"/>';

                const reader = new FileReader();

                reader.addEventListener('load', () => {
                    const dataUrl = reader.result;
                    const base64EncodedData = dataUrl
                    payload.data = base64EncodedData;
                    const url = '/api/speech-to-text';
                    const request = new XMLHttpRequest();
                    request.open('POST', url, true);
                    request.responseType = 'text';

                    request.setRequestHeader('Content-type', 'application/json');
                    var params = JSON.stringify(payload);
                    request.send(params);
                });
                reader.readAsDataURL(blob);
            }

        }
    })
    .catch(function(e) {
        console.log('error----', e.message)
    })

var ConversationPanel = (function() {
    var settings = {
        selectors: {
            chatBox: '#scrollingChat',
            fromUser: '.from-user',
            fromWatson: '.from-watson',
            latest: '.latest'
        },
        authorTypes: {
            user: 'user',
            watson: 'watson'
        }
    };

    // Publicly accessible methods defined
    return {
        init: init,
        inputKeyDown: inputKeyDown,
        sendMessage: sendMessage,
        toggleSpeaker: toggleSpeaker
    };

    // Initialize the module
    function init() {
        chatUpdateSetup();
        Api.getSessionId(function() {
            Api.sendRequest('', null);
        });
        setupInputBox();
    }
    // Set up callbacks on payload setters in Api module
    // This causes the displayMessage function to be called when messages are sent / received
    function chatUpdateSetup() {
        var currentRequestPayloadSetter = Api.setRequestPayload;
        Api.setRequestPayload = function(newPayloadStr) {
            currentRequestPayloadSetter.call(Api, newPayloadStr);
            displayMessage(JSON.parse(newPayloadStr), settings.authorTypes.user);
        };

        var currentResponsePayloadSetter = Api.setResponsePayload;
        Api.setResponsePayload = async function(newPayloadStr) {
            var chatColumn = document.querySelector('#speaker_icon')
            if (chatColumn.classList.contains('fa-volume-up')) {
                // let text = '';
                let textplay = false;
                for (let t of JSON.parse(newPayloadStr).result.output.generic) {
                    let newtext = '';
                    if (t.response_type == 'option') {
                        if (textplay) {
                            break;
                        }
                        newtext = newtext + t.title;
                        play(newtext)
                            // if (t.options[0]) {
                            //     for (let t1 of t.options) {
                            //         console.log('t1----', t1)
                            //         textopt = textopt + t1.label
                            //     }
                            // }
                    } else {
                        if (textplay) {
                            setTimeout(async function() {
                                await play(t.text)
                            }, 8000);
                        } else {
                            await play(t.text)
                            textplay = true;
                        }

                    }
                }
                console.log('newpayload---', JSON.parse(newPayloadStr).result.output.generic[0].text)
            }
            await currentResponsePayloadSetter.call(Api, newPayloadStr);

            await displayMessage(JSON.parse(newPayloadStr).result, settings.authorTypes.watson);

        };

        Api.setErrorPayload = function(newPayload) {
            displayMessage(newPayload, settings.authorTypes.watson);
        };
    }


    function setupInputBox() {
        var input = document.getElementById('textInput');
        var dummy = document.getElementById('textInputDummy');
        var minFontSize = 14;
        var maxFontSize = 16;
        var minPadding = 4;
        var maxPadding = 6;

        // If no dummy input box exists, create one
        if (dummy === null) {
            var dummyJson = {
                'tagName': 'div',
                'attributes': [{
                    'name': 'id',
                    'value': 'textInputDummy'
                }]
            };

            dummy = Common.buildDomElement(dummyJson);
            document.body.appendChild(dummy);
        }

        function adjustInput() {
            if (input.value === '') {
                // If the input box is empty, remove the underline
                input.classList.remove('underline');
                input.setAttribute('style', 'width:' + '100%');
                input.style.width = '100%';
            } else {
                input.classList.add('underline');
                var txtNode = document.createTextNode(input.value);
                ['font-size', 'font-style', 'font-weight', 'font-family', 'line-height',
                    'text-transform', 'letter-spacing'
                ].forEach(function(index) {
                    dummy.style[index] = window.getComputedStyle(input, null).getPropertyValue(index);
                });
                dummy.textContent = txtNode.textContent;

                var padding = 0;
                var htmlElem = document.getElementsByTagName('html')[0];
                var currentFontSize = parseInt(window.getComputedStyle(htmlElem, null).getPropertyValue('font-size'), 10);
                if (currentFontSize) {
                    padding = Math.floor((currentFontSize - minFontSize) / (maxFontSize - minFontSize) *
                        (maxPadding - minPadding) + minPadding);
                } else {
                    padding = maxPadding;
                }

                var widthValue = (dummy.offsetWidth + padding) + 'px';
                input.setAttribute('style', 'width:' + widthValue);
                input.style.width = widthValue;
            }
        }

        // Any time the input changes, or the window resizes, adjust the size of the input box
        input.addEventListener('input', adjustInput);
        window.addEventListener('resize', adjustInput);

        // Trigger the input event once to set up the input box and dummy element
        Common.fireEvent(input, 'input');
    }

    // Display a user or Watson message that has just been sent/received
    function displayMessage(newPayload, typeValue) {
        var isUser = isUserMessage(typeValue);
        if ((newPayload.output && newPayload.output.generic) || newPayload.input) {
            var responses = buildMessageDomElements(newPayload, isUser);
            var chatBoxElement = document.querySelector(settings.selectors.chatBox);
            var previousLatest = chatBoxElement.querySelectorAll((isUser ? settings.selectors.fromUser : settings.selectors.fromWatson) +
                settings.selectors.latest);
            if (previousLatest) {
                Common.listForEach(previousLatest, function(element) {
                    element.classList.remove('latest');
                });
            }
            setResponse(responses, isUser, chatBoxElement, 0, true);
        }
    }

    // Recurisive function to add responses to the chat area
    function setResponse(responses, isUser, chatBoxElement, index, isTop) {
        if (index < responses.length) {
            var res = responses[index];
            if (res.type !== 'pause') {
                var currentDiv = getDivObject(res, isUser, isTop);
                chatBoxElement.appendChild(currentDiv);

                currentDiv.classList.add('load');
                setTimeout(function() {
                    // wait a sec before scrolling
                    scrollToChatBottom();
                }, 1000);
                setResponse(responses, isUser, chatBoxElement, index + 1, false);
            } else {
                var userTypringField = document.getElementById('user-typing-field');
                if (res.typing) {
                    var loading = document.querySelector('.spinner');
                    loading.style.display = "none";
                }
                setTimeout(function() {
                    userTypringField.innerHTML = '';
                    setResponse(responses, isUser, chatBoxElement, index + 1, isTop);
                }, res.time);
            }
        }
    }



    // Constructs new DOM element from a message
    function getDivObject(res, isUser, isTop) {
        var classes = [(isUser ? 'from-user' : 'from-watson'), 'latest', (isTop ? 'top' : 'sub')];
        var messageJson = {
            'tagName': 'div',
            'classNames': ['segments'],
            'children': [{
                'tagName': 'div',
                'classNames': classes,
                'children': [{
                    'tagName': 'div',
                    'classNames': ['message-inner'],
                    'children': [{
                        'tagName': 'p',
                        'text': res.innerhtml
                    }]
                }],
            }]
        };
        return Common.buildDomElement(messageJson);
    }


    function getLoadingObject() {
        var messageJson = {
            'tagName': 'div',
            'classNames': ['spinner'],
            'children': [{
                // <div class='message-inner'>
                'tagName': 'div',
                'classNames': ['bounce1'],
            }, {
                // <div class='message-inner'>
                'tagName': 'div',
                'classNames': ['bounce2'],
            }, {
                // <div class='message-inner'>
                'tagName': 'div',
                'classNames': ['bounce3'],
            }]
        }
        return Common.buildDomElement(messageJson);
    }

    // Checks if the given typeValue matches with the user "name", the Watson "name", or neither
    // Returns true if user, false if Watson, and null if neither
    // Used to keep track of whether a message was from the user or Watson
    function isUserMessage(typeValue) {
        if (typeValue === settings.authorTypes.user) {
            return true;
        } else if (typeValue === settings.authorTypes.watson) {
            return false;
        }
        return null;
    }

    function getOptions(optionsList, preference, description) {
        var list = '';
        var i = 0;
        if (optionsList !== null) {
            if (preference === 'text') {
                list = '<ul>';
                for (i = 0; i < optionsList.length; i++) {
                    if (optionsList[i].value) {
                        if (optionsList[i].value.input.text.includes('BHK')) {
                            list += '<li><div class="options-list" onclick="ConversationPanel.sendMessage(\'' +
                                optionsList[i].value.input.text + ' ' + description + '\');" >' + optionsList[i].label + '</div></li>';
                        } else {
                            list += '<li><div class="options-list" onclick="ConversationPanel.sendMessage(\'' +
                                optionsList[i].value.input.text + '\');" >' + optionsList[i].label + '</div></li>'
                        }
                    }
                }
                list += '</ul>';
            } else if (preference === 'button') {
                list = '<br>';
                for (i = 0; i < optionsList.length; i++) {
                    if (optionsList[i].value) {
                        if (optionsList[i].value.input.text.includes('BHK')) {
                            var item = '<div class="options-button" onclick="ConversationPanel.sendMessage(\'' +
                                optionsList[i].value.input.text + ' ' + description + '\');" >' + optionsList[i].label + '</div>';
                            list += item;
                        } else {
                            var item = '<div class="options-button" onclick="ConversationPanel.sendMessage(\'' +
                                optionsList[i].value.input.text + '\');" >' + optionsList[i].label + '</div>';
                            list += item;
                        }
                    }
                }
            }
        }
        return list;
    }

    function getResponse(responses, gen) {
        var title = '',
            description = '';
        desc = '';
        if (gen.hasOwnProperty('title')) {
            title = gen.title;
        }
        if (gen.hasOwnProperty('description')) {
            description = '<div>' + gen.description + '</div>';
            desc = desc + gen.description;
        }
        if (gen.response_type === 'image') {
            var img = '<div><img src="' + gen.source + '" width="300"></div>';
            responses.push({
                type: gen.response_type,
                innerhtml: title + description + img
            });
        } else if (gen.response_type === 'text') {
            responses.push({
                type: gen.response_type,
                innerhtml: gen.text
            });
        } else if (gen.response_type === 'pause') {
            responses.push({
                type: gen.response_type,
                time: gen.time,
                typing: gen.typing
            });
        } else if (gen.response_type === 'option') {
            var preference = 'text';
            if (gen.hasOwnProperty('preference')) {
                preference = gen.preference;
            }

            var list = getOptions(gen.options, preference, desc);
            responses.push({
                type: gen.response_type,
                innerhtml: title + description + list
            });
        }
    }

    // Constructs new generic elements from a message payload
    function buildMessageDomElements(newPayload, isUser) {
        var textArray = isUser ? newPayload.input.text : newPayload.output.text;
        if (Object.prototype.toString.call(textArray) !== '[object Array]') {
            textArray = [textArray];
        }

        var responses = [];

        if (newPayload.hasOwnProperty('output')) {
            if (newPayload.output.hasOwnProperty('generic')) {

                var generic = newPayload.output.generic;

                generic.forEach(function(gen) {
                    getResponse(responses, gen);
                });
            }
        } else if (newPayload.hasOwnProperty('input')) {
            var input = '';
            textArray.forEach(function(msg) {
                input += msg + ' ';
            });
            input = input.trim()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            if (input.length !== 0) {
                responses.push({
                    type: 'text',
                    innerhtml: input
                });
            }
        }
        return responses;
    }

    // Scroll to the bottom of the chat window
    function scrollToChatBottom() {
        var scrollingChat = document.querySelector('#scrollingChat');
        scrollingChat.scrollTop = scrollingChat.scrollHeight;
    }

    function sendMessage(text) {
        // Send the user message
        Api.sendRequest(text);
    }


    function play(inputText) {
        let buf;

        const url = '/api/text-to-speech';
        const params = `text=${inputText}`;
        const request = new XMLHttpRequest();
        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        request.responseType = 'arraybuffer';
        // Decode asynchronously
        request.onload = function() {
            context.decodeAudioData(
                request.response,
                function(buffer) {
                    buf = buffer;
                    play();
                },
                function(error) {
                    console.error('decodeAudioData error', error);
                }
            );
        };
        request.send(params);

        // Play the loaded file
        function play() {
            // Create a source node from the buffer
            const source = context.createBufferSource();
            source.buffer = buf;
            source.connect(context.destination);
            source.start(0);
        }
    }

    // Handles the submission of input
    function inputKeyDown(event, inputBox) {
        // Submit on enter key, dis-allowing blank messages
        if (event.keyCode === 13 && inputBox.value) {
            sendMessage(inputBox.value);
            inputBox.value = '';
            Common.fireEvent(inputBox, 'input');
        }
    }

    function toggleSpeaker(event, element) {
        var chatColumn = document.querySelector('#speaker_icon')
            // var chatIcon = document.querySelector('#chat_icon');
            //settings.selectors.payloadColumn);
        if (chatColumn.classList.contains('fa-volume-mute')) {
            // element.classList.remove('chat-active');
            chatColumn.classList.remove('fa-volume-mute');
            chatColumn.classList.add('fa-volume-up');
            // chatColumn.style.color = "rgb(47, 196, 156)";
        } else {
            chatColumn.classList.remove('fa-volume-up');
            chatColumn.classList.add('fa-volume-mute');
        }
    }
}());