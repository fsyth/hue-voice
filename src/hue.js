/*global console*/

/**
 * @class Hue
 * Class for interfacing with Philips Hue Lights.
 * © James Forsyth, 2017
 */
class Hue {
  /**
   * Object with settings for Hue connection parameters, used as an argument
   * for the Hue constructor. This allows some parameters to be preset so that
   * they do not have to obtained again which could require physical access to
   * the Hue Bridge. The internal IP address of the Hue Bridge can be obtained
   * using Hue's UPnP server [https://www.meethue.com/api/nupnp]. A developer
   * ID allows access to the bridge. This can be obtained by following this
   * guide: [https://www.developers.meethue.com/documentation/getting-started].
   *
   * @typedef  hueSettings
   * @type     {object}
   *
   * @property {string} ip
   *           The IP address to use for the Hue Bridge. If omitted, it will be
   *           looked up automatically.
   * @property {string} id
   *           The developer ID that allows access to the Hue Bridge. If
   *           omitted, obtaining a new ID requires the button on the Bridge to
   *           be pressed to allow access.
   */

  /**
   * A callback when the connection to the Hue Bridge has been established
   * @callback hueCallback
   * @param {Hue} hue An instance of the Hue object ready to control lights
   */

  /**
   * Optionally provide settings to preset the Hue connection parameters.
   * Use callbacks to wait until the connection has been established with the
   * Hue Bridge or to handle errors that occurred when finding the Hue Bridge
   * IP address, obtaining a developer ID, or finding all rooms  and lights.
   *
   * @param {hueSettings}   [settings]
   *        An optional object with settings to initialise ip, id and lights to
   *        control.
   * @param {hueCallback} [callback]
   *        A callback run once the connection has been established with the
   *        Hue bridge.
   * @param {errorCallback} [errorCallback]
   *        A callback to handle errors
   *
   * @example
   * function hueIsReady(hue) {
   *   // code goes here, e.g.
   *   hue.setAllLights({on:true}, console.log, console.error)
   * }
   *
   * function handleErrors(error) {
   *   // code goes here, e.g.
   *   console.error(error.description)
   * }
   *
   * new Hue({id: '...'}, hueIsReady, handleErrors)
   */
  constructor(settings, callback, errorCallback) {
    let stored
    let storedString = window.localStorage.getItem('hue')

    if (storedString)
      stored = JSON.parse(storedString)

    this.ip = (settings && settings.ip) || (stored && stored.ip)
    this.id = (settings && settings.id) || (stored && stored.id)

    this.setup(callback, errorCallback)
  }


  /**
   * Queues up tasks to find missing parameters. This automatically handles the
   * order of the sequence, which is important since you need IP to get ID to
   * get All.
   * If any of these are already known, these stages are skipped.
   * Finally, calls the callback (if any) that was passed in once everything
   * is set up.
   * @param {hueCallback} [callback]
   *        A callback run once the connection has been established with the
   *        Hue bridge.
   * @param {errorCallback} [errorCallback]
   *        A callback to handle errors
   */
  setup(callback, errorCallback) {
    const setupQueue = []

    if (!this.ip)
      setupQueue.push(this.findIp.bind(this))

    if (!this.id)
      setupQueue.push(this.createId.bind(this))

    if (!this.lights)
      setupQueue.push(this.findAll.bind(this))

    if (typeof callback === 'function') {
      setupQueue.push(next => {
        callback(this)
        next()
      })
    }

    const processNextInQueue = () => {
      if (setupQueue.length > 0) {
        let stage = setupQueue.shift()
        stage(processNextInQueue, errorCallback)
      }
    }

    processNextInQueue()
  }


  /**
   * Takes the ProgressEvent of an XMLHttpRequest response handler and parses
   * the response text into an object
   * @param   {ProgressEvent}
   *          e The ProgressEvent for the response handler
   * @returns {successData|errorData|allData|lightData|roomData}
   *          An object of data parsed from the response text
   */
  parseResponse(e) {
    return JSON.parse(e.target.response)
  }


  /**
   * Object passed into error handler callbacks.
   * @typedef  errorData
   * @type     {object}
   * @property {object} error
   *           Error data root key
   * @property {number} error.type
   *           Error type
   * @property {string} error.address
   *           Address of XMLHttpRequest
   * @property {string} error.description
   *           Error message
   */

  /**
   * Callback when an error occurs during an XMLHttpRequest
   * @callback errorCallback
   * @param    {errorData[]} errors
   *           An array of objects containing error information
   */

  /**
   * Checks the parsed data or ProgressEvent from an XMLHttpRequest.
   * If the data describes an error response, it is logged to the console and
   * the errorCallback is called.
   * Returns true if an error was detected so that calling functions can be
   * stopped early.
   * @param   {object} data
   *          Data from an XMLHttpRequest response
   * @param   {errorCallback} [errorCallback]
   *          A function to call to handle the error
   * @returns {boolean}
   *          True if an error was described in the data
   */
  detectErrors(data, errorCallback) {
    if (data instanceof window.ProgressEvent)
      data = this.parseResponse(data)

    if (data[0] && data[0].error) {
      if (typeof errorCallback === 'function')
        errorCallback(data)

      for (let d of data)
        console.error(d.error.description)

      return true
    }

    return false
  }


