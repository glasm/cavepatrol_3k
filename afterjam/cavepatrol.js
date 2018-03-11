(function(){
  
  // optimizations
  var WND = window, DOC = document;
  
  // params and states
  var t0=0, ct, dt=0;
  var wndActive=1, curFrame, curJump=-1, jdelay;
  var map,part;
  t0 = f_time();
  ct = 0;
  
  // player
  var plX, plY, plG, plS, plV, plW;
  
  // layers
  var C = f_createCanvas(0), cvs = C[0], C = C[1];
  var c1 = f_createCanvas(1), c2 = f_createCanvas(2), c3 = f_createCanvas(3);

  // geometry
  var pCar = f_Path( "67 33.5L-94.5 6 -95-21.5l11-12h66l12 12h61l40 22 -2 21 -12 12H-67zM4-17.5l14 12h59l-22-12H4", 0, "" );
  var pC = [ 0,
    f_Path( "4-25l-31 5c-6 26-3 20 16 19 20 0 22 7 15-24", 0, "" ),
    f_Path( "9-51l-19 3c", 1, " 0-1 0-2-1-3" ),
    f_Path( "13-70l-11 2c-1 6-2 12-4 20", 1, "-2-9-3-16-4-22" ),
    f_Path( "19-92c-2 0-4 15-10 44", 1, "-6-29-8-44-10-44" )
  ];
  
  // audio 
  var OS,GN,audioCtx = new(WND.AudioContext||WND.webkitAudioContext)();
  if(audioCtx) {
    OS = audioCtx.createOscillator();
    GN = audioCtx.createGain();
    OS.connect( GN );
    GN.connect( audioCtx.destination );
    OS.type = 'sine';
    OS.start();
    f_vol( 0 );
  }  

  // DOM
  DOC.body.append( cvs );
  DOC.onkeydown = cvs.onmousedown = cvs.ontouchstart = f_keydown;
  
  // background layers
  f_genCave( c1 );
  f_genCave( c2 );
  f_genCave( c3 );

  // new game
  f_newGame();

  // run game
  f_main();
  
  
  /////////////////////////////////////////////////////////////////////////////
  //
  // functions:
  //   f_main - main loop
  //   f_newGame - init new game
  //   f_physics - update player physics and check collisions
  //   f_drawCave - draw cave layer
  //   f_updateMap - update obstacles and bonuses
  //   f_drawObj - draw figure
  //   f_drawCar - draw player
  //   f_drawWheel - draw player wheel
  //   f_drawText - draw static text
  //   f_createCanvas - create canvas and context
  //   f_genCave - generate random cave
  //   f_keydown - handle input
  // 
  // regular:
  //   f_time - current game time
  //   f_rnd - integer random
  //   f_Path - canvas Path2D with some optimizations
  //   f_sc - canvas scale
  //   f_vol - audio volume
  //   f_beep - audio beep
  //
  // events:
  //   onblur/onfocus - window tab active
  //
  
  /////////////////////////////////////////////////////////
  //
  function f_main() {
  
    // animation
    setTimeout( f_main, 100/6 );
    
    // window active 
    if( wndActive ) {
    
      // update timers
      n = f_time();
      dt = n - ct;
      ct = n;
      if( dt>.1 )
        dt = .1;
      
      // approximation V to 2.5
      plV = dt/5 * 2.5 + ( 1 - dt/5 ) * plV;
      // scores (path)
      plS += plV * dt * 10;
      // wheel speed
      plW += Math.sqrt(plV) * dt * 8;

      // clear background
      C.fillStyle = '#48a';
      C.fillRect( 0,100, 800,200 );
      
      // back layers
      f_drawCave( c3[0], plX/8, 60 );
      f_drawCave( c2[0], plX/4, 30 );

      f_updateMap();
      
      f_drawCar();

      // front layer
      f_drawCave( c1[0], plX*1.5, 0 );
      // info
      f_drawText();
      
      // motor sfx
      ++curFrame % 2 == 1 ? f_beep( 0.05, 600 + plV * 50 ) : f_vol(0);
      
      f_physics();

    }
    
  }

  /////////////////////////////////////////////////////////
  //
  function f_newGame() {
    curFrame = jdelay = 0;
    plX = plG = plY = plS = plW = 0;
    plV = 1;
    map = [ [-1], [], [] ]; // obstasles, [bonuses], particles
  }
  
  /////////////////////////////////////////////////////////
  //
  function f_physics() {
    // motion
    plX += dt * plV * 200;
    // gravity
    plG -= 400 * dt;
    plY += plG * dt;
    // landing & bounce sfx
    if( plY<0 ) {
      if( curJump>=0 ) {
        plG = 80 * ( 1 + curJump--);
        f_beep( 0.5, 800);
        plV += 0.1;
      }
      plY = 0;
    }
    // collisions
    M = map[0];
    for( i=1; i<6; i++ ) {
      m0 = M[i];
      if( m0[0] && m0[1] ) {
        dx = Math.abs( plX - M[0] - m0[2] - 800 );
        y = 250 - plY;
        if( m0[1]>0 ) {
          if( plY < ( m0[1] + 1 ) * 25 && dx < 30 - plY / 5 ) {
            q = ~~( plY / 30 );
            if( m0[1] != q )
              _coll( m0[1] - q, 0.5, q ); 
          }
        } else
        if( y < ( 1 - m0[1] ) * 25 && dx < 30 - y / 5 ) {
          q = ~~( y / 30 );
          if( m0[1] != q )
            _coll( -(q + m0[1]), 0.4, -q ); 
        }
      }
    }
    
    function _coll(d,s,n) {
      plV -= d*s;
      m0[0] = 0;
      m0[1] = n;
      f_beep( 0.1, 1200 );
      // particles
      k = d * ( 10 + f_rnd( 10 ));
      while( 0 < k-- ) // posx, posy, velocity, gravity, size, color
        map[2].push([ plX + 200 + f_rnd(20), 300 - plY + f_rnd(50) - 25,
          0.5 + f_rnd(10)/10, f_rnd(300), 5 + f_rnd(10), 60+f_rnd(40) ]);
      // check status
      if( plV <= 0 )
        f_newGame();
    }
  }
    
  /////////////////////////////////////////////////////////
  //
  function f_drawCave( cc, x,y ) {
    // left half
    C.save()
    C.drawImage( cc, -( x + 800 ) % 3200 + 800, y );
    // right half
    C.scale( -1, 1 );
    C.drawImage( cc, x % 3200 - 3200, y, cc.width, cc.height );
    C.restore();
  }

  /////////////////////////////////////////////////////////
  //
  function f_updateMap() {
    m0 = map[0];
    m1 = map[1];
    m2 = map[2];
    
    x = ~~( plX / 2e3 ) * 2e3;
    // update obstacles
    if( m0[0] < x )
      for( m0[0] = x, j=1; j<6; j++ ) // noCollision, type up/none/down, deltaX
        m0[j] = [ 1, f_rnd(9)-4, f_rnd(800)-200 ];
    // draw obstacles
    for( j=1; j<6; j++ )
      _drawobst( j );
        
    // update and draw particles
    for( j=m2.length-1; j>=0; j-- )
      _drawpart( j );
    
    function _drawobst(id) {
      q = m0[id];
      q[1] && f_drawObj( x + 1e3 + q[2],
        Math.sign( q[1] ), pC[ Math.abs( q[1] )] );
    }
    function _drawpart(id) {
      q = m2[id];
      q[0] += q[2] * dt * 400;
      q[3] -= 400 * dt;
      z = q[1]-q[3] * dt;
      if( z > 350) {
        q[2]-=0.5;
        q[3]=-q[3]/2;
        if(q[2]<0.5) {
          m2.splice(id,1);
          return;
        }
      }
      q[1] = z;
      C.fillStyle = 'hsl(0,0%,' + q[5] + '%)';// +','+ q[5] +','+ q[5] +')';
      C.fillRect( q[0]-plX, q[1], q[4],q[4] );
    }
  }
  
  /////////////////////////////////////////////////////////
  //
  function f_drawObj(x,d,p) {
    x -= plX;
    C.save();
    C.beginPath();
    C.strokeStyle = '#fff';
    C.lineWidth = 2;
    C.fillStyle = '#38708c';
    C.translate( x, d<0 ? 50:350 );
    C.scale( -1.5, 1.5*d );
    C.fill( p );
    C.stroke( p );
    C.restore();
  }
  
  /////////////////////////////////////////////////////////
  //
  function f_drawCar() {
    C.fillStyle = '#fff';
    C.save();
    C.translate( 200, 320-plY );
    C.rotate( -plY / 500 );
    C.scale( 0.4, 0.4 );
    C.fill( pCar );
    C.restore();
    f_drawWheel( -1 );
    f_drawWheel( 0 );
    f_drawWheel( 1 );
  }

  /////////////////////////////////////////////////////////
  //
  function f_drawWheel(n){
    C.save();
    C.shadowColor = '#357';
    C.shadowBlur = 10;
    C.translate( 200 + n*30, 335 - plY*( 1 + n/20 ));
    C.rotate( plW );
    C.fillRect( -8,-8, 16,16 );
    C.restore();
  }

  /////////////////////////////////////////////////////////
  //
  function f_drawText() {
    C.save();
    C.font = 'bold 30px Courier New';
    p50 = plV*50;
    C.fillStyle = '#7bd';
    C.fillText( (''+plV*10).substr( 0,5 ), 20,380 );
    C.fillText(( '000000' + ~~plS ).substr( -6 ),680, 380 );
    C.restore();
  }
  
  /////////////////////////////////////////////////////////
  //
  function f_createCanvas(t) {
    
    Q = DOC.createElement('canvas');
    w = t ? 1600 : 800;
    h = t<2 ? 400 : t<3 ? 340:280;
    Q.width = w;
    Q.height = h;
    s = Q.style;
    s.width = w+'px';
    s.height = h+'px';
    return [ Q, Q.getContext('2d') ];
    
  }

  /////////////////////////////////////////////////////////
  //
  function f_genCave( cc ){
    
    h = cc[0].height;
    t = h>350 ? 0 : h>300 ? 1 : 2;
    s = 20 - t*6;
    // top layer
    _cave( cc, 0 );
    // bottom layer
    _cave( cc, 1 );
    
    function _cave( context, invert ) {
      // setup
      ctx = context[1];
      q = ctx.fillStyle = 'hsl(200,43%,3'+(2+3*t)+'%)';
      y = 70 + t*10;
      y = invert ? h-y : y;
      ctx.shadowColor = q;
      ctx.shadowBlur = 20;
      ctx.filter = 'blur(' + ( 1 + t*2 ) + 'px)';
      // draw
      ctx.beginPath();
      ctx.moveTo( -20, invert*h );
      ctx.lineTo( -20, y );
      for( i=0, j = 40 - 5*t, k = 1600/j, H = 40 + t*10; i<k; i++ )
        y1 = H*0.5 + f_rnd(H),
        y2 = H*1.2 + f_rnd(H),
        ctx.quadraticCurveTo( i*j, invert ? h-y1 : y1,
                        i*j + j/2, invert ? h-y2 : y2 );
      ctx.lineTo( 1620, y );
      ctx.lineTo( 1620, invert*h );
      ctx.fill();
    }
    
  }
  
  /////////////////////////////////////////////////////////
  //
  function f_keydown(){
    // wait 0.4 sec before second jump
    if( jdelay < ct ) {
      jdelay = ct + 0.4;
      // second jump
      n = plY>20 && curJump==0 ? 1 : plY < 5 ? 0 : -1;
      if(n>=0) {
        // negate gravity > jump 
        plG = 300;
        // first/second jump
        curJump = n;
        // deceleration
        plV -= 0.1 * ( 1+n );
        f_beep( 0.5, 500 );
      }
    }
  }

  /////////////////////////////////////////////////////////  
  //
  function f_time(){
    return +new Date() * 0.001 - t0
  }
  function f_rnd( r ){
    return ~~( Math.random() * r )
  }
  function f_Path( p,q,P ) {
    return new Path2D( 'M-' + p + ( q ? '-12 59-14 47 10 47 25 0 22 11 10-47' : '' ) + P + 'z' );
  }
  function f_vol( v ) {
    GN&&( GN.gain.value = v );
  }
  function f_beep( v,f ) {
    f_vol( v );
    OS&&( OS.frequency.value = f );
  }

  /////////////////////////////////////////////////////////
  //
  WND.onblur = function(){
    wndActive = 0;
    f_vol(0);
  };
  WND.onfocus = function(){
    wndActive = 1;
  };
  
})();

