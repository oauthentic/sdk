# PHP client for OAuthentic API

## Purpose 

This library defines a class with several useful functions to simplify using the *O*Authentic API in PHP applications and especially to create a token from some well identified server and to retrieve it from client side.

## Use

### Get the client script from GitHub

See [source](https://github.com/gdorbes/oauthentic/blob/master/php/o9-client.php).

### Include the script in your PHP file and create an instance

This step requires an API key and its secret code that must be defined in the developer dashboard of the *O*Authentic [web app](https://oauthentic.com/app/).

```
// Include OAuthentic client
include "o9-client.php";

// Create o9 instance with Web App key and secret
$my_o9 = new o9("6743ae3748_my_key_3b846c73ffc99d", "36525e8959ee_my_secret_4dbcbc590");
```

PLEASE NOTE: If the IP address of the server which runs this script is not the one that you defined for your service in the [developer dashboard](https://oauthentic.com/app/), the request to the `/token/create` endpoint will fail.

### Run one of the following methods according to your requirements

#### post

This method performs a simple POST request. See example below to create an authentication token:

```
$token = $my_o9->post("https://api.oauthentic.com/token/create", array("key" => 6743ae3748_my_key_3b846c73ffc99d, "secret" => 36525e8959ee_my_secret_4dbcbc590" , "lifetime" => 10));
```

For further details about the *O*Authentic API, please consult [oauthentic.com](https://oauthentic.com).

#### meta

This method is useful to insert token data in some web app using a META tag. This is the default method used by the *O*Authentic JavaScript client to retrieve token data.

```
echo $my_o9->meta(2);
// Example of result:
// <META name="oauthentic-token" content="6743ae3748_my_key_3b846c73ffc99d, 6743ae3748_my_token_3b846c73c99d, 2020-05-13T11:28:17.744Z">
```

## END OF DOCUMENT