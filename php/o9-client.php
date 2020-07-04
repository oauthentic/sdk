<?php

class o9
{

    // API server domain
    const API_DOMAIN = "https://api.oauthentic.com";

    /* -------------------------------------------------------------------------
     * @function  __construct
     * @description	To construct an instance
     * @param {string} $key - Service key
     * @param {string} $secret - Service secret
     * @return {object}
     */
    function __construct($key, $secret)
    {
        $this->serviceKey = $key;
        $this->serviceSecret = $secret;
    }

    /* -------------------------------------------------------------------------
     * @function post
     * @description	Simple post client
     * @param {string} $url - Server url
     * @param {array} $param - Parameter array
     * @return {array} => {string} code - Response code ("200" when no error)
     *                    {string} msg - Error message ("OK" when no error)
     *                    {string} data - JSON response string
     */
    function post($url, $param)
    {

        // Init call
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, http_build_query($param));

        // Call
        $json_response = curl_exec($curl);
        $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        curl_close($curl);

        // Response
        if ($status == "200")
            return json_decode($json_response, true);
        else
            return array("code" => $status, "msg" => "HTTP error", "data" => "");
    }

    /* -------------------------------------------------------------------------
     * @function meta
     * @description	Call the token OAuthentic API endpoint and return a META HTML tag named 'oauthentic-token' with content:
     *                  - either the application key + an access token + expiration date
     *                  - or an error message
     *              See /token API for details
     * @param {integer} $lifetime - Lifetime in minutes. Optional. Default value 10 minutes.
     * @return {string}
     */

    function meta($lifetime = 10)
    {

        // Init META tag
        $tag = '<META name="oauthentic-token" content="%content%">';

        // Obtain token from server
        $token = $this->post(self::API_DOMAIN . "/token/create", array("key" => $this->serviceKey, "secret" => $this->serviceSecret, "lifetime" => $lifetime));

        // Define meta content depending on error code
        if ($token["code"] != "200")
            return str_replace("%content%", "ERROR " . $token["code"] . ": " . $token["msg"], $tag);
        else
            return str_replace("%content%", $content = $this->serviceKey . ", " . $token["data"]["token"] . ", " . $token["data"]["expire"], $tag);
    }
}

/* =========================================================================
 * EoF
 * =========================================================================
 */
?>