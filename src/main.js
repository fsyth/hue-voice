/*global Hue, HueCommand*/

const hue = new Hue({ id: '4vy12cW4AIfRfeTgm8Gr6TBOhY1oVsNBoAW4aMnO' })
let roomNo = '1'

const hueCommands = HueCommand.presets

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList
const SpeechRecognitionEvent = window.SpeechRecognitionEvent || window.webkitSpeechRecognitionEvent

if (!SpeechRecognition)
  alert('Your browser does not support the Web Speech API. Please try again using an up to date version of Chrome.')

const speechRec = new SpeechRecognition()
speechRec.lang = navigator.language || 'en-US'
//speechRec.continuous = true
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

/*
document.body.onclick = function () {
  speechRec.start()
}
*/
speechRec.start()
