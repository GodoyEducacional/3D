import * as THREE from "three";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ----- Botão Start AR -----
const startBtn = document.createElement("button");
startBtn.textContent = "Start AR";
startBtn.style.position = "fixed";
startBtn.style.top = "50%";
startBtn.style.left = "50%";
startBtn.style.transform = "translate(-50%, -50%)";
startBtn.style.padding = "20px 40px";
startBtn.style.fontSize = "24px";
startBtn.style.background = "#007bff";
startBtn.style.color = "white";
startBtn.style.border = "none";
startBtn.style.borderRadius = "8px";
startBtn.style.cursor = "pointer";
startBtn.style.zIndex = "1000";
document.body.appendChild(startBtn);

// ----- Variáveis -----
let camera, scene, renderer;
let controller;
let model = null;
let modelLoading = false;

const MODEL_DISTANCE = 1.5;
const MODEL_SCALE = 0.02;

// Gestos
let ongoingTouches = [];
let lastRotation = 0;
let lastDistance = 0;
let baseY = 0; // mantém altura fixa do modelo

// ----- Inicialização -----
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  init();
  animate();
});

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    20
  );

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  controller = renderer.xr.getController(0);
  controller.addEventListener("select", placeModel);
  scene.add(controller);

  window.addEventListener("resize", onWindowResize);

  renderer.domElement.addEventListener("touchstart", onTouchStart, false);
  renderer.domElement.addEventListener("touchmove", onTouchMove, false);
  renderer.domElement.addEventListener("touchend", onTouchEnd, false);
}

// ----- Coloca modelo -----
function placeModel() {
  if (!model && !modelLoading) {
    modelLoading = true;
    const loader = new GLTFLoader();
    loader.load(
      "/elefante.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
        baseY = camera.position.y - 0.2; // altura fixa do modelo
        scene.add(model);
        modelLoading = false;
        updateModelPosition();
      },
      undefined,
      (err) => {
        console.error("Erro ao carregar modelo:", err);
        modelLoading = false;
      }
    );
  } else if (model) {
    updateModelPosition();
  }
}

// ----- Atualiza posição fixa à frente da câmera -----
function updateModelPosition() {
  if (!model) return;
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const pos = new THREE.Vector3();
  pos.copy(camera.position).add(dir.multiplyScalar(MODEL_DISTANCE));
  pos.y = baseY; // mantém altura fixa
  model.position.copy(pos);
}

// ----- Gestos -----
function onTouchStart(e) {
  ongoingTouches = [...e.touches];
  if (ongoingTouches.length === 2) {
    lastRotation = getAngle(ongoingTouches[0], ongoingTouches[1]);
    lastDistance = getDistance(ongoingTouches[0], ongoingTouches[1]);
  }
}

function onTouchMove(e) {
  e.preventDefault();
  if (!model) return;
  const touches = [...e.touches];

  // Rotação e escala com dois dedos
  if (touches.length === 2 && ongoingTouches.length === 2) {
    const newAngle = getAngle(touches[0], touches[1]);
    const deltaRot = newAngle - lastRotation;
    model.rotation.y += (deltaRot * Math.PI) / 180;
    lastRotation = newAngle;

    const newDist = getDistance(touches[0], touches[1]);
    const scaleChange = newDist / lastDistance;
    model.scale.multiplyScalar(scaleChange);
    lastDistance = newDist;
  }

  // Mover com um dedo
  if (touches.length === 1 && ongoingTouches.length === 1) {
    const dx =
      (touches[0].clientX - ongoingTouches[0].clientX) / window.innerWidth;
    const dz =
      (touches[0].clientY - ongoingTouches[0].clientY) / window.innerHeight;
    model.position.x += dx * 2;
    model.position.z += dz * 2;
    ongoingTouches = touches;
  }
}

function onTouchEnd(e) {
  ongoingTouches = [...e.touches];
}

// ----- Helpers -----
function getAngle(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function getDistance(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ----- Resize -----
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- Loop -----
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  renderer.render(scene, camera);
}
