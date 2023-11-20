# Princess Connect Re:Dive Fan game

princess connect fan game


made by pure javascript and webgl





### Uglify
```shell
uglifyjs assets/js/render/font-webgl.js assets/js/render/shader.js assets/js/render/spine-webgl.min.js assets/js/render/spineLoad.js assets/js/render/sprite-webgl.js \
         -o assets/js/render.min.js -c -m \
         --source-map "root='http://lavumi.net/pcrun/assets/js',url='render.min.js.map'"
```

```shell
uglifyjs assets/js/main.js \
-o assets/js/main.min.js -c -m \
--source-map "root='http://lavumi.net/pcrun/assets/js',url='main.min.js.map'"
```