  /**
   * Callback when the IP address is found
   * @callback ipCallback
   * @param {string} ip
   *        The IP address of the Hue Bridge
   */

  /**
   * Finds the internal IP address of the Hue Bridge on the local network via
   * a UPnP server.
   * @param {ipCallback} [callback]
   *        Optional callback on IP found
   * @param {errorCallback} [errorCallback]
   *        Optional callback on error
   */
  findIp(callback, errorCallback) {
    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let data = this.parseResponse(e)

      if (this.detectErrors(data, errorCallback))
        return

      this.ip = data[0].internalipaddress

      if (typeof callback === 'function')
        callback(this.ip)
    })

    xhr.open('GET', 'https://www.meethue.com/api/nupnp')
    xhr.send()
  }


  /**
   * @callback idCallback
   * @param {string} id
   *        The id obtained that allows access to the Hue Bridge
   */

  /**
   * Begins process to obtain a developer id to allow access to the Hue Bridge
   * over the local network. This requires physical access to the Hue Bridge as
   * the button on it must be pressed at the appropriate time
   * @param {idCallback} callback
   *        Callback run once the ID has been obtained.
   */
  createId(callback) {
    // GET from ip
    this.id = 'obviously not implemented yet'

    if (typeof callback === 'function')
      callback(this.id)

    throw 'createId_NotYetImplemented'
  }


  /**
   * Stores Hue parameters in local storage so that IP does not need to be
   * looked up and the button on the bridge does not need to be pressed to
   * obtain a new ID, and the lights and room sdo not need to be found again.
   */
  storeSettingsLocally() {
    window.localStorage.setItem(JSON.stringify(this))
  }


  /**
   * Object containing all data returned from the Hue Bridge
   * @typedef allData
   * @type    {object}
   */

  /**
   * @callback allCallback
   * @param {allData} data
   *        Object containing all data returned from the Hue Bridge.
   */

  /**
   * Gets information from the Hue Bridge on its entire network of lights and
   * rooms.
   * @param {allCallback} [callback]
   *        Optional callback to handle data returned from the Hue Bridge
   * @param {errorCallback} [errorCallback]
   *        Optional callback to handle error when getting data from Hue Bridge
   */
  findAll(callback, errorCallback) {
    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let network = this.parseResponse(e)

      if (this.detectErrors(network, errorCallback))
        return

      this.network = network

      this.lights = []
      for (let lightNo of Object.keys(network.lights)) {
        let light = network.lights[lightNo]
        this.lights.push({
          lightNo: lightNo,
          name: light.name,
          state: light.state
        })
      }

      this.rooms = []
      for (let roomNo of Object.keys(network.groups)) {
        let room = network.groups[roomNo]
        this.rooms.push({
          roomNo: roomNo,
          name: room.name,
          state: room.state,
          action: room.action
        })
      }

      if (typeof callback === 'function')
        callback(network)
    })

    xhr.open('GET', `http://${this.ip}/api/${this.id}`)
    xhr.send()
  }

  /**
   * An object with parameters describing the current output of a Hue
   * @typedef  lightState
   *           light
   * @type     {object}
   *
   * @property {number} [hue]
   *           Colour hue, range 0:65535
   * @property {number} [sat]
   *           Colour saturation, range 0:255
   * @property {number} [bri]
   *           Colour brightness, range 0:255
   * @property {number} [ct]
   *           Colour temperature, range 153:500 [1/MK]
   * @property {boolean} [on]
   *           On/Off state of the light
   */

  /**
   * An object with data for the light and its current state
   * @typedef  lightData
   * @type     {object}
   *
   * @property {string} name
   *           Name of the light
   * @property {lightState} state
   *           Current state of the light
   */

  /**
   * @callback lightCallback
   * @param    {lightData} data
   *           An object with data for the light and its current state
   */

  /**
   * Gets the current state of a given light
   * @param {string|number} lightNo
   *        Light number identifier
   * @param {lightCallback} callback
   *        A callback to receive an object with data for the light
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  getLight(lightNo, callback, errorCallback) {
    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let data = this.parseResponse(e)

      if (this.detectErrors(data, errorCallback))
        return

      if (typeof callback === 'function')
        callback(data)
    })

    xhr.open('GET', this.getLightUrl(lightNo))
    xhr.send()
  }


  /**
   * An object with data for successfully setting the state/action of a
   * light/room. The keys of the success object are the address where changes
   * were made.
   * @typedef  successData
   * @type     object
   *
   * @property {object} success
   *           Success data root key
   * @property {number} success.(address)
   *           A variable key of some address in the Hue network and a value of
   *           the new value set at that address.
   */

  /**
   * @callback successCallback
   * @param    {successData[]} successes
   *           An array of objects with data on the changes made to the
   *           room/light
   */

  /**
   * Sets the current state of a given light
   * @param {string|number} lightNo
   *        Light number identifier
   * @param {lightState} state
   *        An object of light parameters to be changed
   * @param {successCallback} callback
   *        A callback once changes to the light have been set
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  setLight(lightNo, state, callback, errorCallback) {
    if (typeof state !== 'string') {
      state = JSON.stringify(state)
    }

    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let data = this.parseResponse(e)

      if (this.detectErrors(data, errorCallback))
        return

      if (typeof callback === 'function')
        callback(data)
    })

    xhr.open('PUT', this.getLightUrl(lightNo) + '/state')
    xhr.send(state)
  }

  /**
   * An object describing the current state of a room
   * @typedef roomState
   * @type    {object}
   *
   * @property {boolean} all_on
   *           Whether all the lights in the room are on
   * @property {boolean} any_on
   *           Whether any of the lights in the room are on
   */

  /**
   * An object with data for the light and its current state
   * @typedef  roomData
   * @type     {object}
   *
   * @property {lightState} action
   *           The state of lights last set for the whole room
   * @property {string} name
   *           The name of the room
   * @property {roomState} state
   *           The state of the room
   */

  /**
   * @callback roomCallback
   * @param {roomData} data An object with data for the room and its current
   *                        state
   */

  /**
   * Gets the current state of a given room
   * @param {string|number} roomNo
   *        Room number identifier
   * @param {roomCallback} callback
   *        A callback to receivean object with data for the room
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  getRoom(roomNo, callback, errorCallback) {
    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let data = this.parseResponse(e)

      if (this.detectErrors(data, errorCallback))
        return

      if (typeof callback === 'function')
        callback(data)
    })

    xhr.open('GET', this.getRoomUrl(roomNo))
    xhr.send()
  }


  /**
   * Sets the current state of a given room
   * @param {string|number} roomNo
   *        Room number identifier
   * @param {lightState} state
   *        An object of light parameters to be changed
   * @param {successCallback} callback
   *        A callback to receivean object with data for the room
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  setRoom(roomNo, state, callback, errorCallback) {
    if (typeof state !== 'string') {
      state = JSON.stringify(state)
    }

    const xhr = new XMLHttpRequest()

    xhr.addEventListener('load', e => {
      let data = this.parseResponse(e)

      if (this.detectErrors(data, errorCallback))
        return

      if (typeof callback === 'function')
        callback(data)
    })

    xhr.open('PUT', this.getRoomUrl(roomNo) + '/action')
    xhr.send(state)
  }


  /**
   * Gets the current state of a given light in turn
   * @param {lightCallback} callback
   *        A callback to receive object with data for each light in turn
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  getAllLights(callback, errorCallback) {
    for (let light of this.lights) {
      this.getLight(light.lightNo, callback, errorCallback)
    }
  }


  /**
   * Sets the current state of all available lights in turn
   * @param {lightState} state
   *        An object of light parameters to be changed
   * @param {successCallback} callback
   *        A callback for each of the lights in turn once changes are set
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  setAllLights(state, callback, errorCallback) {
    for (let light of this.lights) {
      this.setLight(light.lightNo, state, callback, errorCallback)
    }
  }


  /**
   * Gets the current state of all available rooms in turn
   * @param {roomCallback} callback
   *        A callback to receive room data for eah room in turn
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  getAllRooms(callback, errorCallback) {
    for (let room of this.rooms) {
      this.getRoom(room.roomNo, callback, errorCallback)
    }
  }


  /**
   * Sets the current state of all available rooms in turn
   * @param {lightState} state
   *        An object of light parameters to be changed
   * @param {successCallback} callback
   *        A callback for each of the rooms once changes are set
   * @param {errorCallback} errorCallback
   *        A callback to handle errors
   */
  setAllRooms(state, callback, errorCallback) {
    for (let room of this.rooms) {
      this.setRoom(room.roomNo, state, callback, errorCallback)
    }
  }


  /**
   * Constructs the URL of a given light.
   * Append '/state' for PUT requests.
   * @param   {string|number} lightNo
   *          Light number identifier
   * @returns {string}
   *          The constructed URL for GET requests.
   */
  getLightUrl(lightNo) {
    return `http://${this.ip}/api/${this.id}/lights/${lightNo}`
  }


  /**
   * Constructs the URL of a given room for GET requests.
   * Append '/action' for PUT requests.
   * @param   {string|number} lightNo
   *          Light number identifier
   * @returns {string}
   *          The constructed URL for GET requests.
   */
  getRoomUrl(roomNo) {
    return `http://${this.ip}/api/${this.id}/groups/${roomNo}`
  }

}
