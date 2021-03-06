/**
 * @class HueCommand
 * Class for interpreting voice commands as light states and relaying this to the
 * Hue Bridge. <br>
 * © James Forsyth, 2017
 *
 * @example
 * // Example that maps percentage brightness to a byte value:
 * new HueCommand(
 *   /lights? (\d+)%$/i,        // Match 'lights 50%', etc.
 *   { bri:  '$1' },            // Output light state with '$1' placeholder.
 *   n => n * 255 / 100 | 0     // Scale from 0:100 to 0:255, rounding down.
 * )
 */
class HueCommand {
  /**
   * Commands are created from a regular expression pattern to test strings
   * against. If an input string matches the pattern, the command will be
   * executed. <br><br>
   *
   * The commands will output a light state based on the command. The hue state
   * to be output might depend on numbers in the command. In this case, the
   * light state should contain the string '$1' where the number corresponds
   * with a capture group in the commandPattern regular expression. <br><br>
   *
   * If the number needs to be manipulated before it is replaced in the
   * lightState, a mapping function can be used to map from the number in the
   * command to the number in the lightState. <br>
   * e.g. mapping = n => n * 255 / 100 | 0 <br>
   * would convert a percentage to a byte range before it is used in the
   * lightState
   *
   * @param {RegExp} commandPattern
   *        A pattern that describes the command to be matched.
   * @param {lightState} lightState
   *        The light state to be sent to the Hue Bridge, with the string '$1'
   *        replacing any numbers in the light state that require mapping.
   * @param {function} [mapping = n => n]
   *        A function that maps a capture group from the command pattern onto
   *        a numerical value to be used in the lightState. Note, Hue
   *        requires integer values, so be careful with division.
   */
  constructor(commandPattern, lightState, mapping = n => n) {
    this.commandPattern = commandPattern

    if (typeof lightState === 'string')
      this.lightState = lightState
    else
      this.lightState = JSON.stringify(lightState)

    this.mapping = mapping
  }

  /**
   * Callback function for when a HueCommand matches an input string, with the
   * commanded light state as an argument.
   * @callback commandMatchCallback
   * @param {lightState} lightState
   *        The light state object output by the command.
   */

  /**
   * Checks an input string against this command's commandPattern.
   * If it matches, a callback will be run with the light state, which is useful
   * when iterating over many commands.
   * The light state is also returned if there is a match, which is simpler for
   * individual commands.
   * @param   {string} str
   *          Input string to be scanned for this command
   * @param   {commandMatchCallback} [callback]
   *          Callback run when the input string matches the command pattern
   *          with the output light state as an argument.
   * @returns {string?}
   *          Returns the light state string the command should output, or null
   *          if the command pattern did not match.
   *
   * @example
   * // Using the value that is returned - be careful, it could be null
   * let commandTextFromUser = 'lights 50%'          // Some input to be tested
   * let hueCommand = new HueCommand( ... )          // Constructed HueCommand
   * let hue = new Hue( ... )                        // Hue interface class
   *
   * let lightState = hueCommand.matchAndRun(commandTextFromUser)
   * if (lightState !== null)
   *   hue.setAllLights(lightState)
   *
   * @example
   * // Using the callback - no need to check for null
   * let commandTextFromUser = 'lights 50%'          // Some input to be tested
   * let hueCommand = new HueCommand( ... )          // Constructed HueCommand
   * let hue = new Hue( ... )                        // Hue interface class
   *
   * hueCommand.matchAndRun(commandTextFromUser, lightState => {
   *   hue.setAllLights(lightState)
   * })
   */
  matchAndRun(str, callback) {
    let matches = str.match(this.commandPattern)

    if (matches) {
      console.log(this.commandPattern)

      let commandedLightState = JSON.parse(this.lightState.replace(
        /"\$(\d+)"/g, (_, $n) =>
        this.mapping(parseInt(matches[$n]))
      ))

      if (typeof callback === 'function')
        callback(commandedLightState)

      console.log(commandedLightState)
      return commandedLightState
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
      new HueCommand(/lights? (?:colou?r|hue) (\d+)$/i,   { hue:  '$1' }, n => n * 65535 / 360 | 0),
      new HueCommand(/lights? (\d+) degrees?$/i,          { hue:  '$1' }, n => n * 65535 / 360 | 0),
      new HueCommand(/lights? (?:colou?r|hue) (\d+)%$/i,  { hue:  '$1' }, n => n * 65535 / 100 | 0),
      new HueCommand(/lights? sat(?:uration)? (\d+)$/i,   { sat:  '$1' }),
      new HueCommand(/lights? sat(?:uration)? (\d+)%$/i,  { sat:  '$1' }, n => n * 255 / 100 | 0),
      new HueCommand(/lights? temp(?:erature)? (\d+)$/i,  { ct:   '$1' }),
      new HueCommand(/lights? temp(?:erature)? (\d+)%$/i, { ct:   '$1' }, n => 153 + n * 347 / 100 | 0),
      new HueCommand(/lights? (\d+) Kelvin$/i,            { ct:   '$1' }, n => 1e6 / n | 0),
      new HueCommand(/lights? white$/i,                   { sat:     0 }),
      new HueCommand(/lights? red$/i,                     { hue:     0, sat: 255 }),
      new HueCommand(/lights? orange$/i,                  { hue:  5461, sat: 255 }),
      new HueCommand(/lights? yellow$/i,                  { hue: 10922, sat: 255 }),
      new HueCommand(/lights? green$/i,                   { hue: 21845, sat: 255 }),
      new HueCommand(/lights? cyan$/i,                    { hue: 32767, sat: 255 }),
      new HueCommand(/lights? blue$/i,                    { hue: 43690, sat: 255 }),
      new HueCommand(/lights? purple$/i,                  { hue: 49151, sat: 255 }),
      new HueCommand(/lights? magenta$/i,                 { hue: 54612, sat: 255 }),
      new HueCommand(/lights? on$/i,                      { on:   true }),
      new HueCommand(/lights? off$/i,                     { on:  false }),
      new HueCommand(/lights? loop$/i,                    { effect: 'colorloop' }),
      new HueCommand(/lights? stop$/i,                    { effect: 'none' })
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
function hueCommand(str, commandPattern, lightState, mapping = n => n) {
  let matches = str.match(commandPattern)

  if (matches) {
    console.log(commandPattern)

    let hueStr = JSON.stringify(lightState).replace(/"\$(\d+)"/g, (_, $n) =>
      mapping(parseInt(matches[parseInt($n)]))
    )

    hue.setRoom(roomNo, hueStr)

    console.log(hueStr)
    return hueStr
  }
  return null
}
*/
