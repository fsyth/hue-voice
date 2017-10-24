/**
 * @class HueCommand
 * Class for interpreting voice commands as Hue states and relaying this to the
 * Hue Bridge.
 * © James Forsyth, 2017
 */
class HueCommand {
  /**
   * Commands are created from a regular expression pattern to test strings
   * against. If an input string matches the pattern, the command will be
   * executed.
   *
   * The commands will output a hue state based on the command. The hue state
   * to be output might depend on numbers in the command. In this case, the hue
   * state should contain the string '$1' where the number corresponds with a
   * capture group in the commandPattern regular expression.
   *
   * If the number needs to be manipulated before it is replaced in the
   * hueState, a mapping function can be used to map from the number in the
   * command to the number in the hueState.
   * e.g. mapping = n => n * 255 / 100 | 0
   * would convert a percentage to a byte range before it is used in the
   * hueState
   *
   * @param {RegExp} commandPattern
   *        A pattern that describes the command to be matched
   * @param {lightState} hueState
   *        The state to be sent to the Hue Bridge
   * @param {function} [mapping = n => n]
   *        A function that maps a capture group from the command onto another
   *        value to be used in the hueState
   */
  constructor(commandPattern, hueState, mapping = n => n) {
    this.commandPattern = commandPattern

    if (typeof hueState === 'string')
      this.hueState = hueState
    else
      this.hueState = JSON.stringify(hueState)

    this.mapping = mapping
  }

  /**
   * Checks an input string against this command's commandPattern.
   * If it matches, a new Hue State will be sent to the Hue Bridge and room
   * specified
   * @param   {string} str
   *          Input string to be scanned for this command
   * @param   {Hue} hue
   *          An instance of the Hue class to be controlled
   * @param   {number|string} roomNo
   *          Room identifier number
   * @param   {successCallback} callback
   *          Callback run after the Hue lights are successfully set
   * @param   {errorCallback} errorCallback
   *          Callback to handle errors when communicating with Hue
   * @returns {string?}
   *          Returns the string of JSON formatted data sent to control the
   *          Hue Bridge, or null if the command pattern did not match.
   */
  matchAndRun(str, hue, roomNo, callback, errorCallback) {
    let matches = str.match(this.commandPattern)

    if (matches) {
      console.log(this.commandPattern)

      let hueState = this.hueState.replace(
        /"\$(\d+)"/g, (_, $n) =>
        this.mapping(parseInt(matches[$n]))
      )

      hue.setRoom(roomNo, hueState, callback, errorCallback)

      console.log(hueState)
      return hueState
    }
    return null
  }

  /**
   * Returns an array of useful preset commands for setting brightness,
   * saturation, hue, colour temperature and on/off.
   * The commands all begin with 'light' or 'lights' to distinguish them from
   * regular speaking.
   * All of the command patterns use an end of string anchor so that only the
   * most recent command in a string will be run.
   * @returns {HueCommand[]}
   *          A list of preset commands for controlling the Hue Bridge.
   */
  static get presets() {
    return [
      new HueCommand(/lights? (?:brightness )?(\d+)$/i,   { bri:  '$1' }),
      new HueCommand(/lights? (?:brightness )?(\d+)%$/i,  { bri:  '$1' }, n => n * 255 / 100 | 0),
      new HueCommand(/lights? (?:brightness )?maximum$/i, { bri:   255 }),
      new HueCommand(/lights? (?:brightness )?minimum$/i, { bri:     0 }),
      new HueCommand(/lights? (?:colou?r|hue) (\d+)$/i,   { hue:  '$1' }, n => n * 65535 / 360),
      new HueCommand(/lights? (\d+) degrees?$/i,          { hue:  '$1' }, n => n * 65535 / 360),
      new HueCommand(/lights? (?:colou?r|hue) (\d+)%$/i,  { hue:  '$1' }, n => n * 65535 / 100 | 0),
      new HueCommand(/lights? sat(?:uration)? (\d+)$/i,   { sat:  '$1' }),
      new HueCommand(/lights? sat(?:uration)? (\d+)%$/i,  { sat:  '$1' }, n => n * 255 / 100 | 0),
      new HueCommand(/lights? temp(?:erature)? (\d+)$/i,  { ct:   '$1' }),
      new HueCommand(/lights? temp(?:erature)? (\d+)%$/i, { ct:   '$1' }, n => 153 + n * 347 / 100 | 0),
      new HueCommand(/lights? (\d+) Kelvin$/i,            { ct:   '$1' }, n => 1e6 / n | 0),
      new HueCommand(/lights? white$/i,                   { sat:     0 }),
      new HueCommand(/lights? red$/i,                     { hue:     0, sat:255 }),
      new HueCommand(/lights? orange$/i,                  { hue:  5461, sat:255 }),
      new HueCommand(/lights? yellow$/i,                  { hue: 10922, sat:255 }),
      new HueCommand(/lights? green$/i,                   { hue: 21845, sat:255 }),
      new HueCommand(/lights? cyan$/i,                    { hue: 32767, sat:255 }),
      new HueCommand(/lights? blue$/i,                    { hue: 43690, sat:255 }),
      new HueCommand(/lights? purple$/i,                  { hue: 49151, sat:255 }),
      new HueCommand(/lights? magenta$/i,                 { hue: 54612, sat:255 }),
      new HueCommand(/lights? on$/i,                      { on:   true }),
      new HueCommand(/lights? off$/i,                     { on:  false })
    ]
  }

  /**
   * Returns a list of all the keywords used in the preset commands.
   * @returns {string}
   *          A string containing every single keyword used in the preset
   *          commands, separated by ' | '.
   */
  static get presetsGrammar() {
    return 'light | lights | colour | color | hue | bri | brightness | sat | saturation | on | off | temp | temperature | Kelvin | white | red | orange | yellow | green | cyan | blue | purple | magenta'
  }
}


/*
// Here is an old version that does not require a class to be constructed
function hueCommand(str, commandPattern, hueState, mapping = n => n) {
  let matches = str.match(commandPattern)

  if (matches) {
    console.log(commandPattern)

    let hueStr = JSON.stringify(hueState).replace(/"\$(\d+)"/g, (_, $n) =>
      mapping(parseInt(matches[parseInt($n)]))
    )

    hue.setRoom(roomNo, hueStr)

    console.log(hueStr)
    return hueStr
  }
  return null
}
*/