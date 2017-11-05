/*global Hue, HueCommand*/

// Debug message area with example callbacks to show that communication is
// succesful or not
const debugMessage = document.getElementById('debug')

function onSuccess(successes) {
  fadeFrom('#080')
  debugMessage.innerText = 'success'
}

function onError(errors) {
  fadeFrom('#F00')
  debugMessage.innerText = errors[0].error.description
}

function fadeFrom(color) {
  debugMessage.style.transition = ''
  debugMessage.style.color = color
  setTimeout(() => {
    debugMessage.style.transition = 'color 4s'
    debugMessage.style.color = 'transparent'
  }, 2e3)
}



// Hue class for interfacing with Philips Hue
// Provide your own Hue parameters here, or use the devId input to set later
const hue = new Hue(null, onHueConnection, onError)
const devIdInput = document.getElementById('devId')
const roomSelectionInput = document.getElementById('room-selection')
let roomNo

function onHueConnection(hue) {
  devIdInput.value = hue.id

  for (let room of hue.rooms) {
    let option = document.createElement('option')
    option.text = room.name
    option.value = room.roomNo
    roomSelectionInput.add(option)
  }

  roomSelectionInput.onchange()

  onSuccess()
}

roomSelectionInput.onchange = e => {
  roomNo = roomSelectionInput.value
}

// Allow Hue developer ID to be changed from a text input without needing to go
// into the console
devIdInput.onchange = e => {
  hue.reset()
  hue.id = devIdInput.value
  hue.setup(onHueConnection, onSetupError)
}

// Error callback to notify the user to press the Link Button on
// the when setting up the Hue Bridge with a new ID.
function onSetupError(errors) {
  // Check that type of error is Link Button error
  if (errors[0].error.type === 101)
    alert('Please press the Link Button on the Hue Bridge,\n' +
          'then click OK to continue.')
  else
    alert(errors[0].error.description)

  onError(errors)
}



// HueCommand class for interpreting plain english commands as light states.
// Using the preset commands here, but you could add your own.
const hueCommands = HueCommand.presets

// Callback for what to do with a commanded Light State when a command matches.
function setLightState(lightState) {
  hue.setRoom(roomNo, lightState, onSuccess, onError)
}

// Keep a stack of previous commands so the user can traverse back through them
// using the arrow keys
const commandHistory = []
let historyIndex = 0

// Allow commands to be typed instead of spoken if desired using a text input.
const typingInput = document.getElementById('typing')

typingInput.onchange = e => {
  if (typingInput === '')
    return

  commandHistory.push(typingInput.value)
  historyIndex = 0

  for (let command of hueCommands)
    command.matchAndRun('lights ' + typingInput.value, setLightState)

  typingInput.value = ''
}

typingInput.onkeydown = e => {
  if (e.keyCode === 38 && historyIndex < commandHistory.length)
    // Up arrow
    historyIndex++
  else if (e.keyCode === 40 && historyIndex > 0)
    // Down arrow
    historyIndex--
  else if (e.keyCode === 13)
    // Enter key
    typingInput.onchange()
  else
    return

  // Retrieve command
  if (historyIndex === 0)
    typingInput.value = ''
  else
    typingInput.value = commandHistory[commandHistory.length - historyIndex]

  // Set cursor to end of line
  let cursor = typingInput.value.length;
  typingInput.setSelectionRange(cursor, cursor)
  e.preventDefault()
}



// Use the Web Speech API to get plain english commands from the user.
// SpeechRecognition is new so has vendor prefixes currently and may not be
// supported
const SpeechRecognition = window.SpeechRecognition ||
                          window.webkitSpeechRecognition

if (!SpeechRecognition)
  alert('Your browser does not support the Web Speech API.\n' +
        'Please try again using an up to date version of Chrome.')

let recording = false
const toggleRecordingButton = document.getElementById('toggle-recording')

const speechRec = new SpeechRecognition()
speechRec.lang = navigator.language || 'en-US'
speechRec.continuous = false
speechRec.interimResults = false

speechRec.onstart = e => {
  recording = true
  toggleRecordingButton.innerText = 'Stop Recording'
}

speechRec.onresult = e => {
  let speech = e.results[0][0].transcript

  // Actually do something with the detected speech. In this case, display it
  // and check it against the list of commands to control Hue.

  document.getElementById('speech').innerText = speech

  commandHistory.push(speech)
  historyIndex = 0

  for (let command of hueCommands)
    command.matchAndRun(speech, setLightState)
}

// Stop when speech ends to clear old transcript
speechRec.onspeechend = e => {
  speechRec.stop()
}

// Start again on ending for continuous speech recognition
speechRec.onend = e => {
  if (recording)
    speechRec.start()
}

toggleRecordingButton.onclick = e => {
  if (recording) {
    recording = false
    toggleRecordingButton.innerText = 'Start Recording'
    speechRec.stop()
  } else {
    speechRec.start()
  }
}

speechRec.start()
