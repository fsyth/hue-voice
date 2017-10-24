/*global Hue, HueCommand*/

// Must provide your own Hue parameters here
const hue = new Hue({ id: '4vy12cW4AIfRfeTgm8Gr6TBOhY1oVsNBoAW4aMnO' })
let roomNo = '1'

// Just use the preset commands, but you could add your own
const hueCommands = HueCommand.presets

// SpeechRecognition API is new so has vendor prefixes currently and may not be supported
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

if (!SpeechRecognition)
  alert('Your browser does not support the Web Speech API. Please try again using an up to date version of Chrome.')

const speechRec = new SpeechRecognition()
speechRec.lang = navigator.language || 'en-US'
speechRec.continuous = false
speechRec.interimResults = false

speechRec.onresult = function(e) {
  let speech = e.results[0][0].transcript
  console.log(speech)
  document.getElementById('speech').innerText = speech

  for (let command of hueCommands)
    command.matchAndRun(speech, hue, roomNo)
}

speechRec.onspeechend = function () {
  speechRec.stop()
}

speechRec.onend = function() {
  speechRec.start()
}

speechRec.start()
