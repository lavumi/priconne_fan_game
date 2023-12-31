let FontSystem = (function () {

    let LabelData = {
        HP: {
            text: "This is SampleText",
            location :  [-440, -768/2],
            renderData: {
                buffer: {
                    position: null,
                    uv: null,
                    indices: null,
                },
                vertexCount: 0,
                dirty : true,
                visible : true
            }
        },

        Signature: {
            text: "Lavumi ZYANG ~@",
            location : [400, -470],
            renderData: {
                buffer: {
                    position: null,
                    uv: null,
                    indices: null,
                },
                vertexCount: 0,
                dirty : true,
                visible : true,
            }
        }
    }




    //#region  공통 데이터 세팅

    let shaderData = {
        program: null,//shaderProgram,
        attribLocations: {},
        uniformLocations: {},
    };

    let myFontData = {};
    let fontAtlas = null;
    function loadFont() {
        function loadDoc() {
            let req = new XMLHttpRequest();
            req.onreadystatechange = function () {
                if (this.readyState === 4 && this.status === 200) {
                    parse(this);
                }
            };
            req.open("GET", "assets/font/myFont.xml", true);
            req.send();
        }

        function parse(xml) {
            let xmlDoc = xml.responseXML;
            let chars = xmlDoc.getElementsByTagName("Char");
            for (let i = 0; i < chars.length; i++) {

                let char = chars[i].getAttribute('code');
                let width = chars[i].getAttribute('width');
                let offset = chars[i].getAttribute('offset').split(' ');
                let rect = chars[i].getAttribute('rect').split(' ');

                myFontData[char] = {
                    width: width,
                    offset: offset,
                    rect: rect
                }

            }

            _loadFontAtlas('myFont');
        }

        loadDoc();
    }

    let loadFinished = false;
    function _loadFontAtlas(atlas) {
        let texture = gl.createTexture();
        let image = new Image();

        image.onload = function () {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            fontAtlas = texture;
            _loadShader();
            loadFinished = true;
        };

        image.onerror = function (e) {
            console.error("image load fail :" + atlas + " error : " + e);
        }

        image.src = 'assets/font/' + atlas + ".png";
    }

    function _loadShader() {
        shaderData = ShaderUtil.initShaders('fontShader').fontShader;
    }

    function _setFont() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, fontAtlas);
        gl.uniform1i(shaderData.uniformLocations['texture'], 0);
    }

    //#endregion



    ////#region 개별 데이터 세팅
    function _makeBuffer( labelName ) {
        let dirty = LabelData[ labelName ].renderData.dirty;
        if ( dirty === false )
            return;

        let buffer = LabelData[ labelName].renderData.buffer;

        let positions = [];
        let uv = [];
        let indices = [];

        let string = LabelData[ labelName].text;

        //console.log( string + " make buffer!!");
        let fontStartPos = [0, 0];

        let vertexCount = LabelData[ labelName].renderData.vertexCount = 0;

        let expectedStringLength = 0;
        for( let i = 0; i < string.length; i++ ) {

            if (string[i] === " ") {
                expectedStringLength += 30 / 512;
                continue;
            }
            let fontData = myFontData[string[i]];
            expectedStringLength += parseInt(fontData.width) / 512;
        }
        for (let i = 0; i < string.length; i++) {

            if (string[i] === " ") {
                fontStartPos[0] += 30 / 512;
                continue;
            }
            let fontData = myFontData[string[i]];

            let X = fontData.rect[0] / 512;
            let Y = fontData.rect[1] / 512;
            let offsetX = fontData.offset[0] / 512;
            let offsetY = fontData.offset[1] / 512
            let width = fontData.rect[2] / 512;
            let height = fontData.rect[3] / 512;

            let minX = offsetX + fontStartPos[0] - expectedStringLength/ 2;
            let minY = offsetY + fontStartPos[1];
            let minZ = 0;
            let maxX = offsetX + fontStartPos[0] + width- expectedStringLength / 2;
            let maxY = offsetY + fontStartPos[1] + height;
            let maxZ = 0;


            fontStartPos[0] += fontData.width / 512;

            positions.push(minX);
            positions.push(minY);
            positions.push(minZ);

            positions.push(minX);
            positions.push(maxY);
            positions.push(minZ);

            positions.push(maxX);
            positions.push(maxY);
            positions.push(minZ);

            positions.push(maxX);
            positions.push(minY);
            positions.push(minZ);






            uv.push(X);
            uv.push(Y + height);

            uv.push(X);
            uv.push(Y);

            uv.push(X + width);
            uv.push(Y);

            uv.push(X + width);
            uv.push(Y + height);



            indices.push(0 + 4 * vertexCount / 6);
            indices.push(1 + 4 * vertexCount / 6);
            indices.push(2 + 4 * vertexCount / 6);

            indices.push(0 + 4 * vertexCount / 6);
            indices.push(2 + 4 * vertexCount / 6);
            indices.push(3 + 4 * vertexCount / 6);
            vertexCount += 6;

        }

        LabelData[ labelName].renderData.vertexCount = vertexCount;


        gl.deleteBuffer( buffer.position );
        gl.deleteBuffer( buffer.uv );
        gl.deleteBuffer( buffer.indices );

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices), gl.STATIC_DRAW);

        buffer.position = positionBuffer;
        buffer.uv = uvBuffer;
        buffer.indices = indexBuffer;

        LabelData[ labelName ].renderData.dirty = false;
    }

    function _bind( labelName ) {

        let buffer = LabelData[ labelName].renderData.buffer;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(
            shaderData.attribLocations['aVertexPosition'],
            3, // position x, y, z 3개
            gl.FLOAT,
            false,
            0,
            0);
        gl.enableVertexAttribArray(
            shaderData.attribLocations['aVertexPosition']);


        if (shaderData.attribLocations.hasOwnProperty('uv')) {

            gl.bindBuffer(gl.ARRAY_BUFFER, buffer.uv);
            gl.vertexAttribPointer(
                shaderData.attribLocations['uv'],
                2,
                gl.FLOAT,
                true,
                0,
                0);

            gl.enableVertexAttribArray(
                shaderData.attribLocations['uv']);
        }

        gl.uniformMatrix4fv(
            shaderData.uniformLocations['uVPMatrix'],
            false,
            [2, 0, 0, 0,
                0, 2, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1]);


        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer.indices);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    function _setLocation(labelName) {

        let x = LabelData[ labelName].location[0];
        let y = LabelData[ labelName].location[1];

        let width = 512 / ScreenSize[0];
        let height = 512 / ScreenSize[1];

        let position = {
            x: x / ScreenSize[0],
            y: y / ScreenSize[1],
        };

        gl.uniformMatrix4fv(
            shaderData.uniformLocations['uWorldMatrix'],
            false,
            [width, 0, 0, 0,
                0, height, 0, 0,
                0, 0, 1, 0,
                position.x, position.y, 0, 1]);
    }

    function _draw() {

        gl.useProgram(shaderData.program);
        _setFont();
        Object.keys(LabelData).map(function(key){
            if(LabelData[key].renderData.visible === true){
                _makeBuffer(key);
                _bind(key);
                _setLocation(key);
                gl.drawElements(gl.TRIANGLES, LabelData[ key].renderData.vertexCount, gl.UNSIGNED_SHORT, 0);
            }
        });
    }


    function _setString( labelName, string){
        if( !!LabelData[ labelName ] === true ){
            if( LabelData[ labelName ].text !== string){
                LabelData[ labelName ].text = string;
                LabelData[ labelName ].renderData.dirty = true;
            }
        }
        else{
            LabelData[ labelName ] = {
                text: string,
                location : [0, 0],
                renderData: {
                    buffer: {
                        position: null,
                        uv: null,
                        indices: null,
                    },
                    vertexCount: 0,
                    dirty : true,
                    visible : true
                }
            }
        }
    }

    function _setVisible( labelName, visible ){
        if( !!LabelData[ labelName ] === true ){
            LabelData[ labelName ].renderData.visible = visible;
        }
    }


    function _setPosition( labelName , position ){
        if( !!LabelData[ labelName ] === true )
            LabelData[ labelName ].location = position;
        else{
            console.log( 'No Label : ' + labelName);
        }
    }

    return {
        loadFont: loadFont,
        setVisible : _setVisible,
        setString: _setString,
        setPosition : _setPosition,
        draw: _draw,
    }
})();