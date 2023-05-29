'use strict';

let gl;                         // The webgl context.
let surface;                   // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let sphere;
let userPoint;
let magnit;

function deg2rad(angle) {
  return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
  this.name = name;
  this.iVertexBuffer = gl.createBuffer();
  this.iVertexTextureBuffer = gl.createBuffer();
  this.count = 0;
  this.textureCount = 0;

  this.BufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.count = vertices.length / 3;
  }

  this.TextureBufferData = function(vertices) {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

    this.textureCount = vertices.length / 2;
  }

  this.Draw = function() {

    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexTextureBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertexTexture, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertexTexture);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }

  this.DrawSphere = function() {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
    gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(shProgram.iAttribVertex);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
  }
}


// Constructor
function ShaderProgram(name, program) {

  this.name = name;
  this.prog = program;

  // Location of the attribute variable in the shader program.
  this.iAttribVertex = -1;
  this.iAttribVertexTexture = -1;
  // Location of the uniform matrix representing the combined transformation.
  this.iModelViewProjectionMatrix = -1;
  this.iTMU = -1;
  this.iUserPoint = -1;
  this.iMagnit = 1;
  this.iTranslateSphere = -1;

  this.Use = function() {
    gl.useProgram(this.prog);
  }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
  refreshParams()
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  /* Set the values of the projection transformation */
  let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

  /* Get the view matrix from the SimpleRotator object.*/
  let modelView = spaceball.getViewMatrix();
  let webCamView = m4.identity();

  let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.0);
  let translateToPointZero = m4.translation(0, 0, -10);
  let translateToCenter = m4.multiply(m4.scaling(3, 3, 1), m4.translation(-0.5, -0.5, -10));

  let matAccum0 = m4.multiply(rotateToPointZero, m4.multiply(modelView, getRotationMatrix(fusionSensor.alpha, fusionSensor.beta, fusionSensor.gamma)));
  let webCamAccum0 = m4.multiply(rotateToPointZero, webCamView);
  let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
  let webCamAccum1 = m4.multiply(translateToCenter, webCamAccum0);

  /* Multiply the projection matrix times the modelview matrix to give the
     combined transformation matrix, and send that to the shader program. */
  let modelViewProjection = m4.multiply(projection, matAccum1);

  gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);

  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projection);

  gl.uniform1i(shProgram.iTMU, 0);
  gl.enable(gl.TEXTURE_2D);
  gl.uniform1f(shProgram.iB, -1);
  gl.bindTexture(gl.TEXTURE_2D, webCamTexture);
  // gl.texImage2D(
  //   gl.TEXTURE_2D,
  //   0,
  //   gl.RGBA,
  //   gl.RGBA,
  //   gl.UNSIGNED_BYTE,
  //   video
  // );
  // gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, webCamAccum1);
  // webCamPlane.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.uniform2fv(shProgram.iUserPoint, [userPoint.x, userPoint.y]);
  gl.uniform1f(shProgram.iMagnit, magnit);


  gl.uniform3fv(shProgram.iTranslateSphere, [-0., -0., -0.])
  gl.bindTexture(gl.TEXTURE_2D, texture);
  virtCam.ApplyLeftFrustum();
  gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, virtCam.mProjectionMatrix);
  gl.colorMask(false, true, true, false);
  surface.Draw();
  gl.clear(gl.DEPTH_BUFFER_BIT);
  virtCam.ApplyRightFrustum();
  gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, virtCam.mProjectionMatrix);
  gl.colorMask(true, false, false, false);
  surface.Draw();
  gl.colorMask(true, true, true, true);
  // let translate = shoe(map(userPoint.x, 0, 1, -1, 1), map(userPoint.y, 0, 1, -1, 1))
  // gl.uniform3fv(shProgram.iTranslateSphere, [translate.x, translate.y, translate.z])
  // gl.uniform1f(shProgram.iB, 1);
  // gl.clear(gl.DEPTH_BUFFER_BIT);
  // sphere.DrawSphere();
}

function CreateSurfaceData() {
  let vertexList = [];
  let i = -1;
  let j = -1;
  let inc = 0.1;
  while (i < 1) {
    while (j < 1) {
      let v1 = shoe(i, j)
      let v2 = shoe(i + 0.1, j)
      let v3 = shoe(i, j + 0.1)
      let v4 = shoe(i + 0.1, j + 0.1);
      // one triangle
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      // another triangle
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      j += inc
    }
    j = -1;
    i += inc;
  }
  return vertexList;
}
function CreateSurfaceTextureData() {
  let vertexList = [];
  let i = -1;
  let j = -1;
  let inc = 0.1;
  while (i < 1) {
    while (j < 1) {
      let u = map(i, -1, 1, 0, 1)
      let v = map(j, -1, 1, 0, 1)
      vertexList.push(u, v)
      u = map(i + inc, -1, 1, 0, 1)
      vertexList.push(u, v)
      u = map(i, -1, 1, 0, 1)
      v = map(j + inc, -1, 1, 0, 1)
      vertexList.push(u, v)
      u = map(i + inc, -1, 1, 0, 1)
      v = map(j, -1, 1, 0, 1)
      vertexList.push(u, v)
      v = map(j + inc, -1, 1, 0, 1)
      vertexList.push(u, v)
      u = map(i, -1, 1, 0, 1)
      v = map(j + inc, -1, 1, 0, 1)
      vertexList.push(u, v)
      j += inc
    }
    j = -1;
    i += inc;
  }
  return vertexList
}

