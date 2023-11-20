let TextureUtil = {
    textureList: [
        '0.png',
        '1.png',
        '2.png',
        '3.png',
        '4.png',
        '5.png',
        '6.png',
        '7.png',
        '8.png',
        'obstacle.png',
        'optionUI.png'
    ],

    _glTexture: {},

    loadTexture: function ( cb ){
        let initCount = 0;
        let self = this;
        let initTextures = function (){
            let texture = gl.createTexture();
            let image = new Image();
            image.onload = function (){
                gl.bindTexture( gl.TEXTURE_2D, texture );
                gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image );
                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
                gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST );
                gl.generateMipmap( gl.TEXTURE_2D );
                gl.bindTexture( gl.TEXTURE_2D, null );
                self._glTexture[self.textureList[initCount]] = {
                    texture: texture,
                    width  : this.width,
                    height : this.height,
                };
                initCount++;
                if( initCount < self.textureList.length ){
                    initTextures( initCount );
                }
                else {
                    cb();
                }
            };
            image.onerror = function ( e ){
                console.log( e );
            }
            image.src ="assets/img/" + self.textureList[initCount];
        };
        initTextures( initCount );
    },

    getTexture: function ( textureName ){
        return this._glTexture[textureName];
    }
};
let SpriteShader = (function (){
    let shaderData = {
        program         : null,//shaderProgram,
        attribLocations : {},
        uniformLocations: {},
    };
    let buffer = {
        position: null,
        uv      : null,
        indices : null,
    };


    let textureSize = {
        width : 0,
        height: 0
    };

    let makeBuffer = function (){

        let minX = 0;//this._aabbData[0];
        let minY = 0;//this._aabbData[2];
        let minZ = 0;//this._aabbData[4];
        let maxX = 1;//this._aabbData[1];
        let maxY = 1;//this._aabbData[3];
        let maxZ = 0;//this._aabbData[5];

        const positions = [

            // // Back face
            minX, minY, minZ,
            minX, maxY, minZ,
            maxX, maxY, minZ,
            maxX, minY, minZ,

        ];

        const uv = [
            1, 1,
            1, 0,
            0, 0,
            0, 1
        ];

        const indices = [
            0, 1, 2, 0, 2, 3,    // front
        ];


        const positionBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( positions ), gl.STATIC_DRAW );

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ARRAY_BUFFER, uvBuffer );
        gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( uv ), gl.STATIC_DRAW );

        const indexBuffer = gl.createBuffer();
        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
        gl.bufferData( gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array( indices ), gl.STATIC_DRAW
        );

        buffer.position = positionBuffer;
        buffer.uv = uvBuffer;
        buffer.indices = indexBuffer;
    };

    //쉐이더 생성
    shaderData = ShaderUtil.initShaders( 'textureShader' ).textureShader;
    makeBuffer();

    //버퍼 생성

    function _bind(){
        gl.useProgram( shaderData.program );
        gl.bindBuffer( gl.ARRAY_BUFFER, buffer.position );
        gl.vertexAttribPointer(
            shaderData.attribLocations['aVertexPosition'],
            3, // position x, y, z 3개
            gl.FLOAT,
            false,
            0,
            0
        );
        gl.enableVertexAttribArray(
            shaderData.attribLocations['aVertexPosition'] );


        if( shaderData.attribLocations.hasOwnProperty( 'uv' ) ){

            gl.bindBuffer( gl.ARRAY_BUFFER, buffer.uv );
            gl.vertexAttribPointer(
                shaderData.attribLocations['uv'],
                2,
                gl.FLOAT,
                true,
                0,
                0
            );


            gl.enableVertexAttribArray(
                shaderData.attribLocations['uv'] );
        }

        gl.uniformMatrix4fv(
            shaderData.uniformLocations['uVPMatrix'],
            false,
            [2, 0, 0, 0,
                0, 2, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1]
        );


        gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, buffer.indices );
        gl.enable( gl.BLEND );
        gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
    }

    function _setTexture( textureName ){
        let texture = TextureUtil.getTexture( textureName );
        textureSize.width = texture.width;
        textureSize.height = texture.height;
        gl.activeTexture( gl.TEXTURE0 );
        gl.bindTexture( gl.TEXTURE_2D, texture.texture );
        gl.uniform1i( shaderData.uniformLocations['texture'], 0 );
    }

    function _setAttr( position, scale ){

        if( scale === undefined ){
            scale = [1,1];
        }



        let width = textureSize.width / ScreenSize[0] * scale[0];
        let height = textureSize.height / ScreenSize[1] * scale[1];

        //   console.log( width, height);

        //console.log( position[0]);
        gl.uniformMatrix4fv(
            shaderData.uniformLocations['uWorldMatrix'],
            false,
            [width, 0, 0, 0,
                0, height, 0, 0,
                0, 0, 1, 0,
                position[0] / ScreenSize[0], position[1] / ScreenSize[1], 0, 1]
        );
    }

    function _unbind(){

    }

    function _draw(){

        gl.drawElements( gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0 );
    }

    function _getTextureSize(){
        return textureSize;
    }

    return {
        bind      : _bind,
        setAttr   : _setAttr,
        unbind    : _unbind,
        setTexture: _setTexture,
        draw      : _draw,

        getTextureSize: _getTextureSize
    }
})();



