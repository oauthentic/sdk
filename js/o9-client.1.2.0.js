/** -------------------------------------------------------------------
 * @function OAuthentic
 * @description OAuthentic constructor
 * @dependence ES6 promise and fetch
 * @param {object} opt - See default options below
 * @return {boolean}

 MIT License

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 * --------------------------------------------------------------------
 */
function OAuthentic(opt) {

    // Init authentication parameters
    this.key = false;
    this.token = false;
    this.expire = false;

    // Min QR user interface side size
    this.QRmin = 174;

    // Regular expressions
    this.rex = {
        token: new RegExp("^([0-9a-fA-F]{32})$")
    };

    /** --------------------------------------------------------------------
     * @function extend
     * @description Similar to jQuery extend.
     * @param {object} a - default property list
     * @param {object} b - specific property list
     * @return {object} a updated with b.
     */
    this.extend = function (a, b) {

        for (let key in b)
            if (b.hasOwnProperty(key))
                a[key] = b[key];
        return a;
    };

    /** --------------------------------------------------------------------
     * Default options
     */
    opt = this.extend({
        // Debug mode
        debug: true,
        // External console UI Id if any
        console: false,
        // Server URLs
        url: {
            api: "https://api.oauthentic.com",
            socket: "https://socket.oauthentic.com"
        }
    }, opt);

    /** --------------------------------------------------------------------
     * Check if ES6 API requirements are supported
     */
    let es6 = true;

    // Check if Fetch is supported
    if (!window.fetch) {
        console.log("🛡 OAuthentic error: This browser does not support ES6 Fetch API.");
        es6 = false;
    }

    // Check if Promise is supported
    if (typeof Promise === "undefined" || Promise.toString().indexOf("[native code]") === -1) {
        console.log("🛡 OAuthentic error: This browser does not support ES6 Promise API.");
        es6 = false;
    }

    // Stop on missing ES6 feature
    if (!es6) {
        return false;
    }

    this.debug = opt.debug;
    this.url = opt.url;

    /** --------------------------------------------------------------------
     * @function log
     * @description Console enabled by debug and console mode
     */

    this.log = function () {
        if (this.debug) {
            let time = new Date().toLocaleTimeString();
            let args = Array.prototype.concat.apply([time, "🛡"], arguments);
            console.log.apply(console, args);


            if (typeof opt.console === "string") {
                let log = document.getElementById(opt.console);
                log.insertAdjacentHTML("beforeend", "<div>" + args.map(function (arg) {
                    return (typeof arg === "object" ? JSON.stringify(arg, null, 2) : arg);
                }).join(" ") + "</div>");
                log.scrollTop = log.scrollHeight;
            }
        }
    };

    /** ---------------------------------------------------------------------------------
     * @function meta
     * @description Retrieve token data in META tag named "oauthentic-token"
     *              NOTE: This tag should be inserted on server side with data returned by
     *                    by the OAuthentic API endpoint /token/create
     * @return {object} Return false when required META tag is not found, otherwise:
     *                  - key: service key
     *                  - token: current token
     *                  - expire: token expire date
     */

    this.meta = function () {
        let meta = document.head.querySelector("meta[name='oauthentic-token']")

        // Stop if no META
        if (!meta) {
            this.log("META not found");
            return false;
        }

        // Stop if no META content
        meta = meta.content;
        if (!meta) {
            this.log("META content not found");
            return false;
        }

        // Otherwise set authentication parameters
        meta = meta.split(", ");
        return {
            key: this.key = meta[0],
            token: this.token = meta[1],
            expire: this.expire = new Date(meta[2])
        }
    };

    /** ---------------------------------------------------------------------------------
     * @function post
     * @description POST request based on standard fetch function
     * @param {string} endpoint - E.g. "/token/upgrade"
     * @param {object} params - E.g. {param1: "blahblah", param2: "blohbloh"}
     * @return {promise} See OAuthentic API documentation for response format
     */

    this.post = function (endpoint, params) {

        // Save this to do that
        let that = this;

        return new Promise(function (success, failure) {

            that.log("POST req:", endpoint, params);

            fetch(that.url.api + endpoint, {
                method: "post",
                headers: {
                    "Accept": "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(params)
            }).then(function (response) {
                return response.json();
            }).then(function (res) {
                if (typeof success === "function")
                    success(res);
            }).catch(function (err) {
                if (typeof failure === "function")
                    failure(err);
            });
        });
    };

    /** ---------------------------------------------------------------------------------
     * @function qr
     * @description Top level QR code method
     * @param {string} id - Element Id to insert the QR code. It should be a square i.e. width=height.
     * @param {string} token - Optional token. If not defined, this.token is used.
     */

    this.qr = function (id, token) {

        /** -------------------------------------------------------------
         * @function qrcode
         * @description https://github.com/kazuhikoarase/qrcode-generator
         * @param typeNumber 1 to 40
         * @param errorCorrectionLevel 'L','M','Q','H'
         */
        let qrcode = function (typeNumber, errorCorrectionLevel) {

            let PAD0 = 0xEC;
            let PAD1 = 0x11;
            let _typeNumber = typeNumber;
            let _errorCorrectionLevel = QRErrorCorrectionLevel[errorCorrectionLevel];
            let _modules = null;
            let _moduleCount = 0;
            let _dataCache = null;
            let _dataList = [];
            let _this = {};

            let makeImpl = function (test, maskPattern) {

                _moduleCount = _typeNumber * 4 + 17;
                _modules = function (moduleCount) {
                    let modules = new Array(moduleCount);
                    for (let row = 0; row < moduleCount; row += 1) {
                        modules[row] = new Array(moduleCount);
                        for (let col = 0; col < moduleCount; col += 1) {
                            modules[row][col] = null;
                        }
                    }
                    return modules;
                }(_moduleCount);

                setupPositionProbePattern(0, 0);
                setupPositionProbePattern(_moduleCount - 7, 0);
                setupPositionProbePattern(0, _moduleCount - 7);
                setupPositionAdjustPattern();
                setupTimingPattern();
                setupTypeInfo(test, maskPattern);

                if (_typeNumber >= 7) {
                    setupTypeNumber(test);
                }

                if (_dataCache == null) {
                    _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
                }

                mapData(_dataCache, maskPattern);
            };

            let setupPositionProbePattern = function (row, col) {

                for (let r = -1; r <= 7; r += 1) {

                    if (row + r <= -1 || _moduleCount <= row + r) continue;

                    for (let c = -1; c <= 7; c += 1) {

                        if (col + c <= -1 || _moduleCount <= col + c) continue;

                        if ((0 <= r && r <= 6 && (c === 0 || c === 6))
                            || (0 <= c && c <= 6 && (r === 0 || r === 6))
                            || (2 <= r && r <= 4 && 2 <= c && c <= 4)) {
                            _modules[row + r][col + c] = true;
                        } else {
                            _modules[row + r][col + c] = false;
                        }
                    }
                }
            };

            let getBestMaskPattern = function () {

                let minLostPoint = 0;
                let pattern = 0;

                for (let i = 0; i < 8; i += 1) {

                    makeImpl(true, i);

                    let lostPoint = QRUtil.getLostPoint(_this);

                    if (i === 0 || minLostPoint > lostPoint) {
                        minLostPoint = lostPoint;
                        pattern = i;
                    }
                }

                return pattern;
            };

            let setupTimingPattern = function () {

                for (let r = 8; r < _moduleCount - 8; r += 1) {
                    if (_modules[r][6] != null) {
                        continue;
                    }
                    _modules[r][6] = (r % 2 === 0);
                }

                for (let c = 8; c < _moduleCount - 8; c += 1) {
                    if (_modules[6][c] != null) {
                        continue;
                    }
                    _modules[6][c] = (c % 2 === 0);
                }
            };

            let setupPositionAdjustPattern = function () {

                let pos = QRUtil.getPatternPosition(_typeNumber);

                for (let i = 0; i < pos.length; i += 1) {

                    for (let j = 0; j < pos.length; j += 1) {

                        let row = pos[i];
                        let col = pos[j];

                        if (_modules[row][col] != null) {
                            continue;
                        }

                        for (let r = -2; r <= 2; r += 1) {

                            for (let c = -2; c <= 2; c += 1) {

                                if (r === -2 || r === 2 || c === -2 || c === 2
                                    || (r === 0 && c === 0)) {
                                    _modules[row + r][col + c] = true;
                                } else {
                                    _modules[row + r][col + c] = false;
                                }
                            }
                        }
                    }
                }
            };

            let setupTypeNumber = function (test) {

                let bits = QRUtil.getBCHTypeNumber(_typeNumber);

                for (let i = 0; i < 18; i += 1) {
                    _modules[Math.floor(i / 3)][i % 3 + _moduleCount - 8 - 3] = (!test && ((bits >> i) & 1) === 1);
                }

                for (let i = 0; i < 18; i += 1) {
                    _modules[i % 3 + _moduleCount - 8 - 3][Math.floor(i / 3)] = (!test && ((bits >> i) & 1) === 1);
                }
            };

            let setupTypeInfo = function (test, maskPattern) {

                let data = (_errorCorrectionLevel << 3) | maskPattern;
                let bits = QRUtil.getBCHTypeInfo(data);

                // vertical
                for (let i = 0; i < 15; i += 1) {

                    let mod = (!test && ((bits >> i) & 1) === 1);

                    if (i < 6) {
                        _modules[i][8] = mod;
                    } else if (i < 8) {
                        _modules[i + 1][8] = mod;
                    } else {
                        _modules[_moduleCount - 15 + i][8] = mod;
                    }
                }

                // horizontal
                for (let i = 0; i < 15; i += 1) {

                    let mod = (!test && ((bits >> i) & 1) === 1);

                    if (i < 8) {
                        _modules[8][_moduleCount - i - 1] = mod;
                    } else if (i < 9) {
                        _modules[8][15 - i - 1 + 1] = mod;
                    } else {
                        _modules[8][15 - i - 1] = mod;
                    }
                }

                // fixed module
                _modules[_moduleCount - 8][8] = (!test);
            };

            let mapData = function (data, maskPattern) {

                let inc = -1;
                let row = _moduleCount - 1;
                let bitIndex = 7;
                let byteIndex = 0;
                let maskFunc = QRUtil.getMaskFunction(maskPattern);

                for (let col = _moduleCount - 1; col > 0; col -= 2) {

                    if (col === 6) col -= 1;

                    while (true) {

                        for (let c = 0; c < 2; c += 1) {

                            if (_modules[row][col - c] == null) {

                                let dark = false;

                                if (byteIndex < data.length) {
                                    dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
                                }

                                let mask = maskFunc(row, col - c);

                                if (mask) {
                                    dark = !dark;
                                }

                                _modules[row][col - c] = dark;
                                bitIndex -= 1;

                                if (bitIndex === -1) {
                                    byteIndex += 1;
                                    bitIndex = 7;
                                }
                            }
                        }

                        row += inc;

                        if (row < 0 || _moduleCount <= row) {
                            row -= inc;
                            inc = -inc;
                            break;
                        }
                    }
                }
            };

            let createBytes = function (buffer, rsBlocks) {

                let offset = 0;

                let maxDcCount = 0;
                let maxEcCount = 0;

                let dcdata = new Array(rsBlocks.length);
                let ecdata = new Array(rsBlocks.length);

                for (let r = 0; r < rsBlocks.length; r += 1) {

                    let dcCount = rsBlocks[r].dataCount;
                    let ecCount = rsBlocks[r].totalCount - dcCount;

                    maxDcCount = Math.max(maxDcCount, dcCount);
                    maxEcCount = Math.max(maxEcCount, ecCount);

                    dcdata[r] = new Array(dcCount);

                    for (let i = 0; i < dcdata[r].length; i += 1) {
                        dcdata[r][i] = 0xff & buffer.getBuffer()[i + offset];
                    }
                    offset += dcCount;

                    let rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
                    let rawPoly = qrPolynomial(dcdata[r], rsPoly.getLength() - 1);

                    let modPoly = rawPoly.mod(rsPoly);
                    ecdata[r] = new Array(rsPoly.getLength() - 1);
                    for (let i = 0; i < ecdata[r].length; i += 1) {
                        let modIndex = i + modPoly.getLength() - ecdata[r].length;
                        ecdata[r][i] = (modIndex >= 0) ? modPoly.getAt(modIndex) : 0;
                    }
                }

                let totalCodeCount = 0;
                for (let i = 0; i < rsBlocks.length; i += 1) {
                    totalCodeCount += rsBlocks[i].totalCount;
                }

                let data = new Array(totalCodeCount);
                let index = 0;

                for (let i = 0; i < maxDcCount; i += 1) {
                    for (let r = 0; r < rsBlocks.length; r += 1) {
                        if (i < dcdata[r].length) {
                            data[index] = dcdata[r][i];
                            index += 1;
                        }
                    }
                }

                for (let i = 0; i < maxEcCount; i += 1) {
                    for (let r = 0; r < rsBlocks.length; r += 1) {
                        if (i < ecdata[r].length) {
                            data[index] = ecdata[r][i];
                            index += 1;
                        }
                    }
                }

                return data;
            };

            let createData = function (typeNumber, errorCorrectionLevel, dataList) {

                let rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);

                let buffer = qrBitBuffer();

                for (let i = 0; i < dataList.length; i += 1) {
                    let data = dataList[i];
                    buffer.put(data.getMode(), 4);
                    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
                    data.write(buffer);
                }

                // calc num max data.
                let totalDataCount = 0;
                for (let i = 0; i < rsBlocks.length; i += 1) {
                    totalDataCount += rsBlocks[i].dataCount;
                }

                if (buffer.getLengthInBits() > totalDataCount * 8) {
                    throw 'code length overflow. ('
                    + buffer.getLengthInBits()
                    + '>'
                    + totalDataCount * 8
                    + ')';
                }

                // end code
                if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) {
                    buffer.put(0, 4);
                }

                // padding
                while (buffer.getLengthInBits() % 8 !== 0) {
                    buffer.putBit(false);
                }

                // padding
                while (true) {

                    if (buffer.getLengthInBits() >= totalDataCount * 8) {
                        break;
                    }
                    buffer.put(PAD0, 8);

                    if (buffer.getLengthInBits() >= totalDataCount * 8) {
                        break;
                    }
                    buffer.put(PAD1, 8);
                }

                return createBytes(buffer, rsBlocks);
            };

            _this.addData = function (data) {

                _dataList.push(qr8BitByte(data));
                _dataCache = null;
            };

            _this.isDark = function (row, col) {
                if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
                    throw row + ',' + col;
                }
                return _modules[row][col];
            };

            _this.getModuleCount = function () {
                return _moduleCount;
            };

            _this.make = function () {
                if (_typeNumber < 1) {
                    let typeNumber = 1;

                    for (; typeNumber < 40; typeNumber++) {
                        let rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
                        let buffer = qrBitBuffer();

                        for (let i = 0; i < _dataList.length; i++) {
                            let data = _dataList[i];
                            buffer.put(data.getMode(), 4);
                            buffer.put(data.getLength(), QRUtil.getLengthInBits(data.getMode(), typeNumber));
                            data.write(buffer);
                        }

                        let totalDataCount = 0;
                        for (let i = 0; i < rsBlocks.length; i++) {
                            totalDataCount += rsBlocks[i].dataCount;
                        }

                        if (buffer.getLengthInBits() <= totalDataCount * 8) {
                            break;
                        }
                    }

                    _typeNumber = typeNumber;
                }

                makeImpl(false, getBestMaskPattern());
            };

            _this.createTableTag = function (cellSize, margin) {

                cellSize = cellSize || 2;
                margin = (typeof margin == 'undefined') ? cellSize * 4 : margin;

                let qrHtml = '<table style="width: 100%;height: 100%;border-collapse: collapse;border-spacing: 0;table-layout: fixed;">';
                qrHtml += '<tbody>';

                for (let r = 0; r < _this.getModuleCount(); r += 1) {

                    qrHtml += '<tr>';

                    for (let c = 0; c < _this.getModuleCount(); c += 1) {
                        qrHtml += '<td style="background:';
                        qrHtml += _this.isDark(r, c) ? 'black' : 'white';
                        qrHtml += '"/>';
                    }

                    qrHtml += '</tr>';
                }

                qrHtml += '</tbody>';
                qrHtml += '</table>';

                return qrHtml;
            };

            return _this;
        };

        //---------------------------------------------------------------
        // qrcode.stringToBytes
        //---------------------------------------------------------------
        qrcode.stringToBytesFuncs = {
            'default': function (s) {
                let bytes = [];
                for (let i = 0; i < s.length; i += 1) {
                    let c = s.charCodeAt(i);
                    bytes.push(c & 0xff);
                }
                return bytes;
            }
        };
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['default'];


        //---------------------------------------------------------------
        // QRMode
        //---------------------------------------------------------------
        let QRMode = {
            MODE_NUMBER: 1 << 0,
            MODE_ALPHA_NUM: 1 << 1,
            MODE_8BIT_BYTE: 1 << 2,
            MODE_KANJI: 1 << 3
        };

        //---------------------------------------------------------------
        // QRErrorCorrectionLevel
        //---------------------------------------------------------------
        let QRErrorCorrectionLevel = {
            L: 1,
            M: 0,
            Q: 3,
            H: 2
        };

        //---------------------------------------------------------------
        // QRMaskPattern
        //---------------------------------------------------------------
        let QRMaskPattern = {
            PATTERN000: 0,
            PATTERN001: 1,
            PATTERN010: 2,
            PATTERN011: 3,
            PATTERN100: 4,
            PATTERN101: 5,
            PATTERN110: 6,
            PATTERN111: 7
        };

        //---------------------------------------------------------------
        // QRUtil
        //---------------------------------------------------------------
        let QRUtil = function () {

            let PATTERN_POSITION_TABLE = [
                [],
                [6, 18],
                [6, 22],
                [6, 26],
                [6, 30],
                [6, 34],
                [6, 22, 38],
                [6, 24, 42],
                [6, 26, 46],
                [6, 28, 50],
                [6, 30, 54],
                [6, 32, 58],
                [6, 34, 62],
                [6, 26, 46, 66],
                [6, 26, 48, 70],
                [6, 26, 50, 74],
                [6, 30, 54, 78],
                [6, 30, 56, 82],
                [6, 30, 58, 86],
                [6, 34, 62, 90],
                [6, 28, 50, 72, 94],
                [6, 26, 50, 74, 98],
                [6, 30, 54, 78, 102],
                [6, 28, 54, 80, 106],
                [6, 32, 58, 84, 110],
                [6, 30, 58, 86, 114],
                [6, 34, 62, 90, 118],
                [6, 26, 50, 74, 98, 122],
                [6, 30, 54, 78, 102, 126],
                [6, 26, 52, 78, 104, 130],
                [6, 30, 56, 82, 108, 134],
                [6, 34, 60, 86, 112, 138],
                [6, 30, 58, 86, 114, 142],
                [6, 34, 62, 90, 118, 146],
                [6, 30, 54, 78, 102, 126, 150],
                [6, 24, 50, 76, 102, 128, 154],
                [6, 28, 54, 80, 106, 132, 158],
                [6, 32, 58, 84, 110, 136, 162],
                [6, 26, 54, 82, 110, 138, 166],
                [6, 30, 58, 86, 114, 142, 170]
            ];
            let G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
            let G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
            let G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);

            let _this = {};

            let getBCHDigit = function (data) {
                let digit = 0;
                while (data !== 0) {
                    digit += 1;
                    data >>>= 1;
                }
                return digit;
            };

            _this.getBCHTypeInfo = function (data) {
                let d = data << 10;
                while (getBCHDigit(d) - getBCHDigit(G15) >= 0) {
                    d ^= (G15 << (getBCHDigit(d) - getBCHDigit(G15)));
                }
                return ((data << 10) | d) ^ G15_MASK;
            };

            _this.getBCHTypeNumber = function (data) {
                let d = data << 12;
                while (getBCHDigit(d) - getBCHDigit(G18) >= 0) {
                    d ^= (G18 << (getBCHDigit(d) - getBCHDigit(G18)));
                }
                return (data << 12) | d;
            };

            _this.getPatternPosition = function (typeNumber) {
                return PATTERN_POSITION_TABLE[typeNumber - 1];
            };

            _this.getMaskFunction = function (maskPattern) {

                switch (maskPattern) {

                    case QRMaskPattern.PATTERN000 :
                        return function (i, j) {
                            return (i + j) % 2 === 0;
                        };
                    case QRMaskPattern.PATTERN001 :
                        return function (i, j) {
                            return i % 2 === 0;
                        };
                    case QRMaskPattern.PATTERN010 :
                        return function (i, j) {
                            return j % 3 === 0;
                        };
                    case QRMaskPattern.PATTERN011 :
                        return function (i, j) {
                            return (i + j) % 3 === 0;
                        };
                    case QRMaskPattern.PATTERN100 :
                        return function (i, j) {
                            return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
                        };
                    case QRMaskPattern.PATTERN101 :
                        return function (i, j) {
                            return (i * j) % 2 + (i * j) % 3 === 0;
                        };
                    case QRMaskPattern.PATTERN110 :
                        return function (i, j) {
                            return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
                        };
                    case QRMaskPattern.PATTERN111 :
                        return function (i, j) {
                            return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
                        };

                    default :
                        throw 'bad maskPattern:' + maskPattern;
                }
            };

            _this.getErrorCorrectPolynomial = function (errorCorrectLength) {
                let a = qrPolynomial([1], 0);
                for (let i = 0; i < errorCorrectLength; i += 1) {
                    a = a.multiply(qrPolynomial([1, QRMath.gexp(i)], 0));
                }
                return a;
            };

            _this.getLengthInBits = function (mode, type) {

                if (1 <= type && type < 10) {

                    // 1 - 9
                    switch (mode) {
                        case QRMode.MODE_NUMBER    :
                            return 10;
                        case QRMode.MODE_ALPHA_NUM :
                            return 9;
                        case QRMode.MODE_8BIT_BYTE :
                            return 8;
                        case QRMode.MODE_KANJI     :
                            return 8;
                        default :
                            throw 'mode:' + mode;
                    }

                } else if (type < 27) {

                    // 10 - 26
                    switch (mode) {
                        case QRMode.MODE_NUMBER    :
                            return 12;
                        case QRMode.MODE_ALPHA_NUM :
                            return 11;
                        case QRMode.MODE_8BIT_BYTE :
                            return 16;
                        case QRMode.MODE_KANJI     :
                            return 10;
                        default :
                            throw 'mode:' + mode;
                    }

                } else if (type < 41) {

                    // 27 - 40
                    switch (mode) {
                        case QRMode.MODE_NUMBER    :
                            return 14;
                        case QRMode.MODE_ALPHA_NUM :
                            return 13;
                        case QRMode.MODE_8BIT_BYTE :
                            return 16;
                        case QRMode.MODE_KANJI     :
                            return 12;
                        default :
                            throw 'mode:' + mode;
                    }

                } else {
                    throw 'type:' + type;
                }
            };

            _this.getLostPoint = function (qrcode) {

                let moduleCount = qrcode.getModuleCount();

                let lostPoint = 0;

                // LEVEL1
                for (let row = 0; row < moduleCount; row += 1) {
                    for (let col = 0; col < moduleCount; col += 1) {

                        let sameCount = 0;
                        let dark = qrcode.isDark(row, col);

                        for (let r = -1; r <= 1; r += 1) {

                            if (row + r < 0 || moduleCount <= row + r) {
                                continue;
                            }

                            for (let c = -1; c <= 1; c += 1) {

                                if (col + c < 0 || moduleCount <= col + c) {
                                    continue;
                                }

                                if (r === 0 && c === 0) {
                                    continue;
                                }

                                if (dark === qrcode.isDark(row + r, col + c)) {
                                    sameCount += 1;
                                }
                            }
                        }

                        if (sameCount > 5) {
                            lostPoint += (3 + sameCount - 5);
                        }
                    }
                }

                // LEVEL2
                for (let row = 0; row < moduleCount - 1; row += 1) {
                    for (let col = 0; col < moduleCount - 1; col += 1) {
                        let count = 0;
                        if (qrcode.isDark(row, col)) count += 1;
                        if (qrcode.isDark(row + 1, col)) count += 1;
                        if (qrcode.isDark(row, col + 1)) count += 1;
                        if (qrcode.isDark(row + 1, col + 1)) count += 1;
                        if (count === 0 || count === 4) {
                            lostPoint += 3;
                        }
                    }
                }

                // LEVEL3
                for (let row = 0; row < moduleCount; row += 1) {
                    for (let col = 0; col < moduleCount - 6; col += 1) {
                        if (qrcode.isDark(row, col)
                            && !qrcode.isDark(row, col + 1)
                            && qrcode.isDark(row, col + 2)
                            && qrcode.isDark(row, col + 3)
                            && qrcode.isDark(row, col + 4)
                            && !qrcode.isDark(row, col + 5)
                            && qrcode.isDark(row, col + 6)) {
                            lostPoint += 40;
                        }
                    }
                }

                for (let col = 0; col < moduleCount; col += 1) {
                    for (let row = 0; row < moduleCount - 6; row += 1) {
                        if (qrcode.isDark(row, col)
                            && !qrcode.isDark(row + 1, col)
                            && qrcode.isDark(row + 2, col)
                            && qrcode.isDark(row + 3, col)
                            && qrcode.isDark(row + 4, col)
                            && !qrcode.isDark(row + 5, col)
                            && qrcode.isDark(row + 6, col)) {
                            lostPoint += 40;
                        }
                    }
                }

                // LEVEL4
                let darkCount = 0;

                for (let col = 0; col < moduleCount; col += 1) {
                    for (let row = 0; row < moduleCount; row += 1) {
                        if (qrcode.isDark(row, col)) {
                            darkCount += 1;
                        }
                    }
                }

                let ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
                lostPoint += ratio * 10;

                return lostPoint;
            };

            return _this;
        }();

        //---------------------------------------------------------------
        // QRMath
        //---------------------------------------------------------------
        let QRMath = function () {

            let EXP_TABLE = new Array(256);
            let LOG_TABLE = new Array(256);

            // initialize tables
            for (let i = 0; i < 8; i += 1) {
                EXP_TABLE[i] = 1 << i;
            }
            for (let i = 8; i < 256; i += 1) {
                EXP_TABLE[i] = EXP_TABLE[i - 4]
                    ^ EXP_TABLE[i - 5]
                    ^ EXP_TABLE[i - 6]
                    ^ EXP_TABLE[i - 8];
            }
            for (let i = 0; i < 255; i += 1) {
                LOG_TABLE[EXP_TABLE[i]] = i;
            }

            let _this = {};

            _this.glog = function (n) {

                if (n < 1) {
                    throw 'glog(' + n + ')';
                }

                return LOG_TABLE[n];
            };

            _this.gexp = function (n) {

                while (n < 0) {
                    n += 255;
                }

                while (n >= 256) {
                    n -= 255;
                }

                return EXP_TABLE[n];
            };

            return _this;
        }();

        //---------------------------------------------------------------
        // qrPolynomial
        //---------------------------------------------------------------
        function qrPolynomial(num, shift) {

            if (typeof num.length == 'undefined') {
                throw num.length + '/' + shift;
            }

            let _num = function () {
                let offset = 0;
                while (offset < num.length && num[offset] === 0) {
                    offset += 1;
                }
                let _num = new Array(num.length - offset + shift);
                for (let i = 0; i < num.length - offset; i += 1) {
                    _num[i] = num[i + offset];
                }
                return _num;
            }();

            let _this = {};

            _this.getAt = function (index) {
                return _num[index];
            };

            _this.getLength = function () {
                return _num.length;
            };

            _this.multiply = function (e) {

                let num = new Array(_this.getLength() + e.getLength() - 1);

                for (let i = 0; i < _this.getLength(); i += 1) {
                    for (let j = 0; j < e.getLength(); j += 1) {
                        num[i + j] ^= QRMath.gexp(QRMath.glog(_this.getAt(i)) + QRMath.glog(e.getAt(j)));
                    }
                }

                return qrPolynomial(num, 0);
            };

            _this.mod = function (e) {

                if (_this.getLength() - e.getLength() < 0) {
                    return _this;
                }

                let ratio = QRMath.glog(_this.getAt(0)) - QRMath.glog(e.getAt(0));

                let num = new Array(_this.getLength());
                for (let i = 0; i < _this.getLength(); i += 1) {
                    num[i] = _this.getAt(i);
                }

                for (let i = 0; i < e.getLength(); i += 1) {
                    num[i] ^= QRMath.gexp(QRMath.glog(e.getAt(i)) + ratio);
                }

                // recursive call
                return qrPolynomial(num, 0).mod(e);
            };

            return _this;
        }

        //---------------------------------------------------------------
        // QRRSBlock
        //---------------------------------------------------------------
        let QRRSBlock = function () {

            let RS_BLOCK_TABLE = [

                // L
                // M
                // Q
                // H

                // 1
                [1, 26, 19],
                [1, 26, 16],
                [1, 26, 13],
                [1, 26, 9],

                // 2
                [1, 44, 34],
                [1, 44, 28],
                [1, 44, 22],
                [1, 44, 16],

                // 3
                [1, 70, 55],
                [1, 70, 44],
                [2, 35, 17],
                [2, 35, 13],

                // 4
                [1, 100, 80],
                [2, 50, 32],
                [2, 50, 24],
                [4, 25, 9],

                // 5
                [1, 134, 108],
                [2, 67, 43],
                [2, 33, 15, 2, 34, 16],
                [2, 33, 11, 2, 34, 12],

                // 6
                [2, 86, 68],
                [4, 43, 27],
                [4, 43, 19],
                [4, 43, 15],

                // 7
                [2, 98, 78],
                [4, 49, 31],
                [2, 32, 14, 4, 33, 15],
                [4, 39, 13, 1, 40, 14],

                // 8
                [2, 121, 97],
                [2, 60, 38, 2, 61, 39],
                [4, 40, 18, 2, 41, 19],
                [4, 40, 14, 2, 41, 15],

                // 9
                [2, 146, 116],
                [3, 58, 36, 2, 59, 37],
                [4, 36, 16, 4, 37, 17],
                [4, 36, 12, 4, 37, 13],

                // 10
                [2, 86, 68, 2, 87, 69],
                [4, 69, 43, 1, 70, 44],
                [6, 43, 19, 2, 44, 20],
                [6, 43, 15, 2, 44, 16],

                // 11
                [4, 101, 81],
                [1, 80, 50, 4, 81, 51],
                [4, 50, 22, 4, 51, 23],
                [3, 36, 12, 8, 37, 13],

                // 12
                [2, 116, 92, 2, 117, 93],
                [6, 58, 36, 2, 59, 37],
                [4, 46, 20, 6, 47, 21],
                [7, 42, 14, 4, 43, 15],

                // 13
                [4, 133, 107],
                [8, 59, 37, 1, 60, 38],
                [8, 44, 20, 4, 45, 21],
                [12, 33, 11, 4, 34, 12],

                // 14
                [3, 145, 115, 1, 146, 116],
                [4, 64, 40, 5, 65, 41],
                [11, 36, 16, 5, 37, 17],
                [11, 36, 12, 5, 37, 13],

                // 15
                [5, 109, 87, 1, 110, 88],
                [5, 65, 41, 5, 66, 42],
                [5, 54, 24, 7, 55, 25],
                [11, 36, 12, 7, 37, 13],

                // 16
                [5, 122, 98, 1, 123, 99],
                [7, 73, 45, 3, 74, 46],
                [15, 43, 19, 2, 44, 20],
                [3, 45, 15, 13, 46, 16],

                // 17
                [1, 135, 107, 5, 136, 108],
                [10, 74, 46, 1, 75, 47],
                [1, 50, 22, 15, 51, 23],
                [2, 42, 14, 17, 43, 15],

                // 18
                [5, 150, 120, 1, 151, 121],
                [9, 69, 43, 4, 70, 44],
                [17, 50, 22, 1, 51, 23],
                [2, 42, 14, 19, 43, 15],

                // 19
                [3, 141, 113, 4, 142, 114],
                [3, 70, 44, 11, 71, 45],
                [17, 47, 21, 4, 48, 22],
                [9, 39, 13, 16, 40, 14],

                // 20
                [3, 135, 107, 5, 136, 108],
                [3, 67, 41, 13, 68, 42],
                [15, 54, 24, 5, 55, 25],
                [15, 43, 15, 10, 44, 16],

                // 21
                [4, 144, 116, 4, 145, 117],
                [17, 68, 42],
                [17, 50, 22, 6, 51, 23],
                [19, 46, 16, 6, 47, 17],

                // 22
                [2, 139, 111, 7, 140, 112],
                [17, 74, 46],
                [7, 54, 24, 16, 55, 25],
                [34, 37, 13],

                // 23
                [4, 151, 121, 5, 152, 122],
                [4, 75, 47, 14, 76, 48],
                [11, 54, 24, 14, 55, 25],
                [16, 45, 15, 14, 46, 16],

                // 24
                [6, 147, 117, 4, 148, 118],
                [6, 73, 45, 14, 74, 46],
                [11, 54, 24, 16, 55, 25],
                [30, 46, 16, 2, 47, 17],

                // 25
                [8, 132, 106, 4, 133, 107],
                [8, 75, 47, 13, 76, 48],
                [7, 54, 24, 22, 55, 25],
                [22, 45, 15, 13, 46, 16],

                // 26
                [10, 142, 114, 2, 143, 115],
                [19, 74, 46, 4, 75, 47],
                [28, 50, 22, 6, 51, 23],
                [33, 46, 16, 4, 47, 17],

                // 27
                [8, 152, 122, 4, 153, 123],
                [22, 73, 45, 3, 74, 46],
                [8, 53, 23, 26, 54, 24],
                [12, 45, 15, 28, 46, 16],

                // 28
                [3, 147, 117, 10, 148, 118],
                [3, 73, 45, 23, 74, 46],
                [4, 54, 24, 31, 55, 25],
                [11, 45, 15, 31, 46, 16],

                // 29
                [7, 146, 116, 7, 147, 117],
                [21, 73, 45, 7, 74, 46],
                [1, 53, 23, 37, 54, 24],
                [19, 45, 15, 26, 46, 16],

                // 30
                [5, 145, 115, 10, 146, 116],
                [19, 75, 47, 10, 76, 48],
                [15, 54, 24, 25, 55, 25],
                [23, 45, 15, 25, 46, 16],

                // 31
                [13, 145, 115, 3, 146, 116],
                [2, 74, 46, 29, 75, 47],
                [42, 54, 24, 1, 55, 25],
                [23, 45, 15, 28, 46, 16],

                // 32
                [17, 145, 115],
                [10, 74, 46, 23, 75, 47],
                [10, 54, 24, 35, 55, 25],
                [19, 45, 15, 35, 46, 16],

                // 33
                [17, 145, 115, 1, 146, 116],
                [14, 74, 46, 21, 75, 47],
                [29, 54, 24, 19, 55, 25],
                [11, 45, 15, 46, 46, 16],

                // 34
                [13, 145, 115, 6, 146, 116],
                [14, 74, 46, 23, 75, 47],
                [44, 54, 24, 7, 55, 25],
                [59, 46, 16, 1, 47, 17],

                // 35
                [12, 151, 121, 7, 152, 122],
                [12, 75, 47, 26, 76, 48],
                [39, 54, 24, 14, 55, 25],
                [22, 45, 15, 41, 46, 16],

                // 36
                [6, 151, 121, 14, 152, 122],
                [6, 75, 47, 34, 76, 48],
                [46, 54, 24, 10, 55, 25],
                [2, 45, 15, 64, 46, 16],

                // 37
                [17, 152, 122, 4, 153, 123],
                [29, 74, 46, 14, 75, 47],
                [49, 54, 24, 10, 55, 25],
                [24, 45, 15, 46, 46, 16],

                // 38
                [4, 152, 122, 18, 153, 123],
                [13, 74, 46, 32, 75, 47],
                [48, 54, 24, 14, 55, 25],
                [42, 45, 15, 32, 46, 16],

                // 39
                [20, 147, 117, 4, 148, 118],
                [40, 75, 47, 7, 76, 48],
                [43, 54, 24, 22, 55, 25],
                [10, 45, 15, 67, 46, 16],

                // 40
                [19, 148, 118, 6, 149, 119],
                [18, 75, 47, 31, 76, 48],
                [34, 54, 24, 34, 55, 25],
                [20, 45, 15, 61, 46, 16]
            ];

            let qrRSBlock = function (totalCount, dataCount) {
                let _this = {};
                _this.totalCount = totalCount;
                _this.dataCount = dataCount;
                return _this;
            };

            let _this = {};

            let getRsBlockTable = function (typeNumber, errorCorrectionLevel) {

                switch (errorCorrectionLevel) {
                    case QRErrorCorrectionLevel.L :
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4];
                    case QRErrorCorrectionLevel.M :
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
                    case QRErrorCorrectionLevel.Q :
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
                    case QRErrorCorrectionLevel.H :
                        return RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
                    default :
                        return undefined;
                }
            };

            _this.getRSBlocks = function (typeNumber, errorCorrectionLevel) {

                let rsBlock = getRsBlockTable(typeNumber, errorCorrectionLevel);

                if (typeof rsBlock == 'undefined') {
                    throw 'bad rs block @ typeNumber:' + typeNumber +
                    '/errorCorrectionLevel:' + errorCorrectionLevel;
                }

                let length = rsBlock.length / 3;

                let list = [];

                for (let i = 0; i < length; i += 1) {

                    let count = rsBlock[i * 3];
                    let totalCount = rsBlock[i * 3 + 1];
                    let dataCount = rsBlock[i * 3 + 2];

                    for (let j = 0; j < count; j += 1) {
                        list.push(qrRSBlock(totalCount, dataCount));
                    }
                }

                return list;
            };

            return _this;
        }();


        //---------------------------------------------------------------
        // qrBitBuffer
        //---------------------------------------------------------------
        let qrBitBuffer = function () {

            let _buffer = [];
            let _length = 0;

            let _this = {};

            _this.getBuffer = function () {
                return _buffer;
            };

            _this.getAt = function (index) {
                let bufIndex = Math.floor(index / 8);
                return ((_buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1;
            };

            _this.put = function (num, length) {
                for (let i = 0; i < length; i += 1) {
                    _this.putBit(((num >>> (length - i - 1)) & 1) === 1);
                }
            };

            _this.getLengthInBits = function () {
                return _length;
            };

            _this.putBit = function (bit) {

                let bufIndex = Math.floor(_length / 8);
                if (_buffer.length <= bufIndex) {
                    _buffer.push(0);
                }

                if (bit) {
                    _buffer[bufIndex] |= (0x80 >>> (_length % 8));
                }

                _length += 1;
            };

            return _this;
        };

        //---------------------------------------------------------------
        // qr8BitByte
        //---------------------------------------------------------------
        let qr8BitByte = function (data) {

            let _mode = QRMode.MODE_8BIT_BYTE;
            let _data = data;
            let _bytes = qrcode.stringToBytes(data);

            let _this = {};

            _this.getMode = function () {
                return _mode;
            };

            _this.getLength = function (buffer) {
                return _bytes.length;
            };

            _this.write = function (buffer) {
                for (let i = 0; i < _bytes.length; i += 1) {
                    buffer.put(_bytes[i], 8);
                }
            };

            return _this;
        };


        //---------------------------------------------------------------
        // Top level
        //---------------------------------------------------------------

        // If not provided, set default code value with current token
        if (!token) {
            token = this.token;
        }

        // Return false if token is not valid
        if (!this.rex.token.test(token)) {
            this.log("Invalid token:", (token ? token : "Not found"));
            return false;
        }

        // Return false if element does not exist
        let elt = document.getElementById(id);
        if (!elt) {
            this.log("Undefined element ID:", id);
            return false;
        }

        if (elt.clientWidth !== elt.clientHeight) {
            this.log("QR code user interface is not a square:", elt.clientWidth, "x", elt.clientHeight);
            return false;
        }

        if (elt.clientWidth < this.QRmin) {
            this.log("QR code user interface is too small (", elt.clientWidth, "x", elt.clientHeight, "), side size value should be >", this.QRmin);
            return false;
        }

        // Init QR code data
        let qr = qrcode(0, "Q");

        // Create QR code for token and Return false on error when creating QR code
        try {
            qr.addData(token);
        } catch (err) {
            this.log(err);
            return false;
        }
        qr.make();

        // Insert QR code as a table in element defined by its id and adjust its style
        elt.innerHTML = qr.createTableTag();
        this.log("QR code display completed");
        return true
    };

    /** ---------------------------------------------------------------------------------
     * @function socketStart
     * @description Init socket client
     * @param {function} scanned
     * @param {function} completed
     */

    this.socketStart = function (scanned, completed) {

        let that = this;

        let initSocket = function () {

            that.log("Socket initialization started");
            that.socket = io(that.url.socket, {
                secure: true,
                forceNew: true,
                transports: ['websocket']
            });
            that.socket.on('connect', function () {
                that.log("➁ Socket client connected")
            });
            that.socket.on('disconnect', function () {
                that.log("Socket disconnect")
            });
            that.socket.on('connect_error', function () {
                that.log("Socket error")
            });

            // Start listening socket for authentication
            that.socket.on("authent:" + that.token, function (msg) {

                // Progress notification
                if (msg.substr(0, 8) === "progress") {
                    scanned();
                    return;
                }

                // Complete notification
                if (msg.substr(0, 8) === "complete") {
                    that.log("➃ Authentication complete (including biometric checking if any)")
                    that.post("/token/read", {
                        key: that.key,
                        token: that.token
                    }).then(completed);
                }
            });
        };

        if (typeof io === "function") {
            initSocket()
        } else {
            that.log("Socket script loading error:", err);
        }
    };

    /** ---------------------------------------------------------------------------------
     * @function socketStop
     * @description Emit terminate event if socket still exist and connected
     */
    this.socketStop = function () {

        if (this.socket && this.socket.connected)
            this.socket.emit("terminate");
    };

    /** ---------------------------------------------------------------------------------
     * @function authent
     * @description Manage the complete authentication process from client side
     * @param {string} id - Element ID to display QRcode
     * @param {object} opt - See default values below
     */

    this.authent = function (id, opt) {

        // Default options
        opt = this.extend({
            // App key
            key: false,
            // App token
            token: false,
            // Token expire time
            expire: false,
            //  When mobile string is not empty, QR content is replaced by a customized URL with the text defined by the string
            mobile: "",
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

                that.log("➂ Authentication progress (QR code has been scanned)");
            },
            // Callback when authentication is completed
            completed: function (tokenData) {
            },
            // Callback when authentication is expired
            expired: function () {
            }
        }, opt);

        // Reference object 'this' to use it within embedded functions
        let that = this;

        // Init progress UI object
        let ui = {
            container: document.getElementById(id)
        };
        ui.container.style.width = opt.side + "px";
        ui.container.style.height = opt.side + "px";

        // Retrieve authentication parameters in META data if any
        this.meta();

        // Overwrite authentication parameters with optional parameters if any
        this.key = (opt.key ? opt.key : this.key);
        this.token = (opt.token ? opt.token : this.token);
        this.expire = (opt.expire ? opt.expire : this.expire);

        // Check if key is valid
        if (!this.rex.token.test(this.key)) {
            this.log("App key is not valid:", (this.key ? this.key : "Not found"));
            return;
        }

        // Check if token is valid
        if (!this.rex.token.test(this.token)) {
            this.log("App token is not valid:", (this.token ? this.token : "Not found"));
            return;
        }


        // Check if expire date is valid
        if (!(this.expire instanceof Date)) {
            this.log("App expire is not valid:", (this.expire ? this.expire : "Not found"));
            return;
        }
        this.log("➀ Token", this.token, "with key", this.key, "expires at", this.expire.toLocaleTimeString());

        // QR code if any
        if (!opt.mobile) {
            // Display QR code in element defined by its ID
            if (!this.qr(id)) {
                return;
            }
        }
        // Mobile text
        else {
            let urlUI = document.querySelector("#" + id);
            urlUI.innerHTML = "<a href='oauthentic://?token=" + this.token + "'>" + opt.mobile + "</a>";
        }


        // Init socket with callback functions
        this.socketStart(opt.scanned, function (tokenData) {

            // Stop progress timer if any
            if (ui.timer) {
                clearInterval(ui.timer);
            }
            that.log("➄ Token final data:", tokenData);

            opt.completed(tokenData);
        });


        // Show progress UI
        if (opt.progress) {

            // Missing expire time
            if (!this.expire) {
                this.log("Cannot show progress UI: expire time is not defined");
                return;
            }

            // Add progress UI
            if (!opt.mobile) {
                ui.table = ui.container.querySelector("table");
                ui.table.style.height = ui.container.clientHeight + "px";
            }
            ui.container.style.height = "auto";
            ui.container.insertAdjacentHTML("beforeend", "<div id='o9Progress' style='position: relative; margin-top: 10px; height:12px; border-radius: 6px; background: #0099DD;'><div style='position: absolute; top:0; left:0; height:12px; width:12px;border-radius: 6px; background: #FF5500;'></div><div style='position: absolute; top:0; left:0; height:100%; width:100%; line-height: 12px; color: white; font-size:10px; font-weight:bold; text-align: center'>00:00</div></div>");
            ui.progress = {
                back: ui.container.querySelector("#o9Progress"),
                fore: ui.container.querySelector("#o9Progress > div:first-child"),
                text: ui.container.querySelector("#o9Progress > div:last-child")
            };

            // Set progress UI colors
            ui.progress.back.style.background = opt.progressBack;
            ui.progress.fore.style.background = opt.progressFore;
            ui.progress.text.style.color = opt.progressText;

            // Set UI progress interval and init progress bar
            ui.len = ui.container.clientWidth - 12;
            ui.time = (that.expire - new Date()) / 1000;
            // Start progress UI
            (ui.countdown = function () {

                let ttl = Math.round((that.expire - new Date()) / 1000);

                if (ttl < 0) {
                    clearInterval(ui.timer);
                    that.log("Callback on authentication expire");
                    if (typeof opt.expired === "function") {
                        opt.expired();
                    }
                    return;
                }

                // Define visual progress
                ui.progress.fore.style.width = (ui.len * ((ui.time - ttl) / ui.time) + 12) + "px";

                // Define remaining time
                ttlMin = Math.floor(ttl / 60).toString();
                ttlSec = (ttl - ttlMin * 60).toString();
                ui.progress.text.innerHTML = (ttlMin.length < 2 ? "0" + ttlMin : ttlMin) + ":" + (ttlSec.length < 2 ? "0" + ttlSec : ttlSec);
            })();
            ui.timer = setInterval(ui.countdown, 1000);
        }
    }
}

// --------------------------------------------------------------------
// EoF
// --------------------------------------------------------------------