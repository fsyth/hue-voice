# Hue Voice
#### Voice control for Philips Hue in the Web Browser

This repository contains a class, Hue, that interfaces with Philips Hue lights from a web browser.

It also contains a class, HueCommand, that translates voice commands into state objects for use with Hue.

See the [documentation](https://fsyth.github.io/hue-voice/docs/) for help with using either of these classes.

A basic example webpage that voice controls Hue has been provided. Serve the `src` folder on your local network over HTTP to test it.

This allows Philips Hue lights to be controlled by voice, using the native Web Speech API. This API is very new, so currently only works in recent versions of Google Chrome. You will need to allow access to your microphone when prompted.

### Current Issues
The Hue class only work best when served over HTTP. Hopefully, it is possible to sort out all the cross-domain and HTTPS issues that occur when serving it from anywhere else.

Currently, you must manually specify a developer ID to access your Hue bridge. This can be obtained by following [this guide](https://www.developers.meethue.com/documentation/getting-started), but this process will soon be automated (well, mostly, you would still need to hit the button on the Hue Bridge).

Browsers. Just use Chrome.
