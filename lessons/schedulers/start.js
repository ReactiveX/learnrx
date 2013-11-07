(function (window, undefined) {

    var freeExports = typeof exports == 'object' && exports,
        freeModule = typeof module == 'object' && module && module.exports == freeExports && module,
        freeGlobal = typeof global == 'object' && global;
    if (freeGlobal.global === freeGlobal) {
        window = freeGlobal;
    }

    var canvas, context, subscription;
    
    function init() {

        var host = document.body;

        canvas = document.createElement( 'canvas' );

        // ie IE < 9
        if (typeof G_vmlCanvasManager !== 'undefined') { 
            G_vmlCanvasManager.initElement(canvas);
        }

        canvas.width = 512;
        canvas.height = 512;

        context = canvas.getContext( '2d' );

        host.appendChild( canvas );
    }

    function createAnimation(scheduler) {
        scheduler || (scheduler = Rx.Scheduler.timeout);

        return Rx.Observable.generate(
                0,
                function (x) { return true; },
                function (x) { return x + 1; },
                function (x) { return x; },
                scheduler
            )
            .timestamp();
    }

    function draw(ts) {

        var time = ts.timestamp * 0.002;
        var x = Math.sin( time ) * 192 + 256;
        var y = Math.cos( time * 0.9 ) * 192 + 256;

        context.fillStyle = ts.value % 2 === 0 ? 'rgb(200,200,20)' :  'rgb(20,20,200)';
        context.beginPath();
        context.arc( x, y, 10, 0, Math.PI * 2, true );
        context.closePath();
        context.fill();
    }

    function main () {
        init();
        
        subscription = createAnimation().subscribe(draw);
    }

    // Exports
    window.main = main;
    window.createAnimation = createAnimation;

}(this));
 