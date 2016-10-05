import L from 'leaflet';
import Draw from 'leaflet-draw';

import { MapLayer } from 'react-leaflet';

L.CanvasOverlay = L.Class.extend({

    initialize: function (userDrawFunc, options) {
        this._opts = options;
        this._userDrawFunc = userDrawFunc;
        L.setOptions(this, options);
    },

    drawing: function (userDrawFunc) {
        this._userDrawFunc = userDrawFunc;
        return this;
    },

    params:function(options){
        L.setOptions(this, options);
        return this;
    },
    
    canvas: function () {
        return this._canvas;
    },

    redraw: function () {
        if (!this._frame) {
            this._frame = L.Util.requestAnimFrame(this._redraw, this);
        }
        return this;
    },

    onAdd: function (map) {
        this._map = map;
        if ( this._opts.type && this._opts.type === 'tiles' ) {
          var drawControl = new L.Control.Draw({
            draw: {
              polyline: false,
              polygon: false,
              circle: false,
              marker: false,
              rect: {
                shapeOptions: {
                  color: 'green'
                }
              }
            }
          });
          map.addControl(drawControl);
          var self = this;
          map.on('draw:created', function (e) {
            self._opts.onDrawBox( e );
          });
        }

        this._canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer');

        var size = this._map.getSize();
        this._canvas.width = size.x;
        this._canvas.height = size.y;

        var animated = this._map.options.zoomAnimation && L.Browser.any3d;
        L.DomUtil.addClass(this._canvas, 'leaflet-zoom-' + (animated ? 'animated' : 'hide'));


        map._panes.overlayPane.appendChild(this._canvas);

        map.on('moveend', this._reset, this);
        map.on('resize',  this._resize, this);

        if (map.options.zoomAnimation && L.Browser.any3d) {
            //map.on('zoomanim', this._animateZoom, this);
        }

        this._reset();
    },

    onRemove: function (map) {
        map.getPanes().overlayPane.removeChild(this._canvas);
 
        map.off('moveend', this._reset, this);
        map.off('resize', this._resize, this);

        if (map.options.zoomAnimation) {
            //map.off('zoomanim', this._animateZoom, this);
        }
        this._canvas = null;

    },

    addTo: function (map) {
        map.addLayer(this);
        return this;
    },

    _resize: function (resizeEvent) {
        this._canvas.width  = resizeEvent.newSize.x;
        this._canvas.height = resizeEvent.newSize.y;
    },
    _reset: function () {
        var topLeft = this._map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._redraw();
    },

    _redraw: function () {
        var size     = this._map.getSize();
        var bounds   = this._map.getBounds();
        var zoomScale = (size.x * 180) / (20037508.34  * (bounds.getEast() - bounds.getWest())); // resolution = 1/zoomScale
        var zoom = this._map.getZoom();
     
        // console.time('process');

        if (this._userDrawFunc) {
            this._userDrawFunc(this,
                                {
                                    canvas   :this._canvas,
                                    bounds   : bounds,
                                    size     : size,
                                    zoomScale: zoomScale,
                                    zoom : zoom,
                                    options: this.options
                               });
        }
       
        this._frame = null;
    },

    _animateZoom: function (e) {
        var scale = this._map.getZoomScale(e.zoom),
            offset = this._map._getCenterOffset(e.center)._multiplyBy(-scale).subtract(this._map._getMapPanePos());

        this._canvas.style[L.DomUtil.TRANSFORM] = L.DomUtil.getTranslateString(offset) + ' scale(' + scale + ')';
    }
});

L.canvasOverlay = function ( drawFunc, options ) {
    return new L.CanvasOverlay( drawFunc, options );
};

export default class CanvasLayer extends MapLayer {
  componentWillMount () {
    super.componentWillMount();
    const { draw, ...props } = this.props
    this.leafletElement = L.canvasOverlay( draw, props );
  }

  componentWillReceiveProps() {
    this.leafletElement.redraw();
  }
}