function shoe(x, y) {
  let x1 = x
  let y1 = y
  let z = (x ** 3) / 3 + (y ** 2) / 2
  return { x: x1, y: y1, z: z }
}
function map(val, f1, t1, f2, t2) {
  let m;
  m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
  return Math.min(Math.max(m, f2), t2);
}

function CreateSphereSurface(r = 0.05) {
  let vertexList = [];
  let lon = -Math.PI;
  let lat = -Math.PI * 0.5;
  while (lon < Math.PI) {
    while (lat < Math.PI * 0.5) {
      let v1 = sphereSurfaceDate(r, lon, lat);
      let v2 = sphereSurfaceDate(r, lon + 0.5, lat);
      let v3 = sphereSurfaceDate(r, lon, lat + 0.5);
      let v4 = sphereSurfaceDate(r, lon + 0.5, lat + 0.5);
      vertexList.push(v1.x, v1.y, v1.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v3.x, v3.y, v3.z);
      vertexList.push(v2.x, v2.y, v2.z);
      vertexList.push(v4.x, v4.y, v4.z);
      vertexList.push(v3.x, v3.y, v3.z);
      lat += 0.5;
    }
    lat = -Math.PI * 0.5
    lon += 0.5;
  }
  return vertexList;
}

function sphereSurfaceDate(r, u, v) {
  let x = r * Math.sin(u) * Math.cos(v);
  let y = r * Math.sin(u) * Math.sin(v);
  let z = r * Math.cos(u);
  return { x: x, y: y, z: z };
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
  let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  shProgram = new ShaderProgram('Basic', prog);
  shProgram.Use();

  shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
  shProgram.iAttribVertexTexture = gl.getAttribLocation(prog, "vertexTexture");
  shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
  shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
  shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
  shProgram.iTMU = gl.getUniformLocation(prog, 'TMU');
  shProgram.iUserPoint = gl.getUniformLocation(prog, 'userPoint');;
  shProgram.iMagnit = gl.getUniformLocation(prog, 'magnit');
  shProgram.iTranslateSphere = gl.getUniformLocation(prog, 'translateSphere');
  shProgram.iB = gl.getUniformLocation(prog, 'b');

  LoadTexture()
  surface = new Model('Surface');
  surface.BufferData(CreateSurfaceData());
  surface.TextureBufferData(CreateSurfaceTextureData());
  sphere = new Model('Sphere');
  sphere.BufferData(CreateSphereSurface())
  webCamPlane = new Model('Plane')
  webCamPlane.BufferData([0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0])
  webCamPlane.TextureBufferData([1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1])
  gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
  let vsh = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsh, vShader);
  gl.compileShader(vsh);
  if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
  }
  let fsh = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsh, fShader);
  gl.compileShader(fsh);
  if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
    throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
  }
  let prog = gl.createProgram();
  gl.attachShader(prog, vsh);
  gl.attachShader(prog, fsh);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
  }
  return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
  userPoint = { x: 0.7, y: 0.6 }
  magnit = 1.0;
  let canvas;
  try {
    // let resolution = Math.min(window.innerHeight, window.innerWidth);
    canvas = document.getElementById("webglcanvas");
    gl = canvas.getContext("webgl");
    // canvas.width = resolution;
    // canvas.height = resolution;
    // video = document.createElement('video');
    // video.setAttribute('autoplay', true);
    // window.vid = video;
    // getWebcam();
    // webCamTexture = CreateWebCamTexture();
    virtCam = new StereoCamera(2000, 70.0, 1, 0.4, 5, 100);
    // gl.viewport(0, 0, resolution, resolution);
    if (!gl) {
      throw "Browser does not support WebGL";
    }
  }
  catch (e) {
    console.log(e)
    return;
  }
  try {
    initGL();  // initialize the WebGL graphics context
  }
  catch (e) {
    document.getElementById("canvas-holder").innerHTML =
      "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
    return;
  }

  spaceball = new TrackballRotator(canvas, draw, 0);

  // draw()
  webCamPlay()
}
function webCamPlay() {
  draw()
  window.requestAnimationFrame(webCamPlay);
}
function LoadTexture() {
  texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const image = new Image();
  image.crossOrigin = 'anonymus';

  image.src = "https://raw.githubusercontent.com/Krasin0880/WebGL/CGW/out-0.png";
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      image
    );
    // draw()
  }
}

