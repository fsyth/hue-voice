/*global Hue, HueCommand*/


// Debug message area
const debugMessage = document.getElementById('debug')


// Must provide your own Hue parameters here
const hue = new Hue({ id: '4vy12cW4AIfRfeTgm8Gr6TBOhY1oVsNBoAW4aMnO' }, onSuccess, onError)
let roomNo = '1'


// Just use the preset commands, but you could add your own
const hueCommands = HueCommand.presets


// Allow Hue developer ID to be changed without going into the console
const devIdInput = document.getElementById('devId')
devIdInput.value = hue.id
devIdInput.onchange = e => {
  hue.reset()
  hue.id = devIdInput.value
  hue.setup(onSuccess, onError)
}


// Typing commands instead of speech
const typingInput = document.getElementById('typing')
typingInput.onchange = e => {
  for (let command of hueCommands)
    command.matchAndRun(typingInput.value, hue, roomNo, onSuccess, onError)

  typingInput.value = ''
}


// SpeechRecognition API is new so has vendor prefixes currently and may not be supported
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

if (!SpeechRecognition)
  alert('Your browser does not support the Web Speech API. Please try again using an up to date version of Chrome.')

const speechRec = new SpeechRecognition()
speechRec.lang = navigator.language || 'en-US'
speechRec.continuous = false
speechRec.interimResults = false

speechRec.onresult = e => {
  let speech = e.results[0][0].transcript
  console.log(speech)
  document.getElementById('speech').innerText = speech

  for (let command of hueCommands)
    command.matchAndRun(speech, hue, roomNo, onSuccess, onError)
}

speechRec.onspeechend = () => {
  speechRec.stop()
}

speechRec.onend = () => {
  speechRec.start()
}

speechRec.start()


// Example callbacks to show that communication is succesful or not

function onSuccess(e) {
  fadeFrom('#080')
  debugMessage.innerText = 'success'
}

function onError(e) {
  fadeFrom('#F00')
  debugMessage.innerText = e[0].error.description
}

function fadeFrom(color) {
  debugMessage.style.transition = ''
  debugMessage.style.color = color
  setTimeout(() => {
    debugMessage.style.transition = 'color 4s'
    debugMessage.style.color = 'transparent'
  }, 2e3)
}
