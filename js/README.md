# JavaScript client for OAuthentic API

## Purpose 

This library takes care of all the client side process to implement the *O*Authentic QR code-base authentication based on the  [api.oauthentic.com](https://api.oauthentic.com) REST API:

- Socket initialization
- QR code display with progress UI
- Secure exchange with *O*Authentic server and mobile
- Callbacks on completion

Form more details, please refer to [oauthentic.com](https://oauthentic.com).


## Requirements

This library requires Socket.io 2.1.1 for websocket communication. You can find it:

- in Socket.io [CDN](https://cdnjs.com/libraries/socket.io/2.1.1).
- in *O*Authentic [library](https://oauthentic.com/cdn/socket.io/socket.io.slim.min.js). 

JavaScript must be ES6 or higher.

## Installation

Download [o9-client.js](https://oauthentic.com/cdn/js/o9-client.js) from *O*Authentic or from this GitHub. 

## Use

### Default use 

See the example below:

```javascript
<!doctype html>
<head></head>
<body>
<div id="qr"></div>
<script src="https://oauthentic.com/cdn/socket.io/socket.io.slim.min.js"></script>
<script src="https://oauthentic.com/cdn/jd/o9-client.js"></script>
<script>
window.onload = function () {
    new OAuthentic().authent("qr",{
    key: "6743ae3748_my_key_3b846c73ffc99d",
    token: "6743ae3748_my_token_3b846c73c99d",
    expire: new Date("time in the near future e.g. 2mn")
    });
}
</script>
</body>
</html>
```

Parameters:

- `qr`the DIV ID where the QR-code will be displayed. Its width is always 174px. Its height is either 174px or 196px depending on the progress user interface is displayed or not (see options below).
- `key` is an authentication service key defined in the developer dashboard of the *O*Authentic [web app](https://oauthentic.com/app/). 
- `token` is a result of the `/token/create` API endpoint. See [oauthentic.com](https://oauthentic.com) and also the [PHP client](https://github.com/gdorbes/oauthentic/tree/master/php).
- `expire` is the token expire time. Authentication must be complete before this time.

### Simple use with the PHP client

If this client is used with the [PHP client](https://github.com/gdorbes/oauthentic/tree/master/php) or equivalent facility, the call is then simpler:

```javascript
new OAuthentic().authent("qr",{});
```

### Other options

Options and their default value:

```javascript
{
    // App key. May be set by META tag if any
    key: false,
    // App token. May be set by META tag if any
    token: false,
    // Token expire time. May be set by META tag if any
    expire: false,
    // Show progress UI: Add 22 pixels to container height
    progress: true,
    // QR side size in pixels
    side: 174,
    // Progress UI colors
    progressBack: "#09d",
    progressFore: "#f50",
    progressText: "#fff",
    // Notification when QR code is scanned, but biometrics may be required
    scanned: function () {
        console.log("Authentication progress (QR code has been scanned)");
    },
    // Callback when authentication is completed
    completed: function (tokenData) {
        console.log("Token final data:", tokenData);
    },
    // Notification when authentication is expired
    expired: function () {
        console.log("Callback on authentication expire");
    },
    // If not empty, the following parameter is a customized URL text to be displayed instead of a QR-code. Demo: https://oauthentic.com/mobile/
    mobile: ""
}
```


 
## END OF DOCUMENT
