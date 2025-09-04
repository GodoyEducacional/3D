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

const MODEL_SCALE = 0.02;
const MODEL_DISTANCE = 1.5;

// Variáveis para gestos de dois dedos
let lastRotation = 0;
let rotating = false;

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
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(
    ARButton.createButton(renderer, { requiredFeatures: ["hit-test"] })
  );

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // Controller para colocar modelo
  controller = renderer.xr.getController(0);
  controller.addEventListener("select", placeModel);
  scene.add(controller);

  // Eventos de toque para rotacionar
  renderer.domElement.addEventListener("touchstart", onTouchStart);
  renderer.domElement.addEventListener("touchmove", onTouchMove);
  renderer.domElement.addEventListener("touchend", onTouchEnd);

  window.addEventListener("resize", onWindowResize);
}

// ----- Coloca ou atualiza modelo -----
function placeModel() {
  if (!model && !modelLoading) {
    modelLoading = true;
    const loader = new GLTFLoader();
    loader.load(
      "/elefante.glb",
      (gltf) => {
        model = gltf.scene;
        model.scale.set(MODEL_SCALE, MODEL_SCALE, MODEL_SCALE);
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

// ----- Mantém modelo à frente da câmera -----
function updateModelPosition() {
  if (!model) return;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const position = new THREE.Vector3();
  position.copy(camera.position).add(direction.multiplyScalar(MODEL_DISTANCE));
  model.position.copy(position);
}

// ----- Gestos de dois dedos -----
function onTouchStart(event) {
  if (event.touches.length === 2 && model) {
    lastRotation = getAngle(event.touches[0], event.touches[1]);
    rotating = true;
  }
}

function onTouchMove(event) {
  if (rotating && event.touches.length === 2 && model) {
    const newRotation = getAngle(event.touches[0], event.touches[1]);
    const delta = newRotation - lastRotation;
    model.rotation.y += (delta * Math.PI) / 180;
    lastRotation = newRotation;
  }
}

function onTouchEnd(event) {
  if (event.touches.length < 2) {
    rotating = false;
  }
}

// ----- Helpers -----
function getAngle(t1, t2) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

// ----- Redimensionamento -----
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// ----- Loop de render -----
function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  if (model) updateModelPosition();
  renderer.render(scene, camera);
}