// onmousemove = (e) => {
//     magnit = map(e.clientX, 0, window.outerWidth, 0, Math.PI)
//     draw()
// };
// window.onkeydown = (e) => {
//     switch (e.keyCode) {
//         case 87:
//             userPoint.y -= 0.01;
//             break;
//         case 83:
//             userPoint.y += 0.01;
//             break;
//         case 65:
//             userPoint.x += 0.01;
//             break;
//         case 68:
//             userPoint.x -= 0.01;
//             break;
//     }
//     console.log(userPoint)
//     userPoint.x = Math.max(0.01, Math.min(userPoint.x, 0.999))
//     userPoint.y = Math.max(0.01, Math.min(userPoint.y, 0.999))
//     draw();
// }

let webCamTexture, virtCam, texture, video, track, webCamPlane;

function StereoCamera(
  Convergence,
  EyeSeparation,
  AspectRatio,
  FOV,
  NearClippingDistance,
  FarClippingDistance
) {
  this.mConvergence = Convergence;
  this.mEyeSeparation = EyeSeparation;
  this.mAspectRatio = AspectRatio;
  this.mFOV = FOV;
  this.mNearClippingDistance = NearClippingDistance;
  this.mFarClippingDistance = FarClippingDistance;

  this.mProjectionMatrix = null;
  this.mModelViewMatrix = null;

  this.ApplyLeftFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-b * this.mNearClippingDistance) / this.mConvergence;
    right = (c * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to right
    this.mModelViewMatrix = m4.translation(
      this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };

  this.ApplyRightFrustum = function() {
    let top, bottom, left, right;
    top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
    bottom = -top;

    let a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
    let b = a - this.mEyeSeparation / 2;
    let c = a + this.mEyeSeparation / 2;

    left = (-c * this.mNearClippingDistance) / this.mConvergence;
    right = (b * this.mNearClippingDistance) / this.mConvergence;

    // Set the Projection Matrix
    this.mProjectionMatrix = m4.frustum(
      left,
      right,
      bottom,
      top,
      this.mNearClippingDistance,
      this.mFarClippingDistance
    );

    // Displace the world to left
    this.mModelViewMatrix = m4.translation(
      -this.mEyeSeparation / 2,
      0.0,
      0.0
    );
  };
}

function refreshParams() {
  let ins = document.getElementsByClassName("ins");
  let eyeS = 70.0;
  eyeS = document.getElementById("inA").value - 0.0;
  ins[0].innerHTML = eyeS;
  virtCam.mEyeSeparation = eyeS;
  let fov = 0.4;
  fov = document.getElementById("inB").value - 0.0;
  ins[1].innerHTML = fov;
  virtCam.mFOV = fov;
  let nearClippingDist = 5.0;
  nearClippingDist = document.getElementById("inC").value - 0.0;
  ins[2].innerHTML = nearClippingDist;
  virtCam.mNearClippingDistance = nearClippingDist
  let convergence = 2000.0;
  convergence = document.getElementById("inD").value - 0.0;
  ins[3].innerHTML = convergence;
  virtCam.mConvergence = convergence
}

function getWebcam() {
  navigator.getUserMedia({ video: true, audio: false }, function(stream) {
    video.srcObject = stream;
    track = stream.getTracks()[0];
  }, function(e) {
    console.error('Rejected!', e);
  });
}

function CreateWebCamTexture() {
  let textureID = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureID);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return textureID;
}

let fusionSensor = {
  alpha: 0, beta: 0, gamma: 0
}

function requestDeviceOrientation() {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        console.log(response);
        if (response === 'granted') {
          console.log('Permission granted');
          window.addEventListener('deviceorientation', e => {
            fusionSensor.alpha = e.alpha
            fusionSensor.beta = e.beta
            fusionSensor.gamma = e.gamma
          }, true);
        }
        webCamPlay()
      }).catch((err => {
        console.log('Err', err);
      }));
  } else
    console.log('not iOS');
}

var degtorad = Math.PI / 180; // Degree-to-Radian conversion

function getRotationMatrix(alpha, beta, gamma) {

  var _x = beta ? beta * degtorad : 0; // beta value
  var _y = gamma ? gamma * degtorad : 0; // gamma value
  var _z = alpha ? alpha * degtorad : 0; // alpha value

  var cX = Math.cos(_x);
  var cY = Math.cos(_y);
  var cZ = Math.cos(_z);
  var sX = Math.sin(_x);
  var sY = Math.sin(_y);
  var sZ = Math.sin(_z);

  //
  // ZXY rotation matrix construction.
  //

  var m11 = cZ * cY - sZ * sX * sY;
  var m12 = - cX * sZ;
  var m13 = cY * sZ * sX + cZ * sY;

  var m21 = cY * sZ + cZ * sX * sY;
  var m22 = cZ * cX;
  var m23 = sZ * sY - cZ * cY * sX;

  var m31 = - cX * sY;
  var m32 = sX;
  var m33 = cX * cY;

  return [
    m11, m12, m13, 0,
    m21, m22, m23, 0,
    m31, m32, m33, 0, 0, 0, 0, 1
  ];

